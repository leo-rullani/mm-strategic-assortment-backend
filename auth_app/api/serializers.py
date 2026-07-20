"""Serializers for the public authentication endpoints."""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers


User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Validate and create a user account without exposing its password."""

    fullname = serializers.CharField(
        source="full_name",
        required=True,
        allow_blank=False,
        max_length=150,
    )

    password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=8,
        trim_whitespace=False,
        style={"input_type": "password"},
    )

    repeated_password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=8,
        trim_whitespace=False,
        style={"input_type": "password"},
    )

    class Meta:
        model = User
        fields = (
            "id",
            "fullname",
            "email",
            "password",
            "repeated_password",
            "date_joined",
            "is_active",
        )
        read_only_fields = (
            "id",
            "date_joined",
            "is_active",
        )

    def validate_fullname(self, value: str) -> str:
        """Trim and collapse accidental repeated whitespace."""
        normalized = " ".join(value.split())

        if not normalized:
            raise serializers.ValidationError(
                "Full name is required."
            )

        return normalized

    def validate_email(self, value: str) -> str:
        """Store emails consistently and reject duplicates."""
        normalized = User.objects._normalize_email(value)
        existing = User.objects.filter(email__iexact=normalized)

        if self.instance is not None:
            existing = existing.exclude(pk=self.instance.pk)

        if existing.exists():
            raise serializers.ValidationError(
                "A user with this email address already exists."
            )

        return normalized

    def validate(self, attrs):
        """Confirm both passwords and run Django password validators."""
        password = attrs.get("password", "")
        repeated_password = attrs.get("repeated_password", "")

        if password != repeated_password:
            raise serializers.ValidationError(
                {
                    "repeated_password": [
                        "Passwords do not match."
                    ]
                }
            )

        candidate = User(
            email=attrs.get("email", ""),
            full_name=attrs.get("full_name", ""),
        )

        try:
            validate_password(password, user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(
                {"password": list(exc.messages)}
            ) from exc

        return attrs

    def create(self, validated_data):
        """Delegate password hashing to UserManager."""
        validated_data.pop("repeated_password")
        password = validated_data.pop("password")

        return User.objects.create_user(
            password=password,
            **validated_data,
        )