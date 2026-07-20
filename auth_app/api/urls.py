from django.urls import path

from .views import (
    EmailCheckView,
    LoginView,
    LogoutView,
    RegistrationView,
)


urlpatterns = [
    path(
        "registration/",
        RegistrationView.as_view(),
        name="registration",
    ),
    path(
        "login/",
        LoginView.as_view(),
        name="login",
    ),
    path(
        "logout/",
        LogoutView.as_view(),
        name="logout",
    ),
    path(
        "email-check/",
        EmailCheckView.as_view(),
        name="email-check",
    ),
]