"""Tests for auth utilities — password hashing and JWT tokens."""
import uuid
from datetime import timedelta

from app.utils.auth import (
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.config import settings
from jose import jwt


class TestPasswordHashing:
    def test_hash_and_verify(self):
        password = "my-secure-password"
        hashed = get_password_hash(password)
        assert hashed != password
        assert verify_password(password, hashed)

    def test_wrong_password_fails(self):
        hashed = get_password_hash("correct-password")
        assert not verify_password("wrong-password", hashed)

    def test_different_hashes_for_same_password(self):
        """bcrypt uses random salt, so hashes should differ."""
        h1 = get_password_hash("same-password")
        h2 = get_password_hash("same-password")
        assert h1 != h2
        # But both should verify
        assert verify_password("same-password", h1)
        assert verify_password("same-password", h2)


class TestJWT:
    def test_create_and_decode_token(self):
        user_id = str(uuid.uuid4())
        token = create_access_token(data={"sub": user_id})
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        assert payload["sub"] == user_id
        assert "exp" in payload

    def test_token_with_custom_expiry(self):
        token = create_access_token(
            data={"sub": "test-user"},
            expires_delta=timedelta(hours=1),
        )
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        assert payload["sub"] == "test-user"

    def test_invalid_token_raises(self):
        import pytest
        with pytest.raises(Exception):
            jwt.decode("invalid.token.here", settings.secret_key, algorithms=[settings.algorithm])

    def test_token_contains_expiration(self):
        token = create_access_token(data={"sub": "user1"})
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        assert "exp" in payload
