from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AssignedToMeTaskListView,
    BoardBookletListCreateView,
    BoardCurrentDraftView,
    BoardDetailView,
    BoardListCreateView,
    BookletContentView,
    BookletDeleteView,
    CommentDeleteView,
    CommentListCreateView,
    DebriefingViewSet,
    GraphicsRapportViewSet,
    ReviewingTaskListView,
    TaskDetailView,
    TaskListCreateView,
    kv_state,
    roster,
)


router = DefaultRouter()

router.register(
    r"debriefings",
    DebriefingViewSet,
    basename="debriefing",
)

router.register(
    r"graphics-rapports",
    GraphicsRapportViewSet,
    basename="graphics-rapport",
)


urlpatterns = [
    path(
        "boards/",
        BoardListCreateView.as_view(),
        name="board-list-create",
    ),
    path(
        "boards/<int:pk>/",
        BoardDetailView.as_view(),
        name="board-detail",
    ),
    path(
        "boards/<int:board_id>/booklets/",
        BoardBookletListCreateView.as_view(),
        name="board-booklet-list-create",
    ),
    path(
        "booklets/<int:pk>/",
        BookletDeleteView.as_view(),
        name="booklet-delete",
    ),
    path(
        "booklets/<int:pk>/content/",
        BookletContentView.as_view(),
        name="booklet-content",
    ),
    path(
        "boards/<int:pk>/current-draft/",
        BoardCurrentDraftView.as_view(),
        name="board-current-draft",
    ),
    path(
        "tasks/",
        TaskListCreateView.as_view(),
        name="task-list-create",
    ),
    path(
        "tasks/<int:pk>/",
        TaskDetailView.as_view(),
        name="task-detail",
    ),
    path(
        "tasks/assigned-to-me/",
        AssignedToMeTaskListView.as_view(),
        name="tasks-assigned-to-me",
    ),
    path(
        "tasks/reviewing/",
        ReviewingTaskListView.as_view(),
        name="tasks-reviewing",
    ),
    path(
        "tasks/<int:task_id>/comments/",
        CommentListCreateView.as_view(),
        name="comment-list-create",
    ),
    path(
        "tasks/<int:task_id>/comments/<int:pk>/",
        CommentDeleteView.as_view(),
        name="comment-delete",
    ),
    path(
        "kv/<str:key>/",
        kv_state,
        name="kv_state",
    ),
    path(
        "roster",
        roster,
        name="roster",
    ),
    path("", include(router.urls)),
]