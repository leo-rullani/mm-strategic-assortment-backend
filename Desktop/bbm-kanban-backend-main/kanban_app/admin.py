# kanban_app/admin.py
from django.contrib import admin
from .models import Board, Task, Comment, Debriefing, GraphicsRapport, KVStore

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