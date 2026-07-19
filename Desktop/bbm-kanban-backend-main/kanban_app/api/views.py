from __future__ import annotations

import logging
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db import models, transaction
from django.http import FileResponse, HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import (
    generics,
    serializers,
    status,
    viewsets,
)
from rest_framework.authentication import (
    SessionAuthentication,
    TokenAuthentication,
)
from rest_framework.decorators import (
    action,
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.exceptions import (
    NotFound,
    PermissionDenied,
)
from rest_framework.parsers import (
    FormParser,
    MultiPartParser,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from kanban_app.models import (
    Board,
    Booklet,
    Comment,
    Debriefing,
    GraphicsRapport,
    KVStore,
    Task,
)

from .debriefing_pdf import generate_pdf
from .serializers import (
    BoardSerializer,
    BookletMetadataSerializer,
    BookletUploadSerializer,
    CommentSerializer,
    DebriefingSerializer,
    GraphicsRapportSerializer,
    TaskListSerializer,
    TaskSerializer,
)


logger = logging.getLogger(__name__)
User = get_user_model()


def user_can_access_board(user, board: Board) -> bool:
    """Return whether a user may access and collaborate on a board."""
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
    """Return whether a user may delete or administrate a board."""
    return bool(
        user
        and user.is_authenticated
        and (
            user.is_superuser
            or board.owner_id == user.id
        )
    )


def boards_for_user(user):
    """Return the boards visible to the current user."""
    if user.is_superuser:
        return Board.objects.all()

    return Board.objects.filter(
        models.Q(owner=user)
        | models.Q(members=user)
    ).distinct()


class BoardListCreateView(generics.ListCreateAPIView):
    """List or create boards."""

    serializer_class = BoardSerializer
    permission_classes = [IsAuthenticated]

    authentication_classes = (
        TokenAuthentication,
        SessionAuthentication,
    )

    def get_queryset(self):
        return boards_for_user(self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset().distinct()
        result = [
            self._get_board_stats(board)
            for board in queryset
        ]

        return Response(result)

    def create(self, request, *args, **kwargs):
        user = request.user
        data = request.data.copy()
        members = self._get_members_with_owner(
            data,
            user,
        )

        serializer = self.get_serializer(
            data={
                **data,
                "members": members,
            }
        )

        serializer.is_valid(
            raise_exception=True,
        )

        board = serializer.save(owner=user)
        board.members.add(*members)
        board.save()

        return Response(
            self._get_board_stats(board),
            status=status.HTTP_201_CREATED,
        )

    def _get_members_with_owner(self, data, user):
        members = list(data.get("members", []))

        if user.id not in members:
            members.append(user.id)

        return members

    def _get_board_stats(self, board: Board):
        tasks = board.tasks.all()

        return {
            "id": board.id,
            "title": board.title,
            "member_count": board.members.count(),
            "ticket_count": tasks.count(),
            "tasks_to_do_count": tasks.filter(
                status="to-do",
            ).count(),
            "tasks_high_prio_count": tasks.filter(
                status="to-do",
                description__icontains="prio:high",
            ).count(),
            "owner_id": (
                board.owner.id
                if board.owner
                else None
            ),
        }


class BoardDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    """Retrieve, update or delete a board."""

    queryset = Board.objects.all()
    serializer_class = BoardSerializer
    permission_classes = [IsAuthenticated]

    authentication_classes = (
        TokenAuthentication,
        SessionAuthentication,
    )

    def get(self, request, *args, **kwargs):
        board = self.get_object()

        if not user_can_access_board(
            request.user,
            board,
        ):
            return Response(
                {
                    "detail": (
                        "No permission to view this board."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().get(
            request,
            *args,
            **kwargs,
        )

    def update(self, request, *args, **kwargs):
        board = self.get_object()
        user = request.user

        if not user_can_access_board(user, board):
            return Response(
                {
                    "detail": (
                        "No permission to update this board."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data

        if "title" in data:
            board.title = data["title"]

        if "members" in data:
            member_ids = data["members"]
            valid_members = User.objects.filter(
                id__in=member_ids,
            )

            if valid_members.count() != len(member_ids):
                return Response(
                    {"detail": "Invalid member IDs."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            board.members.set(valid_members)

        board.save()

        return Response(
            self._response_data(board),
            status=status.HTTP_200_OK,
        )

    def _response_data(self, board: Board):
        owner = board.owner

        owner_data = (
            {
                "id": owner.id,
                "email": owner.email,
                "fullname": getattr(
                    owner,
                    "full_name",
                    str(owner),
                ),
            }
            if owner
            else None
        )

        members_data = [
            {
                "id": member.id,
                "email": member.email,
                "fullname": getattr(
                    member,
                    "full_name",
                    str(member),
                ),
            }
            for member in board.members.all()
        ]

        return {
            "id": board.id,
            "title": board.title,
            "owner_data": owner_data,
            "members_data": members_data,
        }

    def destroy(self, request, *args, **kwargs):
        board = self.get_object()

        if not user_can_manage_board(
            request.user,
            board,
        ):
            return Response(
                {
                    "detail": (
                        "No permission to delete this board."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().destroy(
            request,
            *args,
            **kwargs,
        )


class BoardCurrentDraftView(APIView):
    """Return or create today's open debriefing draft."""

    permission_classes = [IsAuthenticated]

    authentication_classes = (
        TokenAuthentication,
        SessionAuthentication,
    )

    def get(self, request, pk):
        board = get_object_or_404(
            Board,
            pk=pk,
        )

        if not user_can_access_board(
            request.user,
            board,
        ):
            return Response(
                {
                    "detail": (
                        "No permission to access this board."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        today = timezone.localdate()

        draft = (
            Debriefing.objects
            .filter(
                board=board,
                status=Debriefing.Status.DRAFT,
            )
            .order_by("-created_at")
            .first()
        )

        if draft is None or draft.match_date != today:
            draft = Debriefing.objects.create(
                board=board,
                match_date=today,
                created_by=request.user,
            )

        return Response(
            DebriefingSerializer(draft).data,
            status=status.HTTP_200_OK,
        )


class BoardBookletListCreateView(APIView):
    """List, upload or replace board booklets."""

    permission_classes = [IsAuthenticated]

    authentication_classes = (
        TokenAuthentication,
        SessionAuthentication,
    )

    parser_classes = (
        MultiPartParser,
        FormParser,
    )

    def _get_board(self, request, board_id):
        board = get_object_or_404(
            Board,
            pk=board_id,
        )

        if not user_can_access_board(
            request.user,
            board,
        ):
            raise PermissionDenied(
                "No permission to access booklets for this board."
            )

        return board

    def get(self, request, board_id):
        board = self._get_board(
            request,
            board_id,
        )

        booklets = (
            board.booklets
            .select_related("uploaded_by")
            .all()
        )

        serializer = BookletMetadataSerializer(
            booklets,
            many=True,
            context={"request": request},
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

    def post(self, request, board_id):
        board = self._get_board(
            request,
            board_id,
        )

        upload_serializer = BookletUploadSerializer(
            data=request.data,
        )

        upload_serializer.is_valid(
            raise_exception=True,
        )

        payload = upload_serializer.validated_data
        upload = payload["file"]
        document_type = payload["document_type"]
        period = payload["period"]
        replace_existing = payload["replace"]

        file_name = Path(upload.name).name

        mime_type = (
            upload.content_type
            or "text/html"
        ).split(";", 1)[0].lower()

        if mime_type == "application/octet-stream":
            mime_type = "text/html"

        previous_file_name = None
        previous_storage = None
        booklet = None
        created = False

        try:
            with transaction.atomic():
                locked_board = (
                    Board.objects
                    .select_for_update()
                    .get(pk=board.pk)
                )

                booklet = (
                    Booklet.objects
                    .select_for_update()
                    .filter(
                        board=locked_board,
                        document_type=document_type,
                        period=period,
                    )
                    .first()
                )

                if booklet is None:
                    booklet = Booklet(
                        board=locked_board,
                        document_type=document_type,
                        period=period,
                    )
                    created = True

                elif not replace_existing:
                    return Response(
                        {
                            "detail": (
                                "A booklet already exists for this "
                                "board, document type and period. "
                                "Confirm replacement."
                            ),
                            "code": "booklet_exists",
                        },
                        status=status.HTTP_409_CONFLICT,
                    )

                elif booklet.file and booklet.file.name:
                    previous_file_name = booklet.file.name
                    previous_storage = booklet.file.storage

                booklet.file = upload
                booklet.file_name = file_name
                booklet.mime_type = mime_type
                booklet.size = upload.size
                booklet.uploaded_by = request.user
                booklet.save()

        except Exception:
            if (
                booklet
                and booklet.file
                and booklet.file.name
                and booklet.file.name != previous_file_name
            ):
                booklet.file.storage.delete(
                    booklet.file.name
                )

            raise

        if (
            previous_storage
            and previous_file_name
            and previous_file_name != booklet.file.name
        ):

            def delete_replaced_file():
                try:
                    previous_storage.delete(
                        previous_file_name
                    )
                except Exception:
                    logger.exception(
                        "Could not remove replaced booklet file %s",
                        previous_file_name,
                    )

            transaction.on_commit(
                delete_replaced_file
            )

        response_serializer = BookletMetadataSerializer(
            booklet,
            context={"request": request},
        )

        response_status = (
            status.HTTP_201_CREATED
            if created
            else status.HTTP_200_OK
        )

        return Response(
            response_serializer.data,
            status=response_status,
        )


class BookletDeleteView(APIView):
    """Delete a booklet and its stored file."""

    permission_classes = [IsAuthenticated]

    authentication_classes = (
        TokenAuthentication,
        SessionAuthentication,
    )

    def delete(self, request, pk):
        booklet = get_object_or_404(
            Booklet.objects.select_related("board"),
            pk=pk,
        )

        if not user_can_access_board(
            request.user,
            booklet.board,
        ):
            raise PermissionDenied(
                "No permission to delete this booklet."
            )

        booklet.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )


class BookletContentView(APIView):
    """Return a protected booklet as a download."""

    permission_classes = [IsAuthenticated]

    authentication_classes = (
        TokenAuthentication,
        SessionAuthentication,
    )

    def get(self, request, pk):
        booklet = get_object_or_404(
            Booklet.objects.select_related("board"),
            pk=pk,
        )

        if not user_can_access_board(
            request.user,
            booklet.board,
        ):
            raise PermissionDenied(
                "No permission to access this booklet."
            )

        if (
            not booklet.file
            or not booklet.file.storage.exists(
                booklet.file.name
            )
        ):
            raise NotFound(
                "Booklet file not found."
            )

        response = FileResponse(
            booklet.file.open("rb"),
            as_attachment=True,
            filename=booklet.file_name,
            content_type=(
                booklet.mime_type
                or "text/html"
            ),
        )

        response["X-Content-Type-Options"] = "nosniff"
        response["Cache-Control"] = "private, no-store"

        return response


class DebriefingViewSet(viewsets.ModelViewSet):
    """CRUD and PDF submission for debriefings."""

    queryset = Debriefing.objects.all()
    serializer_class = DebriefingSerializer
    permission_classes = [IsAuthenticated]

    authentication_classes = (
        TokenAuthentication,
        SessionAuthentication,
    )

    def get_queryset(self):
        return Debriefing.objects.filter(
            board__in=boards_for_user(
                self.request.user
            )
        )

    def perform_create(self, serializer):
        board = serializer.validated_data["board"]

        if not user_can_access_board(
            self.request.user,
            board,
        ):
            raise PermissionDenied(
                "No permission to create a debriefing here."
            )

        serializer.save(
            created_by=self.request.user
        )

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        debriefing = self.get_object()

        if debriefing.status == Debriefing.Status.FINAL:
            return Response(
                {"detail": "already submitted"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        debriefing.status = Debriefing.Status.FINAL
        debriefing.submitted_at = timezone.now()
        debriefing.save()

        pdf_bytes = generate_pdf(debriefing)
        filename = f"debriefing_{debriefing.id}.pdf"

        response = HttpResponse(
            pdf_bytes,
            content_type="application/pdf",
        )

        response["Content-Disposition"] = (
            f'attachment; filename="{filename}"'
        )

        return response

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        debriefing = self.get_object()

        if debriefing.status != Debriefing.Status.FINAL:
            return Response(
                {
                    "detail": (
                        "Draft has not been submitted yet."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        pdf_bytes = generate_pdf(debriefing)
        filename = f"debriefing_{debriefing.id}.pdf"

        response = HttpResponse(
            pdf_bytes,
            content_type="application/pdf",
        )

        response["Content-Disposition"] = (
            f'attachment; filename="{filename}"'
        )

        return response


class GraphicsRapportViewSet(viewsets.ModelViewSet):
    """CRUD for graphics reports."""

    queryset = GraphicsRapport.objects.all()
    serializer_class = GraphicsRapportSerializer
    permission_classes = [IsAuthenticated]

    authentication_classes = (
        TokenAuthentication,
        SessionAuthentication,
    )

    def get_queryset(self):
        return GraphicsRapport.objects.filter(
            board__in=boards_for_user(
                self.request.user
            )
        )

    def perform_create(self, serializer):
        board = serializer.validated_data["board"]

        if not user_can_access_board(
            self.request.user,
            board,
        ):
            raise PermissionDenied(
                "No permission to create a graphics rapport here."
            )

        serializer.save(
            created_by=self.request.user
        )


class TaskListCreateView(
    generics.ListCreateAPIView
):
    """List and create tasks."""

    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    authentication_classes = (
        TokenAuthentication,
        SessionAuthentication,
    )

    def get_queryset(self):
        queryset = Task.objects.all()
        user = self.request.user

        if not user.is_superuser:
            queryset = queryset.filter(
                models.Q(board__owner=user)
                | models.Q(board__members=user)
            ).distinct()

        params = self.request.query_params

        if params.get("status"):
            queryset = queryset.filter(
                status=params.get("status"),
            )

        if params.get("board"):
            queryset = queryset.filter(
                board=params.get("board"),
            )

        if params.get("assignee"):
            queryset = queryset.filter(
                assignee=params.get("assignee"),
            )

        if params.get("due_date"):
            queryset = queryset.filter(
                due_date=params.get("due_date"),
            )

        return queryset

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        assignee = None
        reviewer = None

        try:
            if data.get("assignee_id"):
                assignee = User.objects.get(
                    id=data.pop("assignee_id"),
                )

            if data.get("reviewer_id"):
                reviewer = User.objects.get(
                    id=data.pop("reviewer_id"),
                )

        except User.DoesNotExist:
            return Response(
                {
                    "detail": (
                        "Assignee or Reviewer not found."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        board_id = data.get("board")

        try:
            board = Board.objects.get(
                pk=board_id,
            )
        except Board.DoesNotExist:
            return Response(
                {"detail": "Board not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if not user_can_access_board(
            request.user,
            board,
        ):
            return Response(
                {
                    "detail": (
                        "No permission to create a task "
                        "on this board."
                    )
                },
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
                "assignee": self._user_info(
                    task.assignee
                ),
                "reviewer": self._user_info(
                    task.reviewer
                ),
                "due_date": task.due_date,
                "comments_count": (
                    task.comments.count()
                ),
            },
            status=status.HTTP_201_CREATED,
        )

    def _user_info(self, user):
        if not user:
            return None

        return {
            "id": user.id,
            "email": user.email,
            "fullname": getattr(
                user,
                "full_name",
                user.email,
            ),
        }


class TaskDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    """Retrieve, update or delete one task."""

    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    authentication_classes = (
        TokenAuthentication,
        SessionAuthentication,
    )

    def get_queryset(self):
        user = self.request.user

        if user.is_superuser:
            return Task.objects.all()

        return Task.objects.filter(
            models.Q(board__owner=user)
            | models.Q(board__members=user)
        ).distinct()

    def update(self, request, *args, **kwargs):
        task = self.get_object()

        if not user_can_access_board(
            request.user,
            task.board,
        ):
            return Response(
                {
                    "detail": (
                        "No permission to update this task."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().update(
            request,
            *args,
            **kwargs,
        )

    def destroy(self, request, *args, **kwargs):
        task = self.get_object()

        if not user_can_access_board(
            request.user,
            task.board,
        ):
            return Response(
                {
                    "detail": (
                        "No permission to delete this task."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().destroy(
            request,
            *args,
            **kwargs,
        )


class CommentListCreateView(
    generics.ListCreateAPIView
):
    """List or create comments for a task."""

    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    authentication_classes = (
        TokenAuthentication,
        SessionAuthentication,
    )

    def get_queryset(self):
        task = self._get_task_or_raise()

        if not user_can_access_board(
            self.request.user,
            task.board,
        ):
            raise PermissionDenied(
                "No permission to view comments for this task."
            )

        return Comment.objects.filter(
            task=task,
        )

    def perform_create(self, serializer):
        user = self.request.user
        task = self._get_task_or_raise()

        if not user_can_access_board(
            user,
            task.board,
        ):
            raise serializers.ValidationError(
                "No permission to comment on this task."
            )

        comment = serializer.save(
            author=user,
            task=task,
        )

        recipients = set()

        for recipient in (
            task.assignee,
            task.reviewer,
            task.board.owner,
        ):
            if recipient and recipient.email:
                recipients.add(recipient.email)

        if recipients:
            send_mail(
                subject=(
                    "[MM Strategic Assortment] "
                    f"New comment on task: {task.title}"
                ),
                message=(
                    "Hi,\n\n"
                    f"A new comment was added to your "
                    f"task '{task.title}'.\n\n"
                    f"Comment:\n{comment.text}\n\n"
                    f"By: {user.email}\n"
                    f"Board: {task.board.title}\n\n"
                    "Best regards\n"
                    "MM Strategic Assortment"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=list(recipients),
                fail_silently=True,
            )

    def _get_task_or_raise(self):
        task_id = self.kwargs.get("task_id")

        try:
            return Task.objects.get(id=task_id)
        except Task.DoesNotExist:
            raise NotFound("Task not found.")


class CommentDeleteView(
    generics.DestroyAPIView
):
    """Delete a comment."""

    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    authentication_classes = (
        TokenAuthentication,
        SessionAuthentication,
    )

    def get_object(self):
        task_id = self.kwargs.get("task_id")
        comment_id = self.kwargs.get("pk")

        if not Task.objects.filter(
            id=task_id,
        ).exists():
            raise NotFound("Task not found.")

        try:
            return Comment.objects.get(
                id=comment_id,
                task__id=task_id,
            )
        except Comment.DoesNotExist:
            raise NotFound(
                "Comment or Task not found."
            )

    def destroy(self, request, *args, **kwargs):
        comment = self.get_object()
        user = request.user

        if not (
            user == comment.author
            or user.is_superuser
        ):
            return Response(
                {
                    "detail": (
                        "No permission to delete this comment."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return super().destroy(
            request,
            *args,
            **kwargs,
        )


class AssignedToMeTaskListView(
    generics.ListAPIView
):
    """Tasks where the user is assignee or reviewer."""

    serializer_class = TaskListSerializer
    permission_classes = [IsAuthenticated]

    authentication_classes = (
        TokenAuthentication,
        SessionAuthentication,
    )

    def get_queryset(self):
        user = self.request.user

        return Task.objects.filter(
            models.Q(assignee=user)
            | models.Q(reviewer=user)
        ).distinct()


class ReviewingTaskListView(
    generics.ListAPIView
):
    """Tasks currently reviewed by the user."""

    serializer_class = TaskListSerializer
    permission_classes = [IsAuthenticated]

    authentication_classes = (
        TokenAuthentication,
        SessionAuthentication,
    )

    def get_queryset(self):
        return Task.objects.filter(
            reviewer=self.request.user,
        )


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
@authentication_classes([
    TokenAuthentication,
    SessionAuthentication,
])
def kv_state(request, key: str):
    """Read, update or delete a server-side JSON value."""

    if request.method == "GET":
        try:
            key_value = KVStore.objects.get(key=key)

            return Response(
                {
                    "key": key_value.key,
                    "value": key_value.value,
                },
                status=status.HTTP_200_OK,
            )

        except KVStore.DoesNotExist:
            return Response(
                {
                    "key": key,
                    "value": {},
                },
                status=status.HTTP_200_OK,
            )

    if request.method == "PUT":
        data = request.data
        payload = data.get("value", data)

        key_value, created = (
            KVStore.objects.get_or_create(
                key=key,
                defaults={"value": payload},
            )
        )

        if not created:
            key_value.value = payload

        key_value.save()

        return Response(
            {"ok": True},
            status=status.HTTP_200_OK,
        )

    KVStore.objects.filter(
        key=key,
    ).delete()

    return Response(
        {"ok": True},
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@authentication_classes([
    TokenAuthentication,
    SessionAuthentication,
])
def roster(request):
    """Return roster data stored in the central key/value store."""

    club = (
        request.query_params.get("club")
        or ""
    ).strip().lower()

    players = []

    if club:
        try:
            key_value = KVStore.objects.get(
                key="bbm.roster.base",
            )

            data = (
                key_value.value
                if isinstance(key_value.value, dict)
                else {}
            )

            raw_players = data.get(club, [])
            normalized_players = []

            for index, player in enumerate(raw_players):
                player_id = (
                    player.get("id")
                    or f"base-{club}-{index}"
                )

                normalized_players.append(
                    {
                        "id": player_id,
                        "number": (
                            player.get("number")
                            or ""
                        ),
                        "first_name": (
                            player.get("first_name")
                            or ""
                        ),
                        "last_name": (
                            player.get("last_name")
                            or ""
                        ),
                        "on_air_name": (
                            player.get("on_air_name")
                            or ""
                        ),
                        "portrait_present": bool(
                            player.get(
                                "portrait_present"
                            )
                        ),
                    }
                )

            players = normalized_players

        except KVStore.DoesNotExist:
            players = []

    return Response(
        {
            "club": club,
            "players": players,
        },
        status=status.HTTP_200_OK,
    )