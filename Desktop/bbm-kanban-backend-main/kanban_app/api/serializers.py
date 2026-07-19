from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.urls import reverse
from rest_framework import serializers

from auth_app.models import User
from kanban_app.models import (
    Board,
    Booklet,
    Comment,
    Debriefing,
    GraphicsRapport,
    Task,
)


class UserSerializer(serializers.ModelSerializer):
    """Return a readable user name."""

    fullname = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "fullname",
        )

    def get_fullname(self, obj):
        return getattr(
            obj,
            "full_name",
            obj.email,
        )


class CommentSerializer(serializers.ModelSerializer):
    """Minimal comment representation."""

    author = serializers.SerializerMethodField()
    content = serializers.CharField(source="text")

    class Meta:
        model = Comment
        fields = (
            "id",
            "created_at",
            "author",
            "content",
        )

    def get_author(self, obj):
        if obj.author:
            return getattr(
                obj.author,
                "full_name",
                obj.author.email,
            )

        return "Unknown"


class TaskSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    comments = CommentSerializer(
        many=True,
        read_only=True,
    )

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

        read_only_fields = (
            "id",
            "created_by",
            "created_at",
            "comments",
        )

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


class BoardSerializer(serializers.ModelSerializer):
    members = UserSerializer(
        many=True,
        read_only=True,
    )

    tasks = TaskListSerializer(
        many=True,
        read_only=True,
    )

    owner_id = serializers.IntegerField(
        source="owner.id",
        read_only=True,
    )

    class Meta:
        model = Board

        read_only_fields = (
            "id",
            "owner_id",
            "created_at",
        )

        fields = (
            "id",
            "title",
            "owner_id",
            "members",
            "tasks",
            "created_at",
        )


class DebriefingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Debriefing
        fields = "__all__"

        read_only_fields = (
            "created_by",
            "created_at",
            "submitted_at",
        )


class GraphicsRapportSerializer(serializers.ModelSerializer):
    class Meta:
        model = GraphicsRapport
        fields = "__all__"

        read_only_fields = (
            "created_by",
            "created_at",
            "submitted_at",
        )


class BookletMetadataSerializer(serializers.ModelSerializer):
    """Metadata for a centrally stored board booklet."""

    board = serializers.IntegerField(
        source="board_id",
        read_only=True,
    )

    uploaded_by = UserSerializer(
        read_only=True,
    )

    content_url = serializers.SerializerMethodField()

    class Meta:
        model = Booklet

        fields = (
            "id",
            "board",
            "document_type",
            "period",
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
        path = reverse(
            "booklet-content",
            kwargs={"pk": obj.pk},
        )

        request = self.context.get("request")

        if request:
            return request.build_absolute_uri(path)

        return path


class BookletUploadSerializer(serializers.Serializer):
    """Validate booklet upload and replacement requests."""

    MAX_FILE_SIZE = settings.BOOKLET_MAX_UPLOAD_SIZE

    ALLOWED_EXTENSIONS = {
        ".html",
        ".htm",
    }

    ALLOWED_MIME_TYPES = {
        "text/html",
        "application/xhtml+xml",
        "application/octet-stream",
    }

    document_type = serializers.ChoiceField(
        choices=Booklet.DocumentType.choices,
    )

    period = serializers.CharField(
        max_length=7,
    )

    file = serializers.FileField(
        allow_empty_file=False,
    )

    replace = serializers.BooleanField(
        required=False,
        default=False,
    )

    def validate_period(self, value):
        try:
            parsed = datetime.strptime(
                value,
                "%Y-%m",
            )
        except (TypeError, ValueError):
            raise serializers.ValidationError(
                "Use YYYY-MM format with a valid month."
            )

        return parsed.strftime("%Y-%m")

    def validate_file(self, upload):
        file_name = Path(upload.name).name
        extension = Path(file_name).suffix.lower()

        if extension not in self.ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(
                "Only .html and .htm files are allowed."
            )

        if len(file_name) > 255:
            raise serializers.ValidationError(
                "The file name must not exceed 255 characters."
            )

        if upload.size > self.MAX_FILE_SIZE:
            raise serializers.ValidationError(
                "The booklet must not exceed 10 MB."
            )

        mime_type = (
            upload.content_type
            or ""
        ).split(";", 1)[0].lower()

        if (
            mime_type
            and mime_type not in self.ALLOWED_MIME_TYPES
        ):
            raise serializers.ValidationError(
                "The uploaded file must use an HTML MIME type."
            )

        return upload