package httpapi

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"

	"algosphere/backend/internal/apperror"
	"algosphere/backend/internal/model"
	"algosphere/backend/internal/validation"
)

func (api *API) lookupFriendByUsername(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}

	username, err := validation.NormalizeUsername(r.URL.Query().Get("username"), "Username", true)
	if err != nil {
		writeAPIError(w, apperror.Validation(validationIssue("query", "username", err.Error()+".")))
		return
	}

	decision := api.friendLookupLimiter.Check(buildFriendLookupRateLimitKey(r, currentUser.ID))
	if !decision.Allowed {
		w.Header().Set("Retry-After", strconv.Itoa(decision.RetryAfterSeconds))
		writeAPIError(w, apperror.TooManyRequests("Too many username lookups. Please wait and try again."))
		return
	}
	api.friendLookupLimiter.RecordAttempt(buildFriendLookupRateLimitKey(r, currentUser.ID))

	if username == currentUser.Username {
		writeAPIError(w, apperror.BadRequest("You cannot add yourself as a friend."))
		return
	}

	friendIDs, err := api.acceptedFriendIDSet(r.Context(), currentUser.ID)
	if err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load friendships.", err))
		return
	}
	pendingOutgoing, err := api.pendingOutgoingSet(r.Context(), currentUser.ID)
	if err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load friendships.", err))
		return
	}
	pendingIncoming, err := api.pendingIncomingSet(r.Context(), currentUser.ID)
	if err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load friendships.", err))
		return
	}

	var user model.User
	err = api.db.WithContext(r.Context()).
		Where("id <> ? AND username = ?", currentUser.ID, username).
		First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		writeJSON(w, http.StatusOK, friendLookupResponse{User: nil})
		return
	}
	if err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to look up the requested user.", err))
		return
	}

	responseUser := serializeFriendUser(&user, friendIDs, pendingOutgoing, pendingIncoming)
	writeJSON(w, http.StatusOK, friendLookupResponse{User: &responseUser})
}

func (api *API) searchUsers(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}

	decision := api.friendLookupLimiter.Check(buildFriendLookupRateLimitKey(r, currentUser.ID))
	if !decision.Allowed {
		w.Header().Set("Retry-After", strconv.Itoa(decision.RetryAfterSeconds))
		writeAPIError(w, apperror.TooManyRequests("Too many search requests. Please wait and try again."))
		return
	}
	api.friendLookupLimiter.RecordAttempt(buildFriendLookupRateLimitKey(r, currentUser.ID))

	query := strings.TrimSpace(strings.TrimPrefix(r.URL.Query().Get("q"), "@"))
	if len(query) < 2 {
		writeAPIError(w, apperror.Validation(validationIssue("query", "q", "String should have at least 2 characters.")))
		return
	}
	pattern := "%" + strings.ToLower(query) + "%"

	var users []model.User
	if err := api.db.WithContext(r.Context()).
		Where("id <> ? AND (LOWER(username) LIKE ? OR LOWER(display_name) LIKE ?)", currentUser.ID, pattern, pattern).
		Order("display_name asc").
		Limit(10).
		Find(&users).Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to search users.", err))
		return
	}

	friendIDs, err := api.acceptedFriendIDSet(r.Context(), currentUser.ID)
	if err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load friendships.", err))
		return
	}
	pendingOutgoing, err := api.pendingOutgoingSet(r.Context(), currentUser.ID)
	if err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load friendships.", err))
		return
	}
	pendingIncoming, err := api.pendingIncomingSet(r.Context(), currentUser.ID)
	if err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load friendships.", err))
		return
	}

	response := make([]friendUser, 0, len(users))
	for index := range users {
		response = append(response, serializeFriendUser(&users[index], friendIDs, pendingOutgoing, pendingIncoming))
	}
	writeJSON(w, http.StatusOK, response)
}

func (api *API) listFriends(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}

	friendIDs, err := api.acceptedFriendIDSet(r.Context(), currentUser.ID)
	if err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load friendships.", err))
		return
	}
	if len(friendIDs) == 0 {
		writeJSON(w, http.StatusOK, []friendUser{})
		return
	}

	ids := make([]uint64, 0, len(friendIDs))
	for id := range friendIDs {
		ids = append(ids, id)
	}

	var users []model.User
	if err := api.db.WithContext(r.Context()).Where("id IN ?", ids).Order("display_name asc").Find(&users).Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load friends.", err))
		return
	}
	response := make([]friendUser, 0, len(users))
	for index := range users {
		response = append(response, serializeFriendUser(&users[index], friendIDs, map[uint64]struct{}{}, map[uint64]struct{}{}))
	}
	writeJSON(w, http.StatusOK, response)
}

func (api *API) addFriend(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	friendID, err := parseUintParam(chi.URLParam(r, "friendID"), "friendID")
	if err != nil {
		writeAPIError(w, err)
		return
	}
	if friendID == currentUser.ID {
		writeAPIError(w, apperror.BadRequest("You cannot add yourself as a friend."))
		return
	}

	var friend model.User
	if err := api.db.WithContext(r.Context()).First(&friend, friendID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeAPIError(w, apperror.NotFound("User not found."))
			return
		}
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load the requested user.", err))
		return
	}

	var existing model.Friendship
	err = api.db.WithContext(r.Context()).Where("user_id = ? AND friend_id = ?", currentUser.ID, friendID).First(&existing).Error
	if err == nil {
		status := "pending_outgoing"
		if existing.Status == "accepted" {
			status = "accepted"
		}
		writeJSON(w, http.StatusOK, friendUser{
			ID:               friend.ID,
			Username:         friend.Username,
			DisplayName:      friend.DisplayName,
			AvatarURL:        friend.AvatarURL,
			IsFriend:         existing.Status == "accepted",
			FriendshipStatus: status,
		})
		return
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load friendships.", err))
		return
	}

	var reverse model.Friendship
	err = api.db.WithContext(r.Context()).Where("user_id = ? AND friend_id = ?", friendID, currentUser.ID).First(&reverse).Error
	if err == nil && reverse.Status == "pending" {
		if txErr := api.db.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
			if err := tx.Model(&reverse).Update("status", "accepted").Error; err != nil {
				return err
			}
			return tx.Create(&model.Friendship{UserID: currentUser.ID, FriendID: friendID, Status: "accepted"}).Error
		}); txErr != nil {
			writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to accept the friend request.", txErr))
			return
		}
		writeJSON(w, http.StatusOK, friendUser{
			ID:               friend.ID,
			Username:         friend.Username,
			DisplayName:      friend.DisplayName,
			AvatarURL:        friend.AvatarURL,
			IsFriend:         true,
			FriendshipStatus: "accepted",
		})
		return
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load friendships.", err))
		return
	}

	friendship := model.Friendship{UserID: currentUser.ID, FriendID: friendID, Status: "pending"}
	if err := api.db.WithContext(r.Context()).Create(&friendship).Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to create the friend request.", err))
		return
	}
	writeJSON(w, http.StatusOK, friendUser{
		ID:               friend.ID,
		Username:         friend.Username,
		DisplayName:      friend.DisplayName,
		AvatarURL:        friend.AvatarURL,
		IsFriend:         false,
		FriendshipStatus: "pending_outgoing",
	})
}

func (api *API) removeFriend(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	friendID, err := parseUintParam(chi.URLParam(r, "friendID"), "friendID")
	if err != nil {
		writeAPIError(w, err)
		return
	}

	if err := api.db.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ? AND friend_id = ?", currentUser.ID, friendID).Delete(&model.Friendship{}).Error; err != nil {
			return err
		}
		if err := tx.Where("user_id = ? AND friend_id = ?", friendID, currentUser.ID).Delete(&model.Friendship{}).Error; err != nil {
			return err
		}
		if err := tx.Where("user_id = ? AND group_id IN (?)", friendID, tx.Model(&model.Group{}).Select("id").Where("owner_id = ?", currentUser.ID)).
			Delete(&model.GroupMembership{}).Error; err != nil {
			return err
		}
		if err := tx.Where("user_id = ? AND group_id IN (?)", currentUser.ID, tx.Model(&model.Group{}).Select("id").Where("owner_id = ?", friendID)).
			Delete(&model.GroupMembership{}).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to remove the friendship.", err))
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (api *API) listFriendRequests(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}

	var requests []model.Friendship
	if err := api.db.WithContext(r.Context()).
		Where("friend_id = ? AND status = ?", currentUser.ID, "pending").
		Preload("User").
		Order("created_at desc").
		Find(&requests).Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load friend requests.", err))
		return
	}

	response := make([]friendRequestResponse, 0, len(requests))
	for _, request := range requests {
		response = append(response, friendRequestResponse{
			ID:        request.ID,
			FromUser:  friendUser{ID: request.User.ID, Username: request.User.Username, DisplayName: request.User.DisplayName, AvatarURL: request.User.AvatarURL, IsFriend: false, FriendshipStatus: "pending_incoming"},
			CreatedAt: request.CreatedAt,
		})
	}
	writeJSON(w, http.StatusOK, response)
}

func (api *API) acceptFriendRequest(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	requestID, err := parseUintParam(chi.URLParam(r, "requestID"), "requestID")
	if err != nil {
		writeAPIError(w, err)
		return
	}

	var request model.Friendship
	if err := api.db.WithContext(r.Context()).
		Where("id = ? AND friend_id = ? AND status = ?", requestID, currentUser.ID, "pending").
		Preload("User").
		First(&request).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeAPIError(w, apperror.NotFound("Friend request not found."))
			return
		}
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load the friend request.", err))
		return
	}

	if err := api.db.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&request).Update("status", "accepted").Error; err != nil {
			return err
		}
		var reverse model.Friendship
		err := tx.Where("user_id = ? AND friend_id = ?", currentUser.ID, request.UserID).First(&reverse).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return tx.Create(&model.Friendship{UserID: currentUser.ID, FriendID: request.UserID, Status: "accepted"}).Error
		}
		if err != nil {
			return err
		}
		return tx.Model(&reverse).Update("status", "accepted").Error
	}); err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to accept the friend request.", err))
		return
	}

	writeJSON(w, http.StatusOK, friendUser{
		ID:               request.User.ID,
		Username:         request.User.Username,
		DisplayName:      request.User.DisplayName,
		AvatarURL:        request.User.AvatarURL,
		IsFriend:         true,
		FriendshipStatus: "accepted",
	})
}

func (api *API) rejectFriendRequest(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	requestID, err := parseUintParam(chi.URLParam(r, "requestID"), "requestID")
	if err != nil {
		writeAPIError(w, err)
		return
	}

	result := api.db.WithContext(r.Context()).Where("id = ? AND friend_id = ? AND status = ?", requestID, currentUser.ID, "pending").Delete(&model.Friendship{})
	if result.Error != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to reject the friend request.", result.Error))
		return
	}
	if result.RowsAffected == 0 {
		writeAPIError(w, apperror.NotFound("Friend request not found."))
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
