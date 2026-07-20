"""Authentication API views used by the frontend."""

from __future__ import annotations

from django.contrib.auth import authenticate, get_user_model
from rest_framework import status
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import UserSerializer


User = get_user_model()


def _user_payload(user) -> dict:
    """Return the naming aliases expected by existing frontend clients."""
    full_name = user.get_full_name()

    return {
        "user_id": user.id,
        "email": user.email,
        "fullname": full_name,
        "full_name": full_name,
        "name": full_name,
    }


def _try_auth(request, identifier: str, password: str):
    """Authenticate an email address case-insensitively."""
    candidate = (
        User.objects
        .filter(email__iexact=identifier)
        .only("email")
        .first()
    )

    canonical_email = candidate.email if candidate else identifier

    user = authenticate(
        request,
        email=canonical_email,
        password=password,
    )

    if user is not None:
        return user

    return authenticate(
        request,
        username=canonical_email,
        password=password,
    )


class RegistrationView(APIView):
    """Create a user account without logging the new user in."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Signup creates no token. The user must log in afterwards.
        payload = _user_payload(user)
        payload["detail"] = (
            "Registration successful. You can now log in."
        )

        return Response(
            payload,
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """Authenticate an account and return its DRF token."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = (
            request.data.get("email")
            or request.data.get("username")
            or ""
        ).strip()

        password = request.data.get("password") or ""

        if not identifier or not password:
            return Response(
                {
                    "detail": (
                        "Email and password are required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = _try_auth(
            request,
            identifier,
            password,
        )

        if user is None:
            return Response(
                {"detail": "Invalid credentials."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token, _ = Token.objects.get_or_create(user=user)

        payload = _user_payload(user)
        payload["token"] = token.key

        return Response(
            payload,
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    """Revoke the token used for the authenticated request."""

    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(
            key=request.auth.key,
        ).delete()

        return Response(
            {"detail": "Logout successful."},
            status=status.HTTP_200_OK,
        )


class EmailCheckView(APIView):
    """Resolve a registered user by email for board invitations."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        email = (
            request.query_params.get("email")
            or ""
        ).strip()

        if not email:
            return Response(
                {
                    "detail": (
                        "Email query parameter is required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(
            email__iexact=email,
        ).first()

        if user is None:
            return Response(
                {"detail": "Email not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        payload = _user_payload(user)
        payload["id"] = payload.pop("user_id")

        return Response(
            payload,
            status=status.HTTP_200_OK,
        )