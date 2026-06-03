package validation

import (
	"fmt"
	"net/url"
	"strings"
)

const MinPasswordLength = 10

var localHTTPHosts = map[string]struct{}{
	"localhost": {},
	"127.0.0.1": {},
}

func NormalizeUsername(value string, fieldName string, allowAtPrefix bool) (string, error) {
	if fieldName == "" {
		fieldName = "Username"
	}

	cleaned := strings.ToLower(strings.TrimSpace(value))
	if allowAtPrefix && strings.HasPrefix(cleaned, "@") {
		cleaned = strings.TrimPrefix(cleaned, "@")
	}
	if cleaned == "" {
		return "", fmt.Errorf("%s cannot be blank", fieldName)
	}
	if len(cleaned) < 3 || len(cleaned) > 24 {
		return "", fmt.Errorf("%s must be between 3 and 24 characters", fieldName)
	}
	if err := ensureNoControlCharacters(cleaned, fieldName); err != nil {
		return "", err
	}
	for _, r := range cleaned {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_' {
			continue
		}
		return "", fmt.Errorf("%s may contain only letters, numbers, and underscores", fieldName)
	}
	return cleaned, nil
}

func NormalizeRequiredText(value string, fieldName string) (string, error) {
	cleaned := strings.TrimSpace(value)
	if cleaned == "" {
		return "", fmt.Errorf("%s cannot be blank", fieldName)
	}
	if err := ensureNoControlCharacters(cleaned, fieldName); err != nil {
		return "", err
	}
	return cleaned, nil
}

func NormalizeOptionalText(value *string, fieldName string) (*string, error) {
	if value == nil {
		return nil, nil
	}
	cleaned := strings.TrimSpace(*value)
	if cleaned == "" {
		return nil, nil
	}
	if err := ensureNoControlCharacters(cleaned, fieldName); err != nil {
		return nil, err
	}
	return &cleaned, nil
}

func NormalizeBioText(value string) (string, error) {
	cleaned := strings.TrimSpace(value)
	if cleaned == "" {
		return "", nil
	}
	if err := ensureNoControlCharacters(cleaned, "Bio"); err != nil {
		return "", err
	}
	return cleaned, nil
}

func ValidateProfileImageURL(value *string) (*string, error) {
	if value == nil {
		return nil, nil
	}
	cleaned := strings.TrimSpace(*value)
	if cleaned == "" {
		return nil, nil
	}
	parsed, err := parseHTTPURL(cleaned, "Avatar URL")
	if err != nil {
		return nil, err
	}
	if parsed.Scheme != "https" {
		if _, ok := localHTTPHosts[parsed.Hostname()]; !ok {
			return nil, fmt.Errorf("Avatar URL must use HTTPS unless it targets localhost")
		}
	}
	return &cleaned, nil
}

func ValidateProblemURL(value string) (string, error) {
	cleaned := strings.TrimSpace(value)
	if cleaned == "" {
		return "", fmt.Errorf("Problem URL is required")
	}
	parsed, err := parseHTTPURL(cleaned, "Problem URL")
	if err != nil {
		return "", err
	}
	if parsed.Scheme != "https" {
		return "", fmt.Errorf("Problem URL must use HTTPS")
	}
	return cleaned, nil
}

func ValidatePassword(value string) (string, error) {
	if strings.TrimSpace(value) == "" {
		return "", fmt.Errorf("Password cannot be blank")
	}
	if len(value) < MinPasswordLength {
		return "", fmt.Errorf("Password must be at least %d characters long", MinPasswordLength)
	}
	if err := ensureNoControlCharacters(value, "Password"); err != nil {
		return "", err
	}
	return value, nil
}

func parseHTTPURL(value string, fieldName string) (*url.URL, error) {
	parsed, err := url.Parse(value)
	if err != nil || parsed == nil || parsed.Hostname() == "" {
		return nil, fmt.Errorf("%s must be a valid HTTP or HTTPS URL", fieldName)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return nil, fmt.Errorf("%s must be a valid HTTP or HTTPS URL", fieldName)
	}
	if parsed.User != nil {
		return nil, fmt.Errorf("%s must not include credentials", fieldName)
	}
	if parsed.Fragment != "" {
		return nil, fmt.Errorf("%s must not include a URL fragment", fieldName)
	}
	return parsed, nil
}

func ensureNoControlCharacters(value string, fieldName string) error {
	for _, r := range value {
		if r < 32 {
			return fmt.Errorf("%s contains unsupported control characters", fieldName)
		}
	}
	return nil
}
