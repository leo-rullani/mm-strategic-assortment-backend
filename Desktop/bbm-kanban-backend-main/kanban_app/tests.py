"""API and file-lifecycle tests for the shared board document library."""

import tempfile
from pathlib import Path

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import transaction
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from auth_app.models import User
from kanban_app.models import Board, BoardDocument


OMIT = object()


class BoardDocumentAPITests(APITestCase):
    """Cover the authenticated, board-scoped CH/AT document archive."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._media_directory = tempfile.TemporaryDirectory()
        cls._media_override = override_settings(
            MEDIA_ROOT=cls._media_directory.name,
        )
        cls._media_override.enable()

    @classmethod
    def tearDownClass(cls):
        cls._media_override.disable()
        cls._media_directory.cleanup()
        super().tearDownClass()

    def setUp(self):
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="safe-password-123",
            full_name="Board Owner",
        )
        self.member = User.objects.create_user(
            email="member@example.com",
            password="safe-password-123",
            full_name="Board Member",
        )
        self.outsider = User.objects.create_user(
            email="outsider@example.com",
            password="safe-password-123",
            full_name="Outside User",
        )
        self.superuser = User.objects.create_superuser(
            email="admin@example.com",
            password="safe-password-123",
        )
        self.board = Board.objects.create(
            title="Strategic Assortment",
            owner=self.owner,
        )
        self.board.members.add(self.member)
        self.list_url = reverse(
            "board-document-list-create",
            kwargs={"board_id": self.board.pk},
        )

    def authenticate(self, user):
        """Authenticate the API client without coupling tests to token setup."""
        self.client.force_authenticate(user=user)

    def html_upload(self, name="document.html", body=None, mime="text/html"):
        """Return a fresh in-memory HTML upload."""
        content = body or b"<!doctype html><html><body>Edition</body></html>"
        return SimpleUploadedFile(name, content, content_type=mime)

    def upload(self, user=None, **overrides):
        """Upload one document using the canonical frontend contract."""
        self.authenticate(user or self.owner)
        payload = {
            "market": "CH",
            "document_type": "booklet",
            "period": "2026-07",
            "sales_date": "2026-07-18",
            "file": self.html_upload(),
        }
        payload.update(overrides)
        payload = {
            key: value
            for key, value in payload.items()
            if value is not OMIT
        }
        return self.client.post(
            self.list_url,
            payload,
            format="multipart",
        )

    def create_document(self, **overrides):
        """Create and return a persisted document through the public API."""
        response = self.upload(**overrides)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return BoardDocument.objects.get(pk=response.data["id"])

    def test_authentication_is_required_for_list_and_upload(self):
        get_response = self.client.get(self.list_url)
        post_response = self.client.post(
            self.list_url,
            {
                "market": "CH",
                "document_type": "booklet",
                "period": "2026-07",
                "sales_date": "2026-07-18",
                "file": self.html_upload(),
            },
            format="multipart",
        )

        for response in (get_response, post_response):
            self.assertIn(
                response.status_code,
                (
                    status.HTTP_401_UNAUTHORIZED,
                    status.HTTP_403_FORBIDDEN,
                ),
            )
        self.assertEqual(BoardDocument.objects.count(), 0)

    def test_owner_member_and_superuser_can_list_but_outsider_cannot(self):
        self.create_document()

        for user in (self.owner, self.member, self.superuser):
            with self.subTest(user=user.email):
                self.authenticate(user)
                response = self.client.get(self.list_url)
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(len(response.data), 1)

        self.authenticate(self.outsider)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_member_can_upload_but_outsider_cannot(self):
        member_response = self.upload(user=self.member)

        self.assertEqual(member_response.status_code, status.HTTP_201_CREATED)
        document = BoardDocument.objects.get(pk=member_response.data["id"])
        self.assertEqual(document.uploaded_by, self.member)

        outsider_response = self.upload(
            user=self.outsider,
            period="2026-08",
        )

        self.assertEqual(outsider_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(BoardDocument.objects.count(), 1)

    def test_all_four_document_types_are_independent_for_ch_and_at(self):
        document_types = (
            "booklet",
            "review-model",
            "tracking-dashboard",
            "online",
        )

        for market in ("CH", "AT"):
            for document_type in document_types:
                with self.subTest(market=market, document_type=document_type):
                    response = self.upload(
                        market=market,
                        document_type=document_type,
                        file=self.html_upload(
                            name=f"{market.lower()}-{document_type}.html",
                        ),
                    )
                    self.assertEqual(
                        response.status_code,
                        status.HTTP_201_CREATED,
                    )

        self.authenticate(self.owner)
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 8)
        self.assertEqual(
            {
                (item["market"], item["document_type"])
                for item in response.data
            },
            {
                (market, document_type)
                for market in ("CH", "AT")
                for document_type in document_types
            },
        )

        filtered = self.client.get(
            self.list_url,
            {
                "market": "AT",
                "document_type": "review-model",
            },
        )

        self.assertEqual(filtered.status_code, status.HTTP_200_OK)
        self.assertEqual(len(filtered.data), 1)
        self.assertEqual(filtered.data[0]["market"], "AT")
        self.assertEqual(filtered.data[0]["document_type"], "review-model")

    def test_legacy_booklet_list_is_limited_to_ch_booklets(self):
        self.create_document()
        self.create_document(market="AT", period="2026-08")
        self.create_document(document_type="online", period="2026-09")
        self.authenticate(self.owner)

        response = self.client.get(
            reverse(
                "board-booklet-list-create",
                kwargs={"board_id": self.board.pk},
            )
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["market"], "CH")
        self.assertEqual(response.data[0]["document_type"], "booklet")

    def test_upload_returns_complete_snake_case_metadata(self):
        response = self.upload(
            market="AT",
            document_type="tracking-dashboard",
            sales_date="2026-07-19",
            file=self.html_upload(name="July tracking.htm"),
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            set(response.data),
            {
                "id",
                "board",
                "market",
                "document_type",
                "period",
                "sales_date",
                "file_name",
                "mime_type",
                "size",
                "uploaded_by",
                "created_at",
                "updated_at",
                "content_url",
            },
        )
        self.assertEqual(response.data["board"], self.board.pk)
        self.assertEqual(response.data["market"], "AT")
        self.assertEqual(response.data["document_type"], "tracking-dashboard")
        self.assertEqual(response.data["period"], "2026-07")
        self.assertEqual(response.data["sales_date"], "2026-07-19")
        self.assertEqual(response.data["file_name"], "July tracking.htm")
        self.assertEqual(response.data["mime_type"], "text/html")
        self.assertEqual(response.data["uploaded_by"]["id"], self.owner.pk)
        self.assertTrue(response.data["content_url"].endswith("/content/"))

        document = BoardDocument.objects.get(pk=response.data["id"])
        self.assertTrue(document.file.storage.exists(document.file.name))

    def test_sales_date_is_required_and_must_be_valid(self):
        missing = self.upload(sales_date=OMIT)
        invalid = self.upload(sales_date="19.07.2026")
        empty = self.upload(sales_date="")

        for response in (missing, invalid, empty):
            with self.subTest(response=response.data):
                self.assertEqual(
                    response.status_code,
                    status.HTTP_400_BAD_REQUEST,
                )
                self.assertIn("sales_date", response.data)

        self.assertEqual(BoardDocument.objects.count(), 0)

    def test_upload_rejects_invalid_extension_mime_and_oversize_file(self):
        max_size = settings.DOCUMENT_MAX_UPLOAD_SIZE
        cases = (
            (
                "extension",
                self.html_upload(name="document.pdf"),
            ),
            (
                "mime",
                self.html_upload(
                    name="document.html",
                    mime="application/pdf",
                ),
            ),
            (
                "size",
                self.html_upload(body=b"x" * (max_size + 1)),
            ),
        )

        for label, upload in cases:
            with self.subTest(case=label):
                response = self.upload(file=upload)
                self.assertEqual(
                    response.status_code,
                    status.HTTP_400_BAD_REQUEST,
                )
                self.assertIn("file", response.data)

        self.assertEqual(BoardDocument.objects.count(), 0)

    def test_upload_rejects_invalid_market_type_and_period(self):
        cases = (
            ("market", {"market": "DE"}),
            ("document_type", {"document_type": "spreadsheet"}),
            ("period", {"period": "2026-13"}),
        )

        for expected_field, overrides in cases:
            with self.subTest(field=expected_field):
                response = self.upload(**overrides)
                self.assertEqual(
                    response.status_code,
                    status.HTTP_400_BAD_REQUEST,
                )
                self.assertIn(expected_field, response.data)

        self.assertEqual(BoardDocument.objects.count(), 0)

    def test_existing_edition_returns_409_without_explicit_replace(self):
        document = self.create_document(
            file=self.html_upload(name="existing.html"),
        )
        original_file_name = document.file.name

        response = self.upload(
            user=self.member,
            sales_date="2026-07-19",
            file=self.html_upload(name="unconfirmed.html"),
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["code"], "document_exists")
        document.refresh_from_db()
        self.assertEqual(document.file.name, original_file_name)
        self.assertEqual(document.file_name, "existing.html")
        self.assertEqual(BoardDocument.objects.count(), 1)

    def test_explicit_replace_updates_metadata_and_removes_previous_file(self):
        first_response = self.upload(
            sales_date="2026-07-17",
            file=self.html_upload(
                name="first.html",
                body=b"<!doctype html><html><body>First</body></html>",
            ),
        )
        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
        document = BoardDocument.objects.get(pk=first_response.data["id"])
        old_file_path = Path(document.file.path)
        original_created_at = document.created_at
        self.assertTrue(old_file_path.exists())

        with self.captureOnCommitCallbacks(execute=True):
            second_response = self.upload(
                user=self.member,
                replace=True,
                sales_date="2026-07-19",
                file=self.html_upload(
                    name="replacement.html",
                    body=(
                        b"<!doctype html><html><body>Replacement</body></html>"
                    ),
                ),
            )

        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.data["id"], first_response.data["id"])
        self.assertEqual(BoardDocument.objects.count(), 1)
        document.refresh_from_db()
        self.assertEqual(document.created_at, original_created_at)
        self.assertEqual(document.sales_date.isoformat(), "2026-07-19")
        self.assertEqual(document.file_name, "replacement.html")
        self.assertEqual(document.uploaded_by, self.member)
        self.assertFalse(old_file_path.exists())
        self.assertTrue(Path(document.file.path).exists())

    def test_content_endpoint_is_authenticated_and_board_scoped(self):
        expected = b"<!doctype html><html><body>Protected</body></html>"
        document = self.create_document(
            file=self.html_upload(name="protected.html", body=expected),
        )
        content_url = reverse(
            "document-content",
            kwargs={"pk": document.pk},
        )

        for user in (self.owner, self.member, self.superuser):
            with self.subTest(user=user.email):
                self.authenticate(user)
                response = self.client.get(content_url)
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(b"".join(response.streaming_content), expected)
                self.assertEqual(response["X-Content-Type-Options"], "nosniff")
                self.assertEqual(response["Cache-Control"], "private, no-store")
                self.assertIn("protected.html", response["Content-Disposition"])

        self.authenticate(self.outsider)
        forbidden = self.client.get(content_url)
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=None)
        anonymous = self.client.get(content_url)
        self.assertIn(
            anonymous.status_code,
            (
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_403_FORBIDDEN,
            ),
        )

    def test_content_endpoint_returns_404_when_physical_file_is_missing(self):
        document = self.create_document()
        document.file.storage.delete(document.file.name)
        self.authenticate(self.owner)

        response = self.client.get(
            reverse("document-content", kwargs={"pk": document.pk}),
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_member_can_delete_and_physical_file_is_removed(self):
        document = self.create_document()
        file_path = Path(document.file.path)
        delete_url = reverse("document-delete", kwargs={"pk": document.pk})
        self.authenticate(self.member)

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.delete(delete_url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(BoardDocument.objects.filter(pk=document.pk).exists())
        self.assertFalse(file_path.exists())

    def test_outsider_cannot_delete_or_remove_physical_file(self):
        document = self.create_document()
        file_path = Path(document.file.path)
        self.authenticate(self.outsider)

        response = self.client.delete(
            reverse("document-delete", kwargs={"pk": document.pk}),
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(BoardDocument.objects.filter(pk=document.pk).exists())
        self.assertTrue(file_path.exists())

    def test_board_cascade_removes_document_file(self):
        document = self.create_document()
        file_path = Path(document.file.path)

        with self.captureOnCommitCallbacks(execute=True):
            self.board.delete()

        self.assertFalse(BoardDocument.objects.filter(pk=document.pk).exists())
        self.assertFalse(file_path.exists())

    def test_transaction_rollback_keeps_document_and_file(self):
        document = self.create_document()
        document_id = document.pk
        file_path = Path(document.file.path)

        with self.assertRaises(RuntimeError):
            with transaction.atomic():
                document.delete()
                raise RuntimeError("force rollback")

        self.assertTrue(BoardDocument.objects.filter(pk=document_id).exists())
        self.assertTrue(file_path.exists())