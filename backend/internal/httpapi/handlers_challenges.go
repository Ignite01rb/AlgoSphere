package httpapi

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"

	"algosphere/backend/internal/apperror"
	"algosphere/backend/internal/codeforces"
	"algosphere/backend/internal/model"
	"algosphere/backend/internal/validation"
)

func (api *API) createChallenge(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	payload, err := decodeBody(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}

	titleRaw, ok, _ := bodyString(payload, "title")
	platform, _, _ := bodyString(payload, "platform")
	numProblemsRaw, numProblemsOK, _ := bodyInt(payload, "numProblems", "num_problems")
	minRatingRaw, _, _ := bodyInt(payload, "minRating", "min_rating")
	maxRatingRaw, _, _ := bodyInt(payload, "maxRating", "max_rating")
	tagsRaw, _, _ := bodyStringSlice(payload, "tags")
	inviteIDsRaw, inviteOK, _ := bodyIntSlice(payload, "inviteUserIds", "invite_user_ids")

	issues := make([]apperror.ValidationIssue, 0)
	if !ok {
		issues = append(issues, validationIssue("body", "title", "Field required."))
	}
	if !inviteOK {
		issues = append(issues, validationIssue("body", "inviteUserIds", "Field required."))
	}
	if len(issues) > 0 {
		writeAPIError(w, apperror.Validation(issues...))
		return
	}

	title, err := validation.NormalizeRequiredText(titleRaw, "Challenge title")
	if err != nil {
		issues = append(issues, validationIssue("body", "title", err.Error()+"."))
	}
	if platform == "" {
		platform = "codeforces"
	}
	numProblems := 3
	if numProblemsOK {
		numProblems = numProblemsRaw
	}
	if numProblems < 1 || numProblems > 10 {
		issues = append(issues, validationIssue("body", "numProblems", "Value must be between 1 and 10."))
	}

	var minRating *int
	if minRatingRaw > 0 || hasField(payload, "minRating", "min_rating") {
		if minRatingRaw < 0 || minRatingRaw > 3500 {
			issues = append(issues, validationIssue("body", "minRating", "Value must be between 0 and 3500."))
		} else {
			minRating = &minRatingRaw
		}
	} else {
		defaultMin := 800
		minRating = &defaultMin
	}

	var maxRating *int
	if maxRatingRaw > 0 || hasField(payload, "maxRating", "max_rating") {
		if maxRatingRaw < 0 || maxRatingRaw > 3500 {
			issues = append(issues, validationIssue("body", "maxRating", "Value must be between 0 and 3500."))
		} else {
			maxRating = &maxRatingRaw
		}
	} else {
		defaultMax := 1600
		maxRating = &defaultMax
	}

	inviteIDs, err := normalizePositiveIDs(inviteIDsRaw, "Invite user IDs", 1)
	if err != nil {
		issues = append(issues, validationIssue("body", "inviteUserIds", err.Error()))
	}
	if len(issues) > 0 {
		writeAPIError(w, apperror.Validation(issues...))
		return
	}

	cfProblems, err := codeforces.FetchProblems(r.Context(), tagsRaw, minRating, maxRating)
	if err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusBadGateway, "Failed to load challenge problems from Codeforces. Please try again.", err))
		return
	}
	selected := codeforces.PickRandomProblems(cfProblems, numProblems)

	challenge := model.Challenge{
		CreatedByID: currentUser.ID,
		Title:       title,
		Platform:    platform,
		NumProblems: int16(numProblems),
		MinRating:   minRating,
		MaxRating:   maxRating,
		Status:      "pending",
	}
	if len(tagsRaw) > 0 {
		challenge.Tags = stringPtr(strings.Join(tagsRaw, ","))
	}

	if err := api.db.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&challenge).Error; err != nil {
			return err
		}
		now := time.Now().UTC()
		if err := tx.Create(&model.ChallengeParticipant{
			ChallengeID: challenge.ID,
			UserID:      currentUser.ID,
			Status:      "accepted",
			JoinedAt:    &now,
		}).Error; err != nil {
			return err
		}
		for _, inviteID := range inviteIDs {
			if inviteID == currentUser.ID {
				continue
			}
			participant := model.ChallengeParticipant{ChallengeID: challenge.ID, UserID: inviteID, Status: "invited"}
			if err := tx.Create(&participant).Error; err != nil {
				return err
			}
		}
		for index, problem := range selected {
			var tags *string
			if len(problem.Tags) > 0 {
				tags = stringPtr(strings.Join(problem.Tags, ","))
			}
			record := model.ChallengeProblem{
				ChallengeID:  challenge.ID,
				ProblemURL:   problem.URL(),
				Title:        problem.Name,
				ContestID:    intPtr(problem.ContestID),
				ProblemIndex: &problem.Index,
				Rating:       problem.Rating,
				Tags:         tags,
				OrderIndex:   int16(index),
			}
			if err := tx.Create(&record).Error; err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to create the challenge.", err))
		return
	}

	loaded, err := api.loadChallenge(r.Context(), challenge.ID)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, serializeChallenge(loaded))
}

func (api *API) listChallenges(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}

	var challenges []model.Challenge
	if err := api.db.WithContext(r.Context()).
		Joins("JOIN challenge_participants ON challenge_participants.challenge_id = challenges.id").
		Where("challenge_participants.user_id = ?", currentUser.ID).
		Preload("Participants.User").
		Preload("Problems").
		Preload("CreatedBy").
		Order("challenges.created_at desc").
		Find(&challenges).Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load challenges.", err))
		return
	}

	response := make([]challengeSummary, 0, len(challenges))
	for index := range challenges {
		response = append(response, serializeChallenge(&challenges[index]))
	}
	writeJSON(w, http.StatusOK, response)
}

func (api *API) getChallenge(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	challengeID, err := parseUintParam(chi.URLParam(r, "challengeID"), "challengeID")
	if err != nil {
		writeAPIError(w, err)
		return
	}

	challenge, err := api.loadChallenge(r.Context(), challengeID)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	if !challengeHasParticipant(challenge, currentUser.ID) {
		writeAPIError(w, apperror.NotFound("Challenge not found."))
		return
	}
	writeJSON(w, http.StatusOK, serializeChallenge(challenge))
}

func (api *API) acceptChallenge(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	challengeID, err := parseUintParam(chi.URLParam(r, "challengeID"), "challengeID")
	if err != nil {
		writeAPIError(w, err)
		return
	}

	challenge, err := api.loadChallenge(r.Context(), challengeID)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	if !challengeHasParticipant(challenge, currentUser.ID) {
		writeAPIError(w, apperror.NotFound("Challenge not found."))
		return
	}

	if err := api.db.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		var participant model.ChallengeParticipant
		if err := tx.Where("challenge_id = ? AND user_id = ?", challengeID, currentUser.ID).First(&participant).Error; err != nil {
			return err
		}
		if participant.Status != "invited" {
			return apperror.BadRequest("Already responded.")
		}
		now := time.Now().UTC()
		if err := tx.Model(&participant).Updates(map[string]any{"status": "accepted", "joined_at": &now}).Error; err != nil {
			return err
		}
		var participants []model.ChallengeParticipant
		if err := tx.Where("challenge_id = ?", challengeID).Find(&participants).Error; err != nil {
			return err
		}
		allAccepted := true
		for _, item := range participants {
			if item.UserID == currentUser.ID {
				item.Status = "accepted"
			}
			if item.Status != "accepted" {
				allAccepted = false
				break
			}
		}
		if allAccepted && challenge.Status == "pending" {
			if err := tx.Model(&model.Challenge{}).Where("id = ?", challengeID).Updates(map[string]any{"status": "active", "started_at": &now}).Error; err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		writeAPIError(w, err)
		return
	}

	loaded, err := api.loadChallenge(r.Context(), challengeID)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, serializeChallenge(loaded))
}

func (api *API) declineChallenge(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	challengeID, err := parseUintParam(chi.URLParam(r, "challengeID"), "challengeID")
	if err != nil {
		writeAPIError(w, err)
		return
	}

	var participant model.ChallengeParticipant
	if err := api.db.WithContext(r.Context()).Where("challenge_id = ? AND user_id = ?", challengeID, currentUser.ID).First(&participant).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeAPIError(w, apperror.NotFound("Challenge not found."))
			return
		}
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load the challenge invitation.", err))
		return
	}
	if participant.Status != "invited" {
		writeAPIError(w, apperror.BadRequest("Already responded."))
		return
	}
	if err := api.db.WithContext(r.Context()).Model(&participant).Update("status", "declined").Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to decline the challenge.", err))
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (api *API) startChallenge(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	challengeID, err := parseUintParam(chi.URLParam(r, "challengeID"), "challengeID")
	if err != nil {
		writeAPIError(w, err)
		return
	}

	challenge, err := api.loadChallenge(r.Context(), challengeID)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	if challenge.CreatedByID != currentUser.ID {
		writeAPIError(w, apperror.NotFound("Challenge not found."))
		return
	}
	if challenge.Status != "pending" {
		writeAPIError(w, apperror.BadRequest("Challenge is not pending."))
		return
	}
	for _, participant := range challenge.Participants {
		if participant.Status == "declined" {
			writeAPIError(w, apperror.BadRequest("Some participants have declined."))
			return
		}
	}

	now := time.Now().UTC()
	if err := api.db.WithContext(r.Context()).Model(&model.Challenge{}).Where("id = ?", challengeID).Updates(map[string]any{
		"status":     "active",
		"started_at": &now,
	}).Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to start the challenge.", err))
		return
	}

	loaded, err := api.loadChallenge(r.Context(), challengeID)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, serializeChallenge(loaded))
}

func (api *API) loadChallenge(ctx context.Context, challengeID uint64) (*model.Challenge, error) {
	var challenge model.Challenge
	if err := api.db.WithContext(ctx).
		Preload("Participants.User").
		Preload("Problems").
		Preload("CreatedBy").
		First(&challenge, challengeID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NotFound("Challenge not found.")
		}
		return nil, apperror.Wrap(http.StatusInternalServerError, "Failed to load the challenge.", err)
	}
	return &challenge, nil
}

func challengeHasParticipant(challenge *model.Challenge, userID uint64) bool {
	for _, participant := range challenge.Participants {
		if participant.UserID == userID {
			return true
		}
	}
	return false
}

func hasField(payload bodyMap, aliases ...string) bool {
	_, ok := firstAlias(payload, aliases...)
	return ok
}

func intPtr(value int) *int {
	return &value
}
