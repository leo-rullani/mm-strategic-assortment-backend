# kanban_app/api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    # Boards
    BoardListCreateView,
    BoardDetailView,
    BoardCurrentDraftView,
    BoardDocumentListCreateView,
    DocumentContentView,
    DocumentDeleteView,
    LegacyBoardBookletListCreateView,
    # Tasks
    TaskListCreateView,
    TaskDetailView,
    # Comments
    CommentListCreateView,
    CommentDeleteView,
    # User-bezogene Task-Filter
    AssignedToMeTaskListView,
    ReviewingTaskListView,
    # Debriefing & Graphics
    DebriefingViewSet,
    GraphicsRapportViewSet,
    # KV + Roster
    kv_state,
    roster,
)

router = DefaultRouter()
router.register(r"debriefings",       DebriefingViewSet,      basename="debriefing")
router.register(r"graphics-rapports", GraphicsRapportViewSet, basename="graphics-rapport")

urlpatterns = [
    # Boards
    path("boards/",          BoardListCreateView.as_view(), name="board-list-create"),
    path("boards/<int:pk>/", BoardDetailView.as_view(),     name="board-detail"),

    # Central CH/AT archive for all four HTML tools
    path(
        "boards/<int:board_id>/documents/",
        BoardDocumentListCreateView.as_view(),
        name="board-document-list-create",
    ),
    path(
        "documents/<int:pk>/",
        DocumentDeleteView.as_view(),
        name="document-delete",
    ),
    path(
        "documents/<int:pk>/content/",
        DocumentContentView.as_view(),
        name="document-content",
    ),

    # Legacy booklet paths remain readable during the frontend transition.
    path(
        "boards/<int:board_id>/booklets/",
        LegacyBoardBookletListCreateView.as_view(),
        name="board-booklet-list-create",
    ),
    path(
        "booklets/<int:pk>/",
        DocumentDeleteView.as_view(),
        name="booklet-delete",
    ),
    path(
        "booklets/<int:pk>/content/",
        DocumentContentView.as_view(),
        name="booklet-content",
    ),

    # Offener Tages-Draft
    path("boards/<int:pk>/current-draft/", BoardCurrentDraftView.as_view(),
         name="board-current-draft"),

    # Tasks
    path("tasks/",            TaskListCreateView.as_view(), name="task-list-create"),
    path("tasks/<int:pk>/",   TaskDetailView.as_view(),     name="task-detail"),
    path("tasks/assigned-to-me/", AssignedToMeTaskListView.as_view(), name="tasks-assigned-to-me"),
    path("tasks/reviewing/",     ReviewingTaskListView.as_view(),     name="tasks-reviewing"),

    # Comments
    path("tasks/<int:task_id>/comments/",           CommentListCreateView.as_view(), name="comment-list-create"),
    path("tasks/<int:task_id>/comments/<int:pk>/",  CommentDeleteView.as_view(),     name="comment-delete"),

    # KV Store (Serverpersistenz)
    path("kv/<str:key>/", kv_state, name="kv_state"),

    # Roster (für Staff & Player Pics)
    path("roster", roster, name="roster"),  # bewusst ohne trailing slash: /api/roster?club=...
    
    # Router-basiert
    path("", include(router.urls)),
]