package httpapi

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/mail"
	"strconv"
	"strings"

	"algosphere/backend/internal/apperror"
	"algosphere/backend/internal/validation"
)

type bodyMap map[string]json.RawMessage

func decodeBody(r *http.Request) (bodyMap, error) {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	var payload bodyMap
	if err := decoder.Decode(&payload); err != nil {
		return nil, apperror.BadRequest("Request body must be valid JSON.")
	}
	if err := decoder.Decode(&struct{}{}); err == nil {
		return nil, apperror.BadRequest("Request body must contain a single JSON object.")
	}
	return payload, nil
}

func bodyString(payload bodyMap, aliases ...string) (string, bool, error) {
	raw, ok := firstAlias(payload, aliases...)
	if !ok {
		return "", false, nil
	}
	var value string
	if err := json.Unmarshal(raw, &value); err != nil {
		return "", true, fmt.Errorf("must be a string")
	}
	return value, true, nil
}

func bodyOptionalString(payload bodyMap, aliases ...string) (*string, bool, error) {
	raw, ok := firstAlias(payload, aliases...)
	if !ok {
		return nil, false, nil
	}
	if string(raw) == "null" {
		return nil, true, nil
	}
	var value string
	if err := json.Unmarshal(raw, &value); err != nil {
		return nil, true, fmt.Errorf("must be a string or null")
	}
	return &value, true, nil
}

func bodyInt(payload bodyMap, aliases ...string) (int, bool, error) {
	raw, ok := firstAlias(payload, aliases...)
	if !ok {
		return 0, false, nil
	}
	var value int
	if err := json.Unmarshal(raw, &value); err != nil {
		return 0, true, fmt.Errorf("must be an integer")
	}
	return value, true, nil
}

func bodyIntSlice(payload bodyMap, aliases ...string) ([]int, bool, error) {
	raw, ok := firstAlias(payload, aliases...)
	if !ok {
		return nil, false, nil
	}
	var values []int
	if err := json.Unmarshal(raw, &values); err != nil {
		return nil, true, fmt.Errorf("must be an array of integers")
	}
	return values, true, nil
}

func bodyStringSlice(payload bodyMap, aliases ...string) ([]string, bool, error) {
	raw, ok := firstAlias(payload, aliases...)
	if !ok {
		return nil, false, nil
	}
	var values []string
	if err := json.Unmarshal(raw, &values); err != nil {
		return nil, true, fmt.Errorf("must be an array of strings")
	}
	return values, true, nil
}

func firstAlias(payload bodyMap, aliases ...string) (json.RawMessage, bool) {
	for _, alias := range aliases {
		if raw, ok := payload[alias]; ok {
			return raw, true
		}
	}
	return nil, false
}

func validationIssue(scope string, field string, message string) apperror.ValidationIssue {
	return apperror.ValidationIssue{
		Location: []string{scope, field},
		Message:  message,
	}
}

func normalizeEmail(value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", fmt.Errorf("Email cannot be blank.")
	}
	address, err := mail.ParseAddress(trimmed)
	if err != nil || address.Address == "" || address.Address != trimmed {
		return "", fmt.Errorf("Email must be a valid email address.")
	}
	return strings.ToLower(trimmed), nil
}

func normalizeRequiredString(value string, fieldName string) (string, error) {
	return validation.NormalizeRequiredText(value, fieldName)
}

func normalizeOptionalString(value *string, fieldName string) (*string, error) {
	return validation.NormalizeOptionalText(value, fieldName)
}

func normalizePositiveIDs(values []int, fieldName string, minLen int) ([]uint64, error) {
	if minLen > 0 && len(values) < minLen {
		return nil, fmt.Errorf("%s must include at least %d item(s).", fieldName, minLen)
	}
	seen := make(map[int]struct{})
	result := make([]uint64, 0, len(values))
	for _, value := range values {
		if value <= 0 {
			return nil, fmt.Errorf("%s must contain only positive integers.", fieldName)
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		result = append(result, uint64(value))
	}
	return result, nil
}

func parseUintParam(value string, name string) (uint64, error) {
	parsed, err := strconv.ParseUint(value, 10, 64)
	if err != nil || parsed == 0 {
		return 0, apperror.BadRequest(fmt.Sprintf("%s must be a positive integer.", name))
	}
	return parsed, nil
}
