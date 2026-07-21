# kanban_app/api/views.py

from __future__ import annotations

import logging
from pathlib import Path

from django.conf import settings
from django.db import models, transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
from django.http import FileResponse, HttpResponse

from rest_framework import generics, status, serializers, viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import (
    api_view,
    action,
    permission_classes,
    authentication_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication, TokenAuthentication
from rest_framework.exceptions import NotFound, PermissionDenied

# Modelle
from kanban_app.models import (
    Board,
    BoardDocument,
    BoardToolStatus,
    Task,
    Comment,
    Debriefing,
    GraphicsRapport,
    KVStore,
)

# Serializer
from .serializers import (
    BoardSerializer,
    BoardDocumentMetadataSerializer,
    BoardDocumentUploadSerializer,
    BoardToolStatusInitializeItemSerializer,
    BoardToolStatusSerializer,
    TaskSerializer,
    CommentSerializer,
    TaskListSerializer,
    DebriefingSerializer,
    GraphicsRapportSerializer,
)

# PDF‑Utility (Stub möglich, falls WeasyPrint fehlt)
from .debriefing_pdf import generate_pdf

logger = logging.getLogger(__name__)
User = get_user_model()


def user_can_access_board(user, board: Board) -> bool:
    """Return whether a user may read and collaborate on a board."""
    return bool(
        user
        and user.is_authenticated
        and (
            user.is_superuser
            or board.owner_id == user.id
            or board.members.filter(pk=user.pk).exists()
        )
    )


def user_can_manage_board(user, board: Board) -> bool:
    """Return whether a user may delete or administratively manage a board."""
    return bool(
        user
        and user.is_authenticated
        and (user.is_superuser or board.owner_id == user.id)
    )


def boards_for_user(user):
    """Central board visibility queryset without email-based privilege bypasses."""
    if user.is_superuser:
        return Board.objects.all()
    return Board.objects.filter(
        models.Q(owner=user) | models.Q(members=user)
    ).distinct()


# ======================================================================
# Boards
# ======================================================================


class BoardListCreateView(generics.ListCreateAPIView):
    """Listen/Erstellen der Boards, auf die der User Zugriff hat."""

    serializer_class = BoardSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = (TokenAuthentication, SessionAuthentication)

    def get_queryset(self):
        return boards_for_user(self.request.user)

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset().distinct()
        result = [self._get_board_stats(b) for b in qs]
        return Response(result)

    def create(self, request, *args, **kwargs):
        user = request.user
        data = request.data.copy()
        members = self._get_members_with_owner(data, user)
        serializer = self.get_serializer(data={**data, "members": members})
        serializer.is_valid(raise_exception=True)
        board = serializer.save(owner=user)
        board.members.add(*members)
        board.save()
        return Response(self._get_board_stats(board), status=status.HTTP_201_CREATED)

    def _get_members_with_owner(self, data, user):
        members = list(data.get("members", []))
        if user.id not in members:
            members.append(user.id)
        return members

    def _get_board_stats(self, board: Board):
        tasks = board.tasks.all()
        # Status heißt "to-do"
        return {
            "id": board.id,
            "title": board.title,
            "member_count": board.members.count(),
            "ticket_count": tasks.count(),
            "tasks_to_do_count": tasks.filter(status="to-do").count(),
            "tasks_high_prio_count": tasks.filter(
                status="to-do", description__icontains="prio:high"
            ).count(),
            "owner_id": board.owner.id if board.owner else None,
        }


class BoardDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Details/Update/Delete eines Boards."""

    queryset = Board.objects.all()
    serializer_class = BoardSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = (TokenAuthentication, SessionAuthentication)

    def get(self, request, *args, **kwargs):
        board = self.get_object()
        if not user_can_access_board(request.user, board):
            return Response(
                {"detail": "No permission to view this board."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().get(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        board = self.get_object()
        user = request.user
        if not self._has_update_permission(user, board):
            return Response(
                {"detail": "No permission to update this board."},
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data
        if "title" in data:
            board.title = data["title"]

        if "members" in data:
            member_ids = data["members"]
            valid_members = User.objects.filter(id__in=member_ids)
            if valid_members.count() != len(member_ids):
                return Response(
                    {"detail": "Invalid member IDs."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            board.members.set(valid_members)

        board.save()
        return Response(self._response_data(board), status=status.HTTP_200_OK)

    def _has_update_permission(self, user, board):
        return user_can_access_board(user, board)

    def _response_data(self, board: Board):
        owner = board.owner
        owner_data = (
            {
                "id": owner.id,
                "email": owner.email,
                "fullname": getattr(owner, "full_name", str(owner)),
            }
            if owner
            else None
        )

        members_data = [
            {
                "id": m.id,
                "email": m.email,
                "fullname": getattr(m, "full_name", str(m)),
            }
            for m in board.members.all()
        ]
        return {
            "id": board.id,
            "title": board.title,
            "owner_data": owner_data,
            "members_data": members_data,
        }

    def destroy(self, request, *args, **kwargs):
        board = self.get_object()
        if not user_can_manage_board(request.user, board):
            return Response(
                {"detail": "No permission to delete this board."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)


class BoardCurrentDraftView(APIView):
    """Gibt den offenen Debriefing‑Draft von heute zurück (oder erstellt ihn)."""

    permission_classes = [IsAuthenticated]
    authentication_classes = (TokenAuthentication, SessionAuthentication)

    def get(self, request, pk):
        board = get_object_or_404(Board, pk=pk)
        user = request.user
        if not user_can_access_board(user, board):
            return Response(
                {"detail": "No permission to access this board."},
                status=status.HTTP_403_FORBIDDEN,
            )

        today = timezone.localdate()
        draft = (
            Debriefing.objects.filter(board=board, status=Debriefing.Status.DRAFT)
            .order_by("-created_at")
            .first()
        )

        if draft is None or draft.match_date != today:
            draft = Debriefing.objects.create(
                board=board,
                match_date=today,
                created_by=user,
            )

        return Response(DebriefingSerializer(draft).data, status=status.HTTP_200_OK)


# ======================================================================
# Centrally stored board documents
# ======================================================================


class BoardDocumentListCreateView(APIView):
    """List, upload, or replace monthly HTML tool editions for one board."""

    permission_classes = [IsAuthenticated]
    authentication_classes = (TokenAuthentication, SessionAuthentication)
    parser_classes = (MultiPartParser, FormParser)

    def _get_board(self, request, board_id):
        board = get_object_or_404(Board, pk=board_id)
        if not user_can_access_board(request.user, board):
            raise PermissionDenied("No permission to access documents for this board.")
        return board

    def get(self, request, board_id):
        board = self._get_board(request, board_id)
        documents = BoardDocument.objects.filter(board=board).select_related(
            "uploaded_by"
        )

        market = request.query_params.get("market")
        if market:
            documents = documents.filter(market=market.upper())

        document_type = request.query_params.get("document_type")
        if document_type:
            documents = documents.filter(document_type=document_type)

        serializer = BoardDocumentMetadataSerializer(
            documents,
            many=True,
            context={"request": request},
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, board_id):
        board = self._get_board(request, board_id)
        upload_serializer = BoardDocumentUploadSerializer(data=request.data)
        upload_serializer.is_valid(raise_exception=True)
        payload = upload_serializer.validated_data
        upload = payload["file"]
        market = payload["market"]
        document_type = payload["document_type"]
        period = payload["period"]
        sales_date = payload["sales_date"]
        replace_existing = payload["replace"]
        file_name = Path(upload.name).name
        mime_type = (upload.content_type or "text/html").split(";", 1)[0].lower()
        if mime_type == "application/octet-stream":
            mime_type = "text/html"

        previous_file_name = None
        previous_storage = None
        document = None
        created = False

        try:
            with transaction.atomic():
                # Locking the parent also serializes a board's first upload,
                # where no document row exists yet to lock.
                locked_board = Board.objects.select_for_update().get(pk=board.pk)
                document = (
                    BoardDocument.objects.select_for_update()
                    .filter(
                        board=locked_board,
                        market=market,
                        document_type=document_type,
                        period=period,
                    )
                    .first()
                )

                if document is None:
                    document = BoardDocument(
                        board=locked_board,
                        market=market,
                        document_type=document_type,
                        period=period,
                    )
                    created = True
                elif not replace_existing:
                    return Response(
                        {
                            "detail": (
                                "A document already exists for this board, "
                                "market, document type and period. Confirm "
                                "replacement."
                            ),
                            "code": "document_exists",
                        },
                        status=status.HTTP_409_CONFLICT,
                    )
                elif document.file and document.file.name:
                    previous_file_name = document.file.name
                    previous_storage = document.file.storage

                document.sales_date = sales_date
                document.file = upload
                document.file_name = file_name
                document.mime_type = mime_type
                document.size = upload.size
                document.uploaded_by = request.user
                document.save()

                if (
                    previous_storage
                    and previous_file_name
                    and previous_file_name != document.file.name
                ):
                    transaction.on_commit(
                        lambda: self._delete_replaced_file(
                            previous_storage,
                            previous_file_name,
                        )
                    )
        except Exception:
            # FileField storage writes happen before the database commit. Avoid
            # leaving the new upload behind if a database error rolls it back.
            if document and document.file and document.file.name:
                if (
                    getattr(document.file, "_committed", False)
                    and document.file.name != previous_file_name
                ):
                    try:
                        document.file.storage.delete(document.file.name)
                    except Exception:
                        logger.exception(
                            "Could not clean up failed document upload %s",
                            document.file.name,
                        )
            raise

        response_serializer = BoardDocumentMetadataSerializer(
            document,
            context={"request": request},
        )
        response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(response_serializer.data, status=response_status)

    @staticmethod
    def _delete_replaced_file(storage, file_name):
        """Remove an old upload only after its replacement was committed."""
        try:
            storage.delete(file_name)
        except Exception:
            logger.exception(
                "Could not remove replaced document file %s",
                file_name,
            )


class LegacyBoardBookletListCreateView(BoardDocumentListCreateView):
    """Keep the former list URL scoped to its original CH booklet data."""

    def get(self, request, board_id):
        board = self._get_board(request, board_id)
        documents = BoardDocument.objects.filter(
            board=board,
            market=BoardDocument.Market.CH,
            document_type=BoardDocument.DocumentType.BOOKLET,
        ).select_related("uploaded_by")
        serializer = BoardDocumentMetadataSerializer(
            documents,
            many=True,
            context={"request": request},
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


class DocumentDeleteView(APIView):
    """Delete a document record and its privately stored file."""

    permission_classes = [IsAuthenticated]
    authentication_classes = (TokenAuthentication, SessionAuthentication)

    def delete(self, request, pk):
        document = get_object_or_404(
            BoardDocument.objects.select_related("board"),
            pk=pk,
        )
        if not user_can_access_board(request.user, document.board):
            raise PermissionDenied("No permission to delete this document.")
        document.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DocumentContentView(APIView):
    """Return one protected HTML document to an authorized board member."""

    permission_classes = [IsAuthenticated]
    authentication_classes = (TokenAuthentication, SessionAuthentication)

    def get(self, request, pk):
        document = get_object_or_404(
            BoardDocument.objects.select_related("board"),
            pk=pk,
        )
        if not user_can_access_board(request.user, document.board):
            raise PermissionDenied("No permission to access this document.")
        if not document.file or not document.file.storage.exists(document.file.name):
            raise NotFound("Document file not found.")

        response = FileResponse(
            document.file.open("rb"),
            as_attachment=True,
            filename=document.file_name,
            content_type=document.mime_type or "text/html",
        )
        response["X-Content-Type-Options"] = "nosniff"
        response["Cache-Control"] = "private, no-store"
        return response


# ======================================================================
# Centrally stored board tool status
# ======================================================================


class BoardToolStatusBoardMixin:
    """Resolve one board and enforce the same collaboration permissions."""

    def _get_board(self, request, board_id):
        board = get_object_or_404(Board, pk=board_id)
        if not user_can_access_board(request.user, board):
            raise PermissionDenied(
                "No permission to access tool status for this board."
            )
        return board

    @staticmethod
    def _response(rows, request, response_status=status.HTTP_200_OK):
        serializer = BoardToolStatusSerializer(
            rows,
            many=True,
            context={"request": request},
        )
        response = Response(serializer.data, status=response_status)
        response["Cache-Control"] = "private, no-store"
        return response


class BoardToolStatusListView(BoardToolStatusBoardMixin, APIView):
    """List shared status rows or initialize rows that do not exist yet."""

    permission_classes = [IsAuthenticated]
    authentication_classes = (TokenAuthentication, SessionAuthentication)

    def get(self, request, board_id):
        board = self._get_board(request, board_id)
        rows = BoardToolStatus.objects.filter(board=board).select_related("updated_by")
        return self._response(rows, request)

    def post(self, request, board_id):
        """Create only missing rows; existing central values always win."""
        board = self._get_board(request, board_id)
        raw_rows = (
            request.data.get("statuses")
            if isinstance(
                request.data,
                dict,
            )
            else None
        )

        if not isinstance(raw_rows, list):
            raise serializers.ValidationError(
                {"statuses": "Provide a list of tool-status rows."}
            )
        if not raw_rows:
            raise serializers.ValidationError(
                {"statuses": "Provide at least one tool-status row."}
            )
        if len(raw_rows) > 8:
            raise serializers.ValidationError(
                {"statuses": "At most eight CH/AT tool-status rows are allowed."}
            )

        input_serializer = BoardToolStatusInitializeItemSerializer(
            data=raw_rows,
            many=True,
        )
        input_serializer.is_valid(raise_exception=True)

        seen_keys = set()
        for row in input_serializer.validated_data:
            key = (row["market"], row["document_type"])
            if key in seen_keys:
                raise serializers.ValidationError(
                    {"statuses": "Each market and document type may appear only once."}
                )
            seen_keys.add(key)

        created_any = False
        with transaction.atomic():
            locked_board = Board.objects.select_for_update().get(pk=board.pk)
            for row in input_serializer.validated_data:
                values = dict(row)
                market = values.pop("market")
                document_type = values.pop("document_type")
                values["updated_by"] = request.user
                _, created = BoardToolStatus.objects.get_or_create(
                    board=locked_board,
                    market=market,
                    document_type=document_type,
                    defaults=values,
                )
                created_any = created_any or created

        rows = BoardToolStatus.objects.filter(board=board).select_related("updated_by")
        return self._response(
            rows,
            request,
            status.HTTP_201_CREATED if created_any else status.HTTP_200_OK,
        )


class BoardToolStatusDetailView(BoardToolStatusBoardMixin, APIView):
    """Partially update one board/market/tool row, creating it if needed."""

    permission_classes = [IsAuthenticated]
    authentication_classes = (TokenAuthentication, SessionAuthentication)

    def patch(self, request, board_id, market, document_type):
        board = self._get_board(request, board_id)
        normalized_market = str(market or "").upper()
        normalized_type = str(document_type or "").lower()

        errors = {}
        if normalized_market not in BoardDocument.Market.values:
            errors["market"] = "Unsupported market."
        if normalized_type not in BoardDocument.DocumentType.values:
            errors["document_type"] = "Unsupported document type."
        if errors:
            raise serializers.ValidationError(errors)

        with transaction.atomic():
            locked_board = Board.objects.select_for_update().get(pk=board.pk)
            row, _ = BoardToolStatus.objects.get_or_create(
                board=locked_board,
                market=normalized_market,
                document_type=normalized_type,
            )
            serializer = BoardToolStatusSerializer(
                row,
                data=request.data,
                partial=True,
                context={"request": request},
            )
            serializer.is_valid(raise_exception=True)
            row = serializer.save(updated_by=request.user)

        response = Response(
            BoardToolStatusSerializer(
                row,
                context={"request": request},
            ).data,
            status=status.HTTP_200_OK,
        )
        response["Cache-Control"] = "private, no-store"
        return response


# ======================================================================
# Debriefing
# ======================================================================


class DebriefingViewSet(viewsets.ModelViewSet):
    """CRUD + Submit‑Action für SFL‑Debriefings."""

    queryset = Debriefing.objects.all()
    serializer_class = DebriefingSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = (TokenAuthentication, SessionAuthentication)

    def get_queryset(self):
        return Debriefing.objects.filter(board__in=boards_for_user(self.request.user))

    def perform_create(self, serializer):
        board = serializer.validated_data["board"]
        if not user_can_access_board(self.request.user, board):
            raise PermissionDenied("No permission to create a debriefing here.")
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        deb = self.get_object()

        if deb.status == Debriefing.Status.FINAL:
            return Response(
                {"detail": "already submitted"}, status=status.HTTP_400_BAD_REQUEST
            )

        deb.status = Debriefing.Status.FINAL
        deb.submitted_at = timezone.now()
        deb.save()

        pdf_bytes = generate_pdf(deb)
        filename = f"debriefing_{deb.id}.pdf"
        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'attachment; filename="{filename}"'
        return resp

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        deb = self.get_object()
        if deb.status != Debriefing.Status.FINAL:
            return Response(
                {"detail": "Draft has not been submitted yet."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pdf_bytes = generate_pdf(deb)
        filename = f"debriefing_{deb.id}.pdf"
        resp = HttpResponse(pdf_bytes, content_type="application/pdf")
        resp["Content-Disposition"] = f'attachment; filename="{filename}"'
        return resp


# ======================================================================
# Graphics‑Rapport
# ======================================================================


class GraphicsRapportViewSet(viewsets.ModelViewSet):
    """CRUD für Graphics‑Rapports (PDF/Submit ggf. später analog)."""

    queryset = GraphicsRapport.objects.all()
    serializer_class = GraphicsRapportSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = (TokenAuthentication, SessionAuthentication)

    def get_queryset(self):
        return GraphicsRapport.objects.filter(
            board__in=boards_for_user(self.request.user)
        )

    def perform_create(self, serializer):
        board = serializer.validated_data["board"]
        if not user_can_access_board(self.request.user, board):
            raise PermissionDenied("No permission to create a graphics rapport here.")
        serializer.save(created_by=self.request.user)


# ======================================================================
# Tasks
# ======================================================================


class TaskListCreateView(generics.ListCreateAPIView):
    """List & Create für Tasks (mit Filtern)."""

    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = (TokenAuthentication, SessionAuthentication)

    def get_queryset(self):
        qs = Task.objects.all()
        user = self.request.user
        if not user.is_superuser:
            qs = qs.filter(
                models.Q(board__owner=user) | models.Q(board__members=user)
            ).distinct()
        params = self.request.query_params
        if params.get("status"):
            qs = qs.filter(status=params.get("status"))
        if params.get("board"):
            qs = qs.filter(board=params.get("board"))
        if params.get("assignee"):
            qs = qs.filter(assignee=params.get("assignee"))
        if params.get("due_date"):
            qs = qs.filter(due_date=params.get("due_date"))
        return qs

    def _has_board_permission(self, user, board: Board):
        return user_can_access_board(user, board)

    def create(self, request, *args, **kwargs):
        data = request.data.copy()

        # Assignee/Reviewer via *_id
        assignee = reviewer = None
        try:
            if data.get("assignee_id"):
                assignee = User.objects.get(id=data.pop("assignee_id"))
            if data.get("reviewer_id"):
                reviewer = User.objects.get(id=data.pop("reviewer_id"))
        except User.DoesNotExist:
            return Response(
                {"detail": "Assignee or Reviewer not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Board prüfen
        board_id = data.get("board")
        try:
            board = Board.objects.get(pk=board_id)
        except Board.DoesNotExist:
            return Response(
                {"detail": "Board not found."}, status=status.HTTP_404_NOT_FOUND
            )

        if not self._has_board_permission(request.user, board):
            return Response(
                {"detail": "No permission to create task on this board."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        task = serializer.save(
            created_by=request.user,
            assignee=assignee,
            reviewer=reviewer,
        )

        return Response(
            {
                "id": task.id,
                "board": task.board.id,
                "title": task.title,
                "description": task.description,
                "status": task.status,
                "priority": task.priority,
                "assignee": self._user_info(task.assignee),
                "reviewer": self._user_info(task.reviewer),
                "due_date": task.due_date,
                "comments_count": task.comments.count(),
            },
            status=status.HTTP_201_CREATED,
        )

    def _user_info(self, user: User | None):
        if not user:
            return None
        return {
            "id": user.id,
            "email": user.email,
            "fullname": getattr(user, "full_name", user.email),
        }


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Read/Update/Delete einzelner Task (nur mit Board‑Rechten)."""

    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = (TokenAuthentication, SessionAuthentication)

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Task.objects.all()
        return Task.objects.filter(
            models.Q(board__owner=user) | models.Q(board__members=user)
        ).distinct()

    def _has_permission(self, user, task: Task):
        return user_can_access_board(user, task.board)

    def update(self, request, *args, **kwargs):
        task = self.get_object()
        if not self._has_permission(request.user, task):
            return Response(
                {"detail": "No permission to update this task."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        task = self.get_object()
        if not self._has_permission(request.user, task):
            return Response(
                {"detail": "No permission to delete this task."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)


# ======================================================================
# Comments
# ======================================================================


class CommentListCreateView(generics.ListCreateAPIView):
    """Kommentare zu einem Task (List/Create)."""

    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = (TokenAuthentication, SessionAuthentication)

    def get_queryset(self):
        task_id = self.kwargs.get("task_id")
        try:
            task = Task.objects.get(id=task_id)
        except Task.DoesNotExist:
            raise NotFound("Task not found.")

        if not self._can_view_comments(self.request.user, task):
            raise PermissionDenied("No permission to view comments for this task.")
        return Comment.objects.filter(task__id=task_id)

    def _can_view_comments(self, user, task: Task):
        return user_can_access_board(user, task.board)

    def perform_create(self, serializer):
        user = self.request.user
        task = self._get_task_or_raise()
        if not self._can_view_comments(user, task):
            raise serializers.ValidationError("No permission to comment on this task.")

        comment = serializer.save(author=user, task=task)

        recipients = set()
        for u in (task.assignee, task.reviewer, task.board.owner):
            if u and u.email:
                recipients.add(u.email)

        if recipients:
            send_mail(
                subject=(
                    f"[MM Strategic Assortment] New comment on task: " f"{task.title}"
                ),
                message=(
                    "Hi,\n\n"
                    f"A new comment was added to your task '{task.title}'.\n\n"
                    f"Comment:\n{comment.text}\n\n"
                    f"By: {user.email}\n"
                    f"Board: {task.board.title}\n\n"
                    "Best regards\nMM Strategic Assortment"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=list(recipients),
                fail_silently=True,
            )

    def _get_task_or_raise(self) -> Task:
        task_id = self.kwargs.get("task_id")
        try:
            return Task.objects.get(id=task_id)
        except Task.DoesNotExist:
            raise NotFound("Task not found.")


class CommentDeleteView(generics.DestroyAPIView):
    """Kommentar löschen (Author, Superuser oder BBM)."""

    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = (TokenAuthentication, SessionAuthentication)

    def get_object(self):
        task_id = self.kwargs.get("task_id")
        comment_id = self.kwargs.get("pk")
        if not Task.objects.filter(id=task_id).exists():
            raise NotFound("Task not found.")
        try:
            return Comment.objects.get(id=comment_id, task__id=task_id)
        except Comment.DoesNotExist:
            raise NotFound("Comment or Task not found.")

    def destroy(self, request, *args, **kwargs):
        comment = self.get_object()
        user = request.user
        if not (user == comment.author or user.is_superuser):
            return Response(
                {"detail": "No permission to delete this comment."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)


# ======================================================================
# User‑bezogene Task‑Listen
# ======================================================================


class AssignedToMeTaskListView(generics.ListAPIView):
    """Alle Tasks, bei denen der User Assignee oder Reviewer ist."""

    serializer_class = TaskListSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = (TokenAuthentication, SessionAuthentication)

    def get_queryset(self):
        user = self.request.user
        return Task.objects.filter(
            models.Q(assignee=user) | models.Q(reviewer=user)
        ).distinct()


class ReviewingTaskListView(generics.ListAPIView):
    """Alle Tasks, die der User reviewt."""

    serializer_class = TaskListSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = (TokenAuthentication, SessionAuthentication)

    def get_queryset(self):
        return Task.objects.filter(reviewer=self.request.user)


# ======================================================================
# Misc
# ======================================================================


class EmailCheckView(generics.GenericAPIView):
    """Prüft, ob eine E‑Mail im User‑Model existiert."""

    permission_classes = [IsAuthenticated]
    authentication_classes = (TokenAuthentication, SessionAuthentication)

    def get(self, request, *args, **kwargs):
        email = request.query_params.get("email")
        if not email:
            return Response(
                {"detail": "Email query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            user = User.objects.get(email=email)
            data = {
                "id": user.id,
                "email": user.email,
                "fullname": getattr(user, "full_name", user.email),
            }
            return Response(data, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response(
                {"detail": "Email not found."}, status=status.HTTP_404_NOT_FOUND
            )


# ======================================================================
# Key/Value‑API (für Kits/Staff‑Listen, serverseitige Persistenz)
# ======================================================================


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def kv_state(request, key: str):
    """
    GET     /api/kv/<key>/          -> {"key": "...", "value": {...}}
    PUT     /api/kv/<key>/ (JSON)   -> {"ok": true}
             akzeptiert {"value": ...} ODER Roh‑JSON (wird direkt gespeichert)
    DELETE  /api/kv/<key>/          -> {"ok": true}
    """
    if request.method == "GET":
        try:
            kv = KVStore.objects.get(key=key)
            return Response({"key": kv.key, "value": kv.value}, status=200)
        except KVStore.DoesNotExist:
            return Response({"key": key, "value": {}}, status=200)

    if request.method == "PUT":
        data = request.data
        payload = data.get("value", data)
        kv, created = KVStore.objects.get_or_create(
            key=key, defaults={"value": payload}
        )
        if not created:
            kv.value = payload
        kv.save()
        return Response({"ok": True}, status=200)

    # DELETE
    KVStore.objects.filter(key=key).delete()
    return Response({"ok": True}, status=200)


# ======================================================================
# Roster‑Endpoint (Basisdaten für Staff & Player Pics)
# ======================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@authentication_classes([TokenAuthentication, SessionAuthentication])
def roster(request):
    """
    GET /api/roster?club=<clubId>
    Antwort: {"club": "<clubId>", "players": [ {id, number, first_name, last_name, on_air_name, portrait_present}, ... ]}
    Liest optional aus KVStore-Key 'bbm.roster.base'. Fällt sonst auf [] zurück.
    """
    club = (request.query_params.get("club") or "").strip().lower()
    players: list[dict] = []

    if club:
        try:
            kv = KVStore.objects.get(key="bbm.roster.base")
            data = kv.value if isinstance(kv.value, dict) else {}
            raw = data.get(club, [])
            norm = []
            for idx, p in enumerate(raw):
                pid = p.get("id") or f"base-{club}-{idx}"
                norm.append(
                    {
                        "id": pid,
                        "number": p.get("number") or "",
                        "first_name": p.get("first_name") or "",
                        "last_name": p.get("last_name") or "",
                        "on_air_name": p.get("on_air_name") or "",
                        "portrait_present": bool(p.get("portrait_present")),
                    }
                )
            players = norm
        except KVStore.DoesNotExist:
            players = []

    return Response({"club": club, "players": players}, status=200)