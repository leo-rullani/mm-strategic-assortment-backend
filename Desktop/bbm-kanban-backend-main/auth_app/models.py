from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models


class UserManager(BaseUserManager):
    """Create users whose email address is their login identifier."""

    @staticmethod
    def _normalize_email(email: str) -> str:
        """Normalise surrounding whitespace and email casing consistently."""
        return BaseUserManager.normalize_email(email.strip()).lower()

    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular user."""
        if not email:
            raise ValueError("The email address must be set.")

        email = self._normalize_email(email)
        user = self.model(email=email, **extra_fields)

        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()

        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a superuser after validating privilege flags."""
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("A superuser must have is_staff=True.")

        if extra_fields.get("is_superuser") is not True:
            raise ValueError("A superuser must have is_superuser=True.")

        if not password:
            raise ValueError("A superuser password must be set.")

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Application user authenticated by a unique email address."""

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    def get_full_name(self):
        """Return the display name used by Django and API clients."""
        return self.full_name or self.email

    def get_short_name(self):
        """Return a compact display name for Django admin integrations."""
        return self.full_name.split()[0] if self.full_name else self.email

    def __str__(self):
        """Return the user's email as its stable string representation."""
        return self.email