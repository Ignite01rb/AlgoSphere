package apperror

import "net/http"

type ValidationIssue struct {
	Location []string `json:"loc"`
	Message  string   `json:"msg"`
}

type Error struct {
	Status  int
	Detail  string
	Issues  []ValidationIssue
	Wrapped error
}

func (e *Error) Error() string {
	if e == nil {
		return ""
	}
	if e.Detail != "" {
		return e.Detail
	}
	if e.Wrapped != nil {
		return e.Wrapped.Error()
	}
	return http.StatusText(e.Status)
}

func (e *Error) Unwrap() error {
	if e == nil {
		return nil
	}
	return e.Wrapped
}

func New(status int, detail string) *Error {
	return &Error{Status: status, Detail: detail}
}

func Wrap(status int, detail string, err error) *Error {
	return &Error{Status: status, Detail: detail, Wrapped: err}
}

func Validation(issues ...ValidationIssue) *Error {
	return &Error{
		Status: http.StatusUnprocessableEntity,
		Detail: "Validation failed.",
		Issues: issues,
	}
}

func BadRequest(detail string) *Error {
	return New(http.StatusBadRequest, detail)
}

func Unauthorized(detail string) *Error {
	return New(http.StatusUnauthorized, detail)
}

func Forbidden(detail string) *Error {
	return New(http.StatusForbidden, detail)
}

func NotFound(detail string) *Error {
	return New(http.StatusNotFound, detail)
}

func Conflict(detail string) *Error {
	return New(http.StatusConflict, detail)
}

func TooManyRequests(detail string) *Error {
	return New(http.StatusTooManyRequests, detail)
}

func ServiceUnavailable(detail string) *Error {
	return New(http.StatusServiceUnavailable, detail)
}

func Internal(detail string) *Error {
	return New(http.StatusInternalServerError, detail)
}
