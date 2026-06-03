package security

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"algosphere/backend/internal/config"
)

type Claims struct {
	Type string `json:"type"`
	jwt.RegisteredClaims
}

func CreateAccessToken(settings config.Settings, subject string) (string, error) {
	issuedAt := time.Now().UTC()
	expiresAt := issuedAt.Add(time.Duration(settings.AccessTokenExpireMinutes) * time.Minute)

	claims := Claims{
		Type: "access",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   subject,
			Issuer:    settings.TokenIssuer,
			IssuedAt:  jwt.NewNumericDate(issuedAt),
			NotBefore: jwt.NewNumericDate(issuedAt),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(settings.SecretKey))
	if err != nil {
		return "", fmt.Errorf("sign access token: %w", err)
	}
	return signed, nil
}

func ParseAccessToken(settings config.Settings, token string) (*Claims, error) {
	claims := &Claims{}
	parsed, err := jwt.ParseWithClaims(token, claims, func(parsed *jwt.Token) (any, error) {
		if parsed.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method %s", parsed.Method.Alg())
		}
		return []byte(settings.SecretKey), nil
	}, jwt.WithIssuer(settings.TokenIssuer))
	if err != nil {
		return nil, fmt.Errorf("parse access token: %w", err)
	}
	if !parsed.Valid || claims.Type != "access" || claims.Subject == "" {
		return nil, fmt.Errorf("token is invalid")
	}
	return claims, nil
}
