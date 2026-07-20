from django.apps import AppConfig

class AuthAppConfig(AppConfig):
    """
    Django application configuration for the auth_app.
    """
    default_auto_field = "django.db.models.BigAutoField"
    name = "auth_app"