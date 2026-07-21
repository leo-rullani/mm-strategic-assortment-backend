# kanban_app/api/serializers.py
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.urls import reverse
from rest_framework import serializers

from kanban_app.models import (
    Board,
    BoardDocument,
    BoardToolStatus,
    Task,
    Comment,
    Debriefing,
    GraphicsRapport,  # ← NEU
)
from auth_app.models import User


# ---------------------------------------------------------------------------
#  USER
# ---------------------------------------------------------------------------
class UserSerializer(serializers.ModelSerializer):
    """
    Gibt immer einen sprechenden Namen zurück:
    - full_name, falls vorhanden
    - sonst die E‑Mail‑Adresse
    """

    fullname = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "fullname")

    def get_fullname(self, obj):
        return getattr(obj, "full_name", obj.email)


# ---------------------------------------------------------------------------
#  COMMENT
# ---------------------------------------------------------------------------
class CommentSerializer(serializers.ModelSerializer):
    """
    Minimale Darstellung (z. B. in Task‑Detailansicht)
    """

    author = serializers.SerializerMethodField()
    content = serializers.CharField(source="text")

    class Meta:
        model = Comment
        fields = ("id", "created_at", "author", "content")

    def get_author(self, obj):
        if obj.author:
            return getattr(obj.author, "full_name", obj.author.email)
        return "Unknown"


# ---------------------------------------------------------------------------
#  TASK – Detail‑Serializer (inkl. Kommentare)
# ---------------------------------------------------------------------------
class TaskSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    assignee = UserSerializer(read_only=True)
    reviewer = UserSerializer(read_only=True)

    assignee_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="assignee",
        write_only=True,
        required=False,
        allow_null=True,
    )
    reviewer_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source="reviewer",
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Task
        read_only_fields = ("id", "created_by", "created_at", "comments")
        fields = (
            "id",
            "board",
            "title",
            "description",
            "status",
            "status_display",
            "priority",
            "assignee",
            "assignee_id",
            "reviewer",
            "reviewer_id",
            "due_date",
            "created_by",
            "created_at",
            "comments",
        )


# ---------------------------------------------------------------------------
#  TASK – Listen‑Serializer (kompakter, aber mit Comment‑Count)
# ---------------------------------------------------------------------------
class TaskListSerializer(serializers.ModelSerializer):
    assignee = UserSerializer(read_only=True)
    reviewer = UserSerializer(read_only=True)
    comments_count = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = (
            "id",
            "board",
            "title",
            "description",
            "status",
            "priority",
            "assignee",
            "reviewer",
            "due_date",
            "comments_count",
        )

    def get_comments_count(self, obj):
        return obj.comments.count()


# ---------------------------------------------------------------------------
#  BOARD
# ---------------------------------------------------------------------------
class BoardSerializer(serializers.ModelSerializer):
    members = UserSerializer(many=True, read_only=True)
    tasks = TaskListSerializer(many=True, read_only=True)
    owner_id = serializers.IntegerField(source="owner.id", read_only=True)

    class Meta:
        model = Board
        read_only_fields = ("id", "owner_id", "created_at")
        fields = ("id", "title", "owner_id", "members", "tasks", "created_at")


# ---------------------------------------------------------------------------
#  DEBRIEFING (bestehend)
# ---------------------------------------------------------------------------
class DebriefingSerializer(serializers.ModelSerializer):
    """
    Vollständiges CRUD‑Serializer für den SFL‑Rapport.
    `created_by`, `created_at`, `submitted_at` werden vom System gesetzt.
    """

    class Meta:
        model = Debriefing
        fields = "__all__"
        read_only_fields = ("created_by", "created_at", "submitted_at")


# ---------------------------------------------------------------------------
#  GRAPHICS‑RAPPORT (NEU)
# ---------------------------------------------------------------------------
class GraphicsRapportSerializer(serializers.ModelSerializer):
    """
    Vollständiges CRUD‑Serializer für den Graphics‑Rapport.
    Analog zu Debriefing: System setzt created_by, created_at, submitted_at.
    """

    class Meta:
        model = GraphicsRapport
        fields = "__all__"
        read_only_fields = ("created_by", "created_at", "submitted_at")


# ---------------------------------------------------------------------------
#  BOARD DOCUMENTS
# ---------------------------------------------------------------------------
class BoardDocumentMetadataSerializer(serializers.ModelSerializer):
    """Metadata for one centrally stored board tool edition."""

    board = serializers.IntegerField(source="board_id", read_only=True)
    uploaded_by = UserSerializer(read_only=True)
    content_url = serializers.SerializerMethodField()

    class Meta:
        model = BoardDocument
        fields = (
            "id",
            "board",
            "market",
            "document_type",
            "period",
            "sales_date",
            "file_name",
            "mime_type",
            "size",
            "uploaded_by",
            "created_at",
            "updated_at",
            "content_url",
        )
        read_only_fields = fields

    def get_content_url(self, obj):
        path = reverse("document-content", kwargs={"pk": obj.pk})
        request = self.context.get("request")
        return request.build_absolute_uri(path) if request else path


class BoardDocumentUploadSerializer(serializers.Serializer):
    """Validate a multipart board-document upload or replacement."""

    MAX_FILE_SIZE = settings.DOCUMENT_MAX_UPLOAD_SIZE
    ALLOWED_EXTENSIONS = {".html", ".htm"}
    ALLOWED_MIME_TYPES = {
        "text/html",
        "application/xhtml+xml",
        "application/octet-stream",
    }

    market = serializers.ChoiceField(choices=BoardDocument.Market.choices)
    document_type = serializers.ChoiceField(choices=BoardDocument.DocumentType.choices)
    period = serializers.CharField(max_length=7)
    sales_date = serializers.DateField(required=True, allow_null=False)
    file = serializers.FileField(allow_empty_file=False)
    replace = serializers.BooleanField(required=False, default=False)

    def validate_period(self, value):
        try:
            parsed = datetime.strptime(value, "%Y-%m")
        except (TypeError, ValueError):
            raise serializers.ValidationError("Use YYYY-MM format with a valid month.")
        return parsed.strftime("%Y-%m")

    def validate_file(self, upload):
        file_name = Path(upload.name).name
        extension = Path(file_name).suffix.lower()
        if extension not in self.ALLOWED_EXTENSIONS:
            raise serializers.ValidationError("Only .html and .htm files are allowed.")
        if len(file_name) > 255:
            raise serializers.ValidationError(
                "The file name must not exceed 255 characters."
            )
        if upload.size > self.MAX_FILE_SIZE:
            raise serializers.ValidationError("The document must not exceed 10 MB.")

        mime_type = (upload.content_type or "").split(";", 1)[0].lower()
        if mime_type and mime_type not in self.ALLOWED_MIME_TYPES:
            raise serializers.ValidationError(
                "The uploaded file must use an HTML MIME type."
            )
        return upload


class BoardToolStatusSerializer(serializers.ModelSerializer):
    """Canonical API representation of one shared tool-status row."""

    board = serializers.IntegerField(source="board_id", read_only=True)
    updated_by = UserSerializer(read_only=True)

    class Meta:
        model = BoardToolStatus
        fields = (
            "id",
            "board",
            "market",
            "document_type",
            "weekly_status",
            "last_data_update",
            "reference_date_flags",
            "price",
            "sales_date",
            "sku_view_units",
            "updated_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "board",
            "market",
            "document_type",
            "updated_by",
            "created_at",
            "updated_at",
        )
        extra_kwargs = {
            "weekly_status": {"required": False},
            "last_data_update": {"required": False},
            "reference_date_flags": {"required": False},
            "price": {"required": False},
            "sales_date": {"required": False},
            "sku_view_units": {"required": False},
        }

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError(
                "Provide at least one editable tool-status field."
            )
        return attrs


class BoardToolStatusInitializeItemSerializer(serializers.Serializer):
    """Validate one create-only row used during central-state bootstrap."""

    market = serializers.ChoiceField(choices=BoardDocument.Market.choices)
    document_type = serializers.ChoiceField(choices=BoardDocument.DocumentType.choices)
    weekly_status = serializers.ChoiceField(
        choices=BoardToolStatus.WeeklyStatus.choices,
        required=False,
        default=BoardToolStatus.WeeklyStatus.OPEN,
    )
    last_data_update = serializers.CharField(
        max_length=80,
        required=False,
        allow_blank=True,
        default="",
    )
    reference_date_flags = serializers.CharField(
        max_length=80,
        required=False,
        allow_blank=True,
        default="",
    )
    price = serializers.CharField(
        max_length=80,
        required=False,
        allow_blank=True,
        default="",
    )
    sales_date = serializers.CharField(
        max_length=80,
        required=False,
        allow_blank=True,
        default="",
    )
    sku_view_units = serializers.CharField(
        max_length=80,
        required=False,
        allow_blank=True,
        default="",
    )