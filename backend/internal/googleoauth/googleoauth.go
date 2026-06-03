package googleoauth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"algosphere/backend/internal/config"
)

const (
	tokenURL    = "https://oauth2.googleapis.com/token"
	userInfoURL = "https://www.googleapis.com/oauth2/v2/userinfo"
)

type User struct {
	GoogleID      string
	Email         string
	Name          string
	Picture       *string
	EmailVerified bool
}

func ExchangeCodeForUser(ctx context.Context, cfg config.Settings, code string, redirectURI string) (User, error) {
	if cfg.GoogleClientID == "" || cfg.GoogleClientSecret == "" {
		return User{}, fmt.Errorf("Google OAuth is not configured")
	}

	actualRedirectURI := cfg.GoogleRedirectURI
	if redirectURI != "" {
		actualRedirectURI = redirectURI
	}

	tokenPayload := url.Values{
		"code":          {code},
		"client_id":     {cfg.GoogleClientID},
		"client_secret": {cfg.GoogleClientSecret},
		"redirect_uri":  {actualRedirectURI},
		"grant_type":    {"authorization_code"},
	}

	client := &http.Client{Timeout: 15 * time.Second}
	tokenReq, err := http.NewRequestWithContext(ctx, http.MethodPost, tokenURL, bytes.NewBufferString(tokenPayload.Encode()))
	if err != nil {
		return User{}, err
	}
	tokenReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	tokenResp, err := client.Do(tokenReq)
	if err != nil {
		return User{}, err
	}
	defer tokenResp.Body.Close()
	if tokenResp.StatusCode >= 400 {
		var buf bytes.Buffer
		_, _ = buf.ReadFrom(tokenResp.Body)
		return User{}, fmt.Errorf("Google token exchange failed with status %d, body: %s", tokenResp.StatusCode, buf.String())
	}

	var tokenBody struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(tokenResp.Body).Decode(&tokenBody); err != nil {
		return User{}, err
	}

	userReq, err := http.NewRequestWithContext(ctx, http.MethodGet, userInfoURL, nil)
	if err != nil {
		return User{}, err
	}
	userReq.Header.Set("Authorization", "Bearer "+tokenBody.AccessToken)

	userResp, err := client.Do(userReq)
	if err != nil {
		return User{}, err
	}
	defer userResp.Body.Close()
	if userResp.StatusCode >= 400 {
		return User{}, fmt.Errorf("Google userinfo request failed with status %d", userResp.StatusCode)
	}

	var payload struct {
		ID             string  `json:"id"`
		Email          string  `json:"email"`
		Name           string  `json:"name"`
		Picture        *string `json:"picture"`
		VerifiedEmail  bool    `json:"verified_email"`
		VerifiedEmail2 bool    `json:"verifiedEmail"`
	}
	if err := json.NewDecoder(userResp.Body).Decode(&payload); err != nil {
		return User{}, err
	}
	name := payload.Name
	if name == "" {
		name = payload.Email
	}
	return User{
		GoogleID:      payload.ID,
		Email:         payload.Email,
		Name:          name,
		Picture:       payload.Picture,
		EmailVerified: payload.VerifiedEmail || payload.VerifiedEmail2,
	}, nil
}
