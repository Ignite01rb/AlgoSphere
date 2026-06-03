package security

import (
	"testing"

	"algosphere/backend/internal/config"
)

func TestAccessTokenRoundTrip(t *testing.T) {
	settings := config.Settings{
		SecretKey:                "this-is-a-long-enough-secret-for-production",
		Algorithm:                "HS256",
		TokenIssuer:              "algosphere-api",
		AccessTokenExpireMinutes: 60,
	}

	token, err := CreateAccessToken(settings, "123")
	if err != nil {
		t.Fatalf("create token: %v", err)
	}

	claims, err := ParseAccessToken(settings, token)
	if err != nil {
		t.Fatalf("parse token: %v", err)
	}
	if claims.Subject != "123" {
		t.Fatalf("expected subject 123, got %s", claims.Subject)
	}
	if claims.Type != "access" {
		t.Fatalf("expected access token, got %s", claims.Type)
	}
}

func TestPasswordHashRoundTrip(t *testing.T) {
	hash, err := HashPassword("AlgoSphere!123")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}

	match, err := VerifyPassword("AlgoSphere!123", hash)
	if err != nil {
		t.Fatalf("verify password: %v", err)
	}
	if !match {
		t.Fatalf("expected password verification to succeed")
	}
}
