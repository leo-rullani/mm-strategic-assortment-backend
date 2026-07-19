# kanban_app/api/sfl_urls.py
from django.urls import path
from .sfl import roster_by_club, sfl_squad_by_slug

urlpatterns = [
    # /api/roster?club=fcb
    path("roster", roster_by_club, name="api_roster_by_club"),
    # /api/sfl/squad/fc-basel-1893/
    path("sfl/squad/<slug:slug>/", sfl_squad_by_slug, name="api_sfl_squad_by_slug"),
]