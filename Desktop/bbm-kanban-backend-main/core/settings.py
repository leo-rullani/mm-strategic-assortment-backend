"""Django settings for the MM Strategic Assortment backend.

Production secrets and deployment-specific values are read from environment
variables. The defaults intentionally support local development only.
"""

from __future__ import annotations

import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured


BASE_DIR = Path(__file__).resolve().parent.parent


def env_bool(name: str, default: bool = False) -> bool:
    """Read a boolean environment variable."""
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: list[str] | tuple[str, ...] = ()) -> list[str]:
    """Read a comma-separated environment variable as a clean list."""
    raw_value = os.getenv(name)
    if raw_value is None:
        return list(default)
    return [item.strip() for item in raw_value.split(",") if item.strip()]


DEBUG = env_bool("DJANGO_DEBUG", True)

SECRET_KEY = (os.getenv("DJANGO_SECRET_KEY") or os.getenv("SECRET_KEY") or "").strip()
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured(
            "DJANGO_SECRET_KEY must be set when DJANGO_DEBUG is false."
        )
    SECRET_KEY = "django-insecure-local-development-only-change-me"

ALLOWED_HOSTS = env_list(
    "DJANGO_ALLOWED_HOSTS",
    (
        "localhost",
        "127.0.0.1",
        "[::1]",
        "leorullani.com",
        "www.leorullani.com",
        "kanban.leorullani.com.w020313e.kasserver.com",
        "91.99.137.136",
    ),
)


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    "django_extensions",
    "auth_app",
    "kanban_app",
]

AUTH_USER_MODEL = "auth_app.User"


MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = env_list(
    "DJANGO_CORS_ALLOWED_ORIGINS",
    (
        "http://localhost",
        "http://127.0.0.1",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://leorullani.com",
        "https://www.leorullani.com",
        "https://kanban.leorullani.com.w020313e.kasserver.com",
    ),
)
CORS_ALLOW_CREDENTIALS = False

CSRF_TRUSTED_ORIGINS = env_list(
    "DJANGO_CSRF_TRUSTED_ORIGINS",
    (
        "https://leorullani.com",
        "https://www.leorullani.com",
        "https://kanban.leorullani.com.w020313e.kasserver.com",
    ),
)


TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

ROOT_URLCONF = "core.urls"
WSGI_APPLICATION = "core.wsgi.application"


DATABASES = {
    "default": {
        "ENGINE": os.getenv("DJANGO_DB_ENGINE", "django.db.backends.sqlite3"),
        "NAME": os.getenv("DJANGO_DB_NAME", str(BASE_DIR / "db.sqlite3")),
    }
}


AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "UserAttributeSimilarityValidator"
        )
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "MinimumLengthValidator"
        )
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "CommonPasswordValidator"
        )
    },
    {
        "NAME": (
            "django.contrib.auth.password_validation."
            "NumericPasswordValidator"
        )
    },
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Europe/Zurich"
USE_I18N = True
USE_TZ = True


STATIC_URL = "/static/"
STATIC_ROOT = Path(
    os.getenv("DJANGO_STATIC_ROOT", str(BASE_DIR / "staticfiles"))
)

_frontend_asset_candidates = (
    BASE_DIR / "frontend" / "assets",
    BASE_DIR.parent / "bbm_kanban-frontend-main" / "assets",
)

STATICFILES_DIRS = [
    path
    for path in _frontend_asset_candidates
    if path.is_dir()
]

MEDIA_URL = "/media/"
MEDIA_ROOT = Path(
    os.getenv("DJANGO_MEDIA_ROOT", str(BASE_DIR / "media"))
)

BOOKLET_MAX_UPLOAD_SIZE = 10 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = BOOKLET_MAX_UPLOAD_SIZE
DATA_UPLOAD_MAX_MEMORY_SIZE = BOOKLET_MAX_UPLOAD_SIZE + (1024 * 1024)


REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}


EMAIL_BACKEND = os.getenv(
    "DJANGO_EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend",
)

EMAIL_HOST = os.getenv("DJANGO_EMAIL_HOST") or os.getenv(
    "EMAIL_HOST",
    "",
)

EMAIL_PORT = int(
    os.getenv("DJANGO_EMAIL_PORT")
    or os.getenv("EMAIL_PORT", "587")
)

EMAIL_HOST_USER = (
    os.getenv("DJANGO_EMAIL_HOST_USER")
    or os.getenv("EMAIL_HOST_USER", "")
)

EMAIL_HOST_PASSWORD = (
    os.getenv("DJANGO_EMAIL_HOST_PASSWORD")
    or os.getenv("EMAIL_HOST_PASSWORD", "")
)

EMAIL_USE_TLS = env_bool("DJANGO_EMAIL_USE_TLS", True)
EMAIL_USE_SSL = env_bool("DJANGO_EMAIL_USE_SSL", False)

if EMAIL_USE_TLS and EMAIL_USE_SSL:
    raise ImproperlyConfigured(
        "DJANGO_EMAIL_USE_TLS and DJANGO_EMAIL_USE_SSL cannot both be true."
    )

EMAIL_TIMEOUT = int(os.getenv("DJANGO_EMAIL_TIMEOUT", "10"))

DEFAULT_FROM_EMAIL = os.getenv(
    "DJANGO_DEFAULT_FROM_EMAIL",
    EMAIL_HOST_USER or "rullanil@mediamarkt.ch",
)


SECURE_CONTENT_TYPE_NOSNIFF = True
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_SSL_REDIRECT = env_bool(
    "DJANGO_SECURE_SSL_REDIRECT",
    not DEBUG,
)

SECURE_HSTS_SECONDS = int(
    os.getenv(
        "DJANGO_SECURE_HSTS_SECONDS",
        "31536000" if not DEBUG else "0",
    )
)

SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"