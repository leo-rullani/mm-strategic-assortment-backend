"""Root URL configuration for the backend API."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.shortcuts import redirect
from django.urls import include, path


def redirect_to_api(request):
    """Send the project root to the primary API collection."""
    return redirect("/api/boards/")


urlpatterns = [
    path("", redirect_to_api, name="api-root-redirect"),
    path("admin/", admin.site.urls),
    path("api/", include("auth_app.api.urls")),
    path("api/", include("kanban_app.api.urls")),
]

if settings.DEBUG:
    # Uploaded booklets are private. They are deliberately not exposed below
    # MEDIA_URL, even in development; the authenticated content endpoint is
    # the only supported delivery path.
    urlpatterns += static(
        settings.STATIC_URL,
        document_root=settings.STATIC_ROOT,
    )