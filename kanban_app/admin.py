# kanban_app/admin.py
from django.contrib import admin
from .models import (
    Board,
    BoardDocument,
    Comment,
    Debriefing,
    GraphicsRapport,
    KVStore,
    Task,
)

@admin.register(Board)
class BoardAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "owner", "created_at")
    search_fields = ("title", "owner__email")

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "board", "status", "priority", "assignee", "reviewer")
    list_filter  = ("status", "priority", "board")

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("id", "task", "author", "created_at")

@admin.register(Debriefing)
class DebriefingAdmin(admin.ModelAdmin):
    list_display = ("id", "board", "match_date", "status", "created_by", "created_at")

@admin.register(GraphicsRapport)
class GraphicsRapportAdmin(admin.ModelAdmin):
    list_display = ("id", "board", "match_date", "status", "created_by", "created_at")

@admin.register(KVStore)
class KVStoreAdmin(admin.ModelAdmin):
    list_display = ("key", "updated_at")
    search_fields = ("key",)


@admin.register(BoardDocument)
class BoardDocumentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "board",
        "market",
        "document_type",
        "period",
        "sales_date",
        "file_name",
        "size",
        "uploaded_by",
        "updated_at",
    )
    list_filter = ("market", "document_type", "period", "board")
    search_fields = ("file_name", "board__title", "uploaded_by__email")
    readonly_fields = (
        "file",
        "file_name",
        "mime_type",
        "size",
        "uploaded_by",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request):
        """Keep uploads on the validated API path with its file lifecycle."""
        return False