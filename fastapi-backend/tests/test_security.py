from app.core.security import hash_password, verify_password


def test_password_hash_can_be_verified() -> None:
    password = "secure-password"
    password_hash = hash_password(password)

    assert password_hash != password
    assert verify_password(password, password_hash)
    assert not verify_password("wrong-password", password_hash)
