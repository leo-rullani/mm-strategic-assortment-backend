import logging
from pathlib import Path
from uuid import uuid4

from django.db import models, transaction
from django.db.models.signals import post_delete
from django.dispatch import receiver

from auth_app.models import User


logger = logging.getLogger(__name__)


def booklet_upload_path(instance, filename):
    """Build a private, collision-resistant path for a booklet."""
    suffix = Path(filename).suffix.lower()

    return (
        f"booklets/board_{instance.board_id}/"
        f"{instance.document_type}/{instance.period}/"
        f"{uuid4().hex}{suffix}"
    )


class Board(models.Model):
    """Kanban board with title, owner and members."""

    title = models.CharField(
        max_length=100,
        help_text="The title of the board (max. 100 characters).",
    )

    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="owned_boards",
        help_text="The user who owns this board.",
    )

    members = models.ManyToManyField(
        User,
        related_name="boards",
        help_text="Users who are members of this board.",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class Task(models.Model):
    """A single task on a board."""

    board = models.ForeignKey(
        Board,
        on_delete=models.CASCADE,
        related_name="tasks",
    )

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    STATUS_CHOICES = [
        ("to-do", "To Do"),
        ("in-progress", "In Progress"),
        ("review", "Review"),
        ("done", "Done"),
    ]

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="to-do",
    )

    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
    ]

    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default="medium",
    )

    assignee = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tasks_assigned",
    )

    reviewer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tasks_reviewing",
    )

    due_date = models.DateField(
        null=True,
        blank=True,
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_tasks",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    def __str__(self):
        return f"{self.title} ({self.board.title})"


class Comment(models.Model):
    """Comment thread entry belonging to a task."""

    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="comments",
    )

    author = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="comments",
    )

    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        author = self.author.email if self.author else "Unknown"
        return f"Comment by {author} on task '{self.task.title}'"


class Debriefing(models.Model):
    """Weekly SFL report."""

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        FINAL = "FINAL", "Final"

    board = models.ForeignKey(
        Board,
        on_delete=models.CASCADE,
        related_name="debriefings",
    )

    match_date = models.DateField()

    status = models.CharField(
        max_length=8,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    submitted_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    kick_off_ok = models.BooleanField(default=True)

    def __str__(self):
        return (
            f"Debriefing {self.match_date} "
            f"({self.board.title})"
        )


class GraphicsRapport(models.Model):
    """Match-related graphics report."""

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        FINAL = "FINAL", "Final"

    board = models.ForeignKey(
        Board,
        on_delete=models.CASCADE,
        related_name="graphics_rapports",
    )

    match_date = models.DateField()

    status = models.CharField(
        max_length=8,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    submitted_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    graphics_test_ok = models.BooleanField(
        default=True,
    )

    def __str__(self):
        return (
            f"GFX-Rapport {self.match_date} "
            f"({self.board.title})"
        )


class KVStore(models.Model):
    """Simple server-side JSON key/value store."""

    key = models.CharField(
        max_length=200,
        unique=True,
    )

    value = models.JSONField(
        default=dict,
        blank=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    def __str__(self):
        return self.key


class Booklet(models.Model):
    """A centrally stored HTML booklet belonging to one board."""

    class DocumentType(models.TextChoices):
        STRATEGIC_ASSORTMENT = (
            "strategic-assortment",
            "Strategic Assortment",
        )

    board = models.ForeignKey(
        Board,
        on_delete=models.CASCADE,
        related_name="booklets",
    )

    document_type = models.CharField(
        max_length=50,
        choices=DocumentType.choices,
        default=DocumentType.STRATEGIC_ASSORTMENT,
    )

    period = models.CharField(
        max_length=7,
        help_text="Edition month in YYYY-MM format.",
    )

    file = models.FileField(
        upload_to=booklet_upload_path,
    )

    file_name = models.CharField(max_length=255)

    mime_type = models.CharField(
        max_length=100,
        default="text/html",
    )

    size = models.PositiveBigIntegerField()

    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="uploaded_booklets",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = (
            "-period",
            "-updated_at",
        )

        constraints = [
            models.UniqueConstraint(
                fields=(
                    "board",
                    "document_type",
                    "period",
                ),
                name="unique_booklet_edition_per_board",
            )
        ]

    def __str__(self):
        return (
            f"{self.get_document_type_display()} "
            f"{self.period} ({self.board})"
        )


@receiver(post_delete, sender=Booklet)
def delete_booklet_file(sender, instance, **kwargs):
    """Remove the physical upload after database deletion commits."""
    if instance.file and instance.file.name:
        storage = instance.file.storage
        file_name = instance.file.name

        def delete_committed_file():
            try:
                storage.delete(file_name)
            except Exception:
                logger.exception(
                    "Could not remove booklet file %s",
                    file_name,
                )

        transaction.on_commit(delete_committed_file)