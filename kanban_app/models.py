import logging
from pathlib import Path
from uuid import uuid4

from django.db import models, transaction
from django.db.models.signals import post_delete
from django.dispatch import receiver

from auth_app.models import User


logger = logging.getLogger(__name__)


def board_document_upload_path(instance, filename):
    """Build a private, collision-resistant path for a board document."""
    suffix = Path(filename).suffix.lower()

    return (
        f"documents/board_{instance.board_id}/"
        f"{getattr(instance, 'market', 'CH')}/"
        f"{instance.document_type}/{instance.period}/"
        f"{uuid4().hex}{suffix}"
    )


def booklet_upload_path(instance, filename):
    """Compatibility alias used by historical migration 0011."""
    return board_document_upload_path(instance, filename)


# -------------------------------------------------------------------------
# Board
# -------------------------------------------------------------------------
class Board(models.Model):
    """Kanban‑Board mit Titel, Owner, Members."""
    title = models.CharField(max_length=100, help_text="The title of the board (max. 100 characters).")
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="owned_boards", help_text="The user who owns this board.")
    members = models.ManyToManyField(User, related_name="boards", help_text="Users who are members of this board.")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


# -------------------------------------------------------------------------
# Task
# -------------------------------------------------------------------------
class Task(models.Model):
    """Einzelne Karte im Board."""
    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    STATUS_CHOICES = [
        ("to-do",       "To Do"),
        ("in-progress", "In Progress"),
        ("review",      "Review"),
        ("done",        "Done"),
    ]
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="to-do")

    PRIORITY_CHOICES = [("low", "Low"), ("medium", "Medium"), ("high", "High")]
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="medium")

    assignee = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="tasks_assigned")
    reviewer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="tasks_reviewing")

    due_date   = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="created_tasks")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.board.title})"


# -------------------------------------------------------------------------
# Comment
# -------------------------------------------------------------------------
class Comment(models.Model):
    """Thread‑Kommentar zu einem Task."""
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="comments")
    text       = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        author = self.author.email if self.author else "Unknown"
        return f"Comment by {author} on task '{self.task.title}'"


# -------------------------------------------------------------------------
# Debriefing – SFL
# -------------------------------------------------------------------------
class Debriefing(models.Model):
    """Wöchentlicher SFL‑Rapport (Draft → Final → PDF)."""
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        FINAL = "FINAL", "Final"

    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name="debriefings")
    match_date   = models.DateField()
    status       = models.CharField(max_length=8, choices=Status.choices, default=Status.DRAFT)
    created_by   = models.ForeignKey(User, on_delete=models.PROTECT)
    created_at   = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    kick_off_ok = models.BooleanField(default=True)

    def __str__(self):
        return f"Debriefing {self.match_date} ({self.board.title})"


# -------------------------------------------------------------------------
# Graphics‑Rapport – NEU
# -------------------------------------------------------------------------
class GraphicsRapport(models.Model):
    """Match‑bezogener GFX‑Rapport (Draft → Final → optional PDF)."""
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        FINAL = "FINAL", "Final"

    board = models.ForeignKey(Board, on_delete=models.CASCADE, related_name="graphics_rapports")
    match_date   = models.DateField()
    status       = models.CharField(max_length=8, choices=Status.choices, default=Status.DRAFT)
    created_by   = models.ForeignKey(User, on_delete=models.PROTECT)
    created_at   = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    graphics_test_ok = models.BooleanField(default=True)

    def __str__(self):
        return f"GFX‑Rapport {self.match_date} ({self.board.title})"


# -------------------------------------------------------------------------
# KVStore – kleiner Key/Value‑Speicher (für Kits & Staff‑Listen)
# -------------------------------------------------------------------------
class KVStore(models.Model):
    """
    Sehr einfacher K/V‑Store pro Schlüssel.
    value ist JSON (dict/list/str/…).
    """
    key = models.CharField(max_length=200, unique=True)
    value = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.key


# -------------------------------------------------------------------------
# Board document library
# -------------------------------------------------------------------------
class BoardDocument(models.Model):
    """A centrally stored HTML tool edition belonging to one board."""

    class Market(models.TextChoices):
        CH = "CH", "Switzerland"
        AT = "AT", "Austria"

    class DocumentType(models.TextChoices):
        BOOKLET = "booklet", "Booklet"
        REVIEW_MODEL = "review-model", "Review Model"
        TRACKING_DASHBOARD = "tracking-dashboard", "Tracking Dashboard"
        ONLINE = "online", "Online"

    board = models.ForeignKey(
        Board,
        on_delete=models.CASCADE,
        related_name="documents",
    )
    market = models.CharField(
        max_length=2,
        choices=Market.choices,
        default=Market.CH,
    )
    document_type = models.CharField(
        max_length=50,
        choices=DocumentType.choices,
        default=DocumentType.BOOKLET,
    )
    period = models.CharField(
        max_length=7,
        help_text="Edition month in YYYY-MM format.",
    )
    sales_date = models.DateField(
        null=True,
        help_text=(
            "Data status represented by this edition. "
            "Null is reserved for documents migrated from the legacy archive."
        ),
    )
    file = models.FileField(upload_to=board_document_upload_path)
    file_name = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=100, default="text/html")
    size = models.PositiveBigIntegerField()
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="uploaded_documents",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-period", "-updated_at")
        constraints = [
            models.UniqueConstraint(
                fields=("board", "market", "document_type", "period"),
                name="unique_board_document_edition",
            )
        ]

    def __str__(self):
        return (
            f"{self.get_market_display()} · "
            f"{self.get_document_type_display()} "
            f"{self.period} ({self.board})"
        )


@receiver(post_delete, sender=BoardDocument)
def delete_board_document_file(sender, instance, **kwargs):
    """Remove the physical upload only after the database delete commits."""
    if instance.file and instance.file.name:
        storage = instance.file.storage
        file_name = instance.file.name

        def delete_committed_file():
            try:
                storage.delete(file_name)
            except Exception:
                logger.exception("Could not remove board document file %s", file_name)

        transaction.on_commit(delete_committed_file)