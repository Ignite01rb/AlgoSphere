package httpapi

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"gorm.io/gorm"

	"algosphere/backend/internal/apperror"
	"algosphere/backend/internal/googleoauth"
	"algosphere/backend/internal/model"
	"algosphere/backend/internal/security"
	"algosphere/backend/internal/validation"
)

func (api *API) getGlobalStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var groupsCreated int64
	if err := api.db.WithContext(ctx).Model(&model.Group{}).Count(&groupsCreated).Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load global stats.", err))
		return
	}

	var problemsShared int64
	if err := api.db.WithContext(ctx).Model(&model.ProblemShare{}).Count(&problemsShared).Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load global stats.", err))
		return
	}

	var activeMembers int64
	if err := api.db.WithContext(ctx).Model(&model.User{}).Count(&activeMembers).Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load global stats.", err))
		return
	}

	writeJSON(w, http.StatusOK, globalStatsResponse{
		GroupsCreated:  groupsCreated,
		ProblemsShared: problemsShared,
		ActiveMembers:  activeMembers,
	})
}

func (api *API) checkUsername(w http.ResponseWriter, r *http.Request) {
	username, err := validation.NormalizeUsername(r.URL.Query().Get("username"), "Username", false)
	if err != nil {
		writeAPIError(w, apperror.Validation(validationIssue("query", "username", err.Error()+".")))
		return
	}

	if !api.searchIndex.UsernameMayExist(username) {
		writeJSON(w, http.StatusOK, map[string]bool{"available": true})
		return
	}

	var count int64
	if err := api.db.WithContext(r.Context()).Model(&model.User{}).Where("LOWER(username) = ?", username).Count(&count).Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to check username availability.", err))
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"available": count == 0})
}

func (api *API) register(w http.ResponseWriter, r *http.Request) {
	payload, err := decodeBody(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}

	issues := make([]apperror.ValidationIssue, 0)

	emailRaw, ok, err := bodyString(payload, "email")
	if err != nil || !ok {
		issues = append(issues, validationIssue("body", "email", "Field required."))
	}
	usernameRaw, ok, err := bodyString(payload, "username")
	if err != nil || !ok {
		issues = append(issues, validationIssue("body", "username", "Field required."))
	}
	displayNameRaw, ok, err := bodyString(payload, "displayName", "display_name")
	if err != nil || !ok {
		issues = append(issues, validationIssue("body", "displayName", "Field required."))
	}
	passwordRaw, ok, err := bodyString(payload, "password")
	if err != nil || !ok {
		issues = append(issues, validationIssue("body", "password", "Field required."))
	}
	favoriteTopicRaw, _, topicErr := bodyOptionalString(payload, "favoriteTopic", "favorite_topic")
	favoritePlatformRaw, _, platformErr := bodyOptionalString(payload, "favoritePlatform", "favorite_platform")
	if topicErr != nil {
		issues = append(issues, validationIssue("body", "favoriteTopic", topicErr.Error()+"."))
	}
	if platformErr != nil {
		issues = append(issues, validationIssue("body", "favoritePlatform", platformErr.Error()+"."))
	}
	if len(issues) > 0 {
		writeAPIError(w, apperror.Validation(issues...))
		return
	}

	email, err := normalizeEmail(emailRaw)
	if err != nil {
		issues = append(issues, validationIssue("body", "email", err.Error()))
	}
	username, err := validation.NormalizeUsername(usernameRaw, "Username", false)
	if err != nil {
		issues = append(issues, validationIssue("body", "username", err.Error()+"."))
	}
	displayName, err := validation.NormalizeRequiredText(displayNameRaw, "Display name")
	if err != nil {
		issues = append(issues, validationIssue("body", "displayName", err.Error()+"."))
	}
	password, err := validation.ValidatePassword(passwordRaw)
	if err != nil {
		issues = append(issues, validationIssue("body", "password", err.Error()+"."))
	}
	favoriteTopic, err := validation.NormalizeOptionalText(favoriteTopicRaw, "Favorite topic")
	if err != nil {
		issues = append(issues, validationIssue("body", "favoriteTopic", err.Error()+"."))
	}
	favoritePlatform, err := validation.NormalizeOptionalText(favoritePlatformRaw, "Favorite platform")
	if err != nil {
		issues = append(issues, validationIssue("body", "favoritePlatform", err.Error()+"."))
	}
	if len(issues) > 0 {
		writeAPIError(w, apperror.Validation(issues...))
		return
	}

	var emailCount int64
	if err := api.db.WithContext(r.Context()).Model(&model.User{}).Where("LOWER(email) = ?", email).Count(&emailCount).Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to check existing accounts.", err))
		return
	}
	if emailCount > 0 {
		writeAPIError(w, apperror.Conflict("An account already exists for that email."))
		return
	}

	var usernameCount int64
	if err := api.db.WithContext(r.Context()).Model(&model.User{}).Where("username = ?", username).Count(&usernameCount).Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to check existing accounts.", err))
		return
	}
	if usernameCount > 0 {
		writeAPIError(w, apperror.Conflict("That username is already taken."))
		return
	}

	passwordHash, err := security.HashPassword(password)
	if err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to create the account password hash.", err))
		return
	}

	user := model.User{
		Email:            email,
		Username:         username,
		DisplayName:      displayName,
		Bio:              "",
		FavoriteTopic:    favoriteTopic,
		FavoritePlatform: favoritePlatform,
		AvatarURL:        stringPtr(fmt.Sprintf("https://api.dicebear.com/9.x/initials/svg?seed=%s", username)),
		PasswordHash:     &passwordHash,
		AuthProvider:     "local",
	}

	if err := api.db.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&user).Error; err != nil {
			return err
		}
		group := model.Group{Name: fmt.Sprintf("%s's Squad", user.DisplayName), OwnerID: user.ID}
		if err := tx.Create(&group).Error; err != nil {
			return err
		}
		membership := model.GroupMembership{GroupID: group.ID, UserID: user.ID, Role: "owner"}
		return tx.Create(&membership).Error
	}); err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusConflict, "An account with those credentials already exists.", err))
		return
	}

	api.searchIndex.AddUsername(user.Username)
	response, err := api.tokenResponseForUser(&user)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, response)
}

func (api *API) login(w http.ResponseWriter, r *http.Request) {
	payload, err := decodeBody(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}

	identifier, ok, _ := bodyString(payload, "identifier", "email")
	password, okPassword, _ := bodyString(payload, "password")
	issues := make([]apperror.ValidationIssue, 0)
	if !ok {
		issues = append(issues, validationIssue("body", "identifier", "Field required."))
	}
	if !okPassword {
		issues = append(issues, validationIssue("body", "password", "Field required."))
	}
	if len(issues) > 0 {
		writeAPIError(w, apperror.Validation(issues...))
		return
	}

	identifier, err = validation.NormalizeRequiredText(identifier, "Email or username")
	if err != nil {
		writeAPIError(w, apperror.Validation(validationIssue("body", "identifier", err.Error()+".")))
		return
	}

	rateKey := buildAuthRateLimitKey(r, identifier)
	decision := api.authLimiter.Check(rateKey)
	if !decision.Allowed {
		w.Header().Set("Retry-After", strconv.Itoa(decision.RetryAfterSeconds))
		writeAPIError(w, apperror.TooManyRequests("Too many login attempts. Please wait and try again."))
		return
	}

	user, err := api.findUserByIdentifier(r.Context(), identifier)
	if err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to look up the account.", err))
		return
	}
	if user == nil || user.PasswordHash == nil {
		api.authLimiter.RecordFailure(rateKey)
		writeAPIError(w, apperror.Unauthorized("Invalid email, username, or password."))
		return
	}

	match, err := security.VerifyPassword(password, *user.PasswordHash)
	if err != nil || !match {
		api.authLimiter.RecordFailure(rateKey)
		writeAPIError(w, apperror.Unauthorized("Invalid email, username, or password."))
		return
	}

	api.authLimiter.Clear(rateKey)
	response, err := api.tokenResponseForUser(user)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func (api *API) googleAuth(w http.ResponseWriter, r *http.Request) {
	payload, err := decodeBody(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	code, ok, _ := bodyString(payload, "code")
	if !ok || strings.TrimSpace(code) == "" {
		writeAPIError(w, apperror.Validation(validationIssue("body", "code", "Field required.")))
		return
	}
	redirectURI, _, _ := bodyString(payload, "redirectUri", "redirect_uri")

	googleUser, err := googleoauth.ExchangeCodeForUser(r.Context(), api.settings, code, redirectURI)
	if err != nil {
		api.logger.Error("Google authentication failed", "error", err)
		writeAPIError(w, apperror.Unauthorized("Google authentication failed. Please try again."))
		return
	}
	if !googleUser.EmailVerified {
		writeAPIError(w, apperror.Unauthorized("Google account email must be verified before sign-in."))
		return
	}

	var user model.User
	err = api.db.WithContext(r.Context()).Where("google_id = ?", googleUser.GoogleID).First(&user).Error
	if err == nil {
		if user.AvatarURL != nil && strings.Contains(strings.ToLower(*user.AvatarURL), "dicebear") && googleUser.Picture != nil {
			user.AvatarURL = googleUser.Picture
			_ = api.db.WithContext(r.Context()).Save(&user).Error
		}
		response, tokenErr := api.tokenResponseForUser(&user)
		if tokenErr != nil {
			writeAPIError(w, tokenErr)
			return
		}
		writeJSON(w, http.StatusOK, response)
		return
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to look up the Google account.", err))
		return
	}

	err = api.db.WithContext(r.Context()).Where("LOWER(email) = ?", strings.ToLower(googleUser.Email)).First(&user).Error
	if err == nil {
		user.GoogleID = &googleUser.GoogleID
		if user.PasswordHash == nil {
			user.AuthProvider = "google"
		} else {
			user.AuthProvider = "both"
		}
		if user.AvatarURL != nil && strings.Contains(strings.ToLower(*user.AvatarURL), "dicebear") && googleUser.Picture != nil {
			user.AvatarURL = googleUser.Picture
		}
		if saveErr := api.db.WithContext(r.Context()).Save(&user).Error; saveErr != nil {
			writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to link the Google account.", saveErr))
			return
		}
		response, tokenErr := api.tokenResponseForUser(&user)
		if tokenErr != nil {
			writeAPIError(w, tokenErr)
			return
		}
		writeJSON(w, http.StatusOK, response)
		return
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to look up the Google account.", err))
		return
	}

	baseUsername := strings.ToLower(strings.Split(googleUser.Email, "@")[0])
	if len(baseUsername) > 24 {
		baseUsername = baseUsername[:24]
	}
	username := baseUsername
	counter := 1
	for {
		var count int64
		if err := api.db.WithContext(r.Context()).Model(&model.User{}).Where("username = ?", username).Count(&count).Error; err != nil {
			writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to generate a username for the Google account.", err))
			return
		}
		if count == 0 {
			break
		}
		suffix := strconv.Itoa(counter)
		trimmed := baseUsername
		if len(trimmed)+len(suffix) > 24 {
			trimmed = trimmed[:24-len(suffix)]
		}
		username = trimmed + suffix
		counter++
	}

	user = model.User{
		Email:        strings.ToLower(googleUser.Email),
		Username:     username,
		DisplayName:  googleUser.Name,
		Bio:          "",
		AvatarURL:    googleUser.Picture,
		GoogleID:     &googleUser.GoogleID,
		AuthProvider: "google",
	}
	if user.AvatarURL == nil {
		user.AvatarURL = stringPtr(fmt.Sprintf("https://api.dicebear.com/9.x/initials/svg?seed=%s", username))
	}

	if err := api.db.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&user).Error; err != nil {
			return err
		}
		group := model.Group{Name: fmt.Sprintf("%s's Squad", user.DisplayName), OwnerID: user.ID}
		if err := tx.Create(&group).Error; err != nil {
			return err
		}
		return tx.Create(&model.GroupMembership{GroupID: group.ID, UserID: user.ID, Role: "owner"}).Error
	}); err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusConflict, "Google authentication failed. Please try again.", err))
		return
	}

	api.searchIndex.AddUsername(user.Username)
	response, err := api.tokenResponseForUser(&user)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, response)
}

func (api *API) me(w http.ResponseWriter, r *http.Request) {
	user, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, serializeUser(user))
}

func (api *API) getProfile(w http.ResponseWriter, r *http.Request) {
	api.me(w, r)
}

func (api *API) updateProfile(w http.ResponseWriter, r *http.Request) {
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

	displayNameRaw, ok, _ := bodyString(payload, "displayName", "display_name")
	bioRaw, bioOK, _ := bodyString(payload, "bio")
	favoriteTopicRaw, _, _ := bodyOptionalString(payload, "favoriteTopic", "favorite_topic")
	favoritePlatformRaw, _, _ := bodyOptionalString(payload, "favoritePlatform", "favorite_platform")
	avatarURLRaw, _, _ := bodyOptionalString(payload, "avatarUrl", "avatar_url")
	leetcodeHandleRaw, _, _ := bodyOptionalString(payload, "leetcodeHandle", "leetcode_handle")
	codeforcesHandleRaw, _, _ := bodyOptionalString(payload, "codeforcesHandle", "codeforces_handle")
	codechefHandleRaw, _, _ := bodyOptionalString(payload, "codechefHandle", "codechef_handle")
	atcoderHandleRaw, _, _ := bodyOptionalString(payload, "atcoderHandle", "atcoder_handle")

	issues := make([]apperror.ValidationIssue, 0)
	if !ok {
		issues = append(issues, validationIssue("body", "displayName", "Field required."))
	}
	if !bioOK {
		bioRaw = ""
	}
	if len(issues) > 0 {
		writeAPIError(w, apperror.Validation(issues...))
		return
	}

	displayName, err := validation.NormalizeRequiredText(displayNameRaw, "Display name")
	if err != nil {
		issues = append(issues, validationIssue("body", "displayName", err.Error()+"."))
	}
	bio, err := validation.NormalizeBioText(bioRaw)
	if err != nil {
		issues = append(issues, validationIssue("body", "bio", err.Error()+"."))
	}
	favoriteTopic, err := validation.NormalizeOptionalText(favoriteTopicRaw, "Favorite topic")
	if err != nil {
		issues = append(issues, validationIssue("body", "favoriteTopic", err.Error()+"."))
	}
	favoritePlatform, err := validation.NormalizeOptionalText(favoritePlatformRaw, "Favorite platform")
	if err != nil {
		issues = append(issues, validationIssue("body", "favoritePlatform", err.Error()+"."))
	}
	avatarURL, err := validation.ValidateProfileImageURL(avatarURLRaw)
	if err != nil {
		issues = append(issues, validationIssue("body", "avatarUrl", err.Error()+"."))
	}
	leetcodeHandle, err := validation.NormalizeOptionalText(leetcodeHandleRaw, "LeetCode handle")
	if err != nil {
		issues = append(issues, validationIssue("body", "leetcodeHandle", err.Error()+"."))
	}
	codeforcesHandle, err := validation.NormalizeOptionalText(codeforcesHandleRaw, "Codeforces handle")
	if err != nil {
		issues = append(issues, validationIssue("body", "codeforcesHandle", err.Error()+"."))
	}
	codechefHandle, err := validation.NormalizeOptionalText(codechefHandleRaw, "CodeChef handle")
	if err != nil {
		issues = append(issues, validationIssue("body", "codechefHandle", err.Error()+"."))
	}
	atcoderHandle, err := validation.NormalizeOptionalText(atcoderHandleRaw, "AtCoder handle")
	if err != nil {
		issues = append(issues, validationIssue("body", "atcoderHandle", err.Error()+"."))
	}
	if len(issues) > 0 {
		writeAPIError(w, apperror.Validation(issues...))
		return
	}

	currentUser.DisplayName = displayName
	currentUser.Bio = bio
	currentUser.FavoriteTopic = favoriteTopic
	currentUser.FavoritePlatform = favoritePlatform
	currentUser.AvatarURL = avatarURL
	currentUser.LeetcodeHandle = leetcodeHandle
	currentUser.CodeforcesHandle = codeforcesHandle
	currentUser.CodechefHandle = codechefHandle
	currentUser.AtcoderHandle = atcoderHandle

	if err := api.db.WithContext(r.Context()).Save(currentUser).Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to update the profile.", err))
		return
	}
	writeJSON(w, http.StatusOK, serializeUser(currentUser))
}

func (api *API) autocompleteUsers(w http.ResponseWriter, r *http.Request) {
	if _, err := api.currentUser(r); err != nil {
		writeAPIError(w, err)
		return
	}
	query := strings.TrimSpace(strings.TrimPrefix(r.URL.Query().Get("q"), "@"))
	if query == "" {
		writeAPIError(w, apperror.Validation(validationIssue("query", "q", "String should have at least 1 character.")))
		return
	}
	writeJSON(w, http.StatusOK, api.searchIndex.SearchUsernames(query, 10))
}

func (api *API) autocompleteProblems(w http.ResponseWriter, r *http.Request) {
	if _, err := api.currentUser(r); err != nil {
		writeAPIError(w, err)
		return
	}
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	if query == "" {
		writeAPIError(w, apperror.Validation(validationIssue("query", "q", "String should have at least 1 character.")))
		return
	}
	writeJSON(w, http.StatusOK, api.searchIndex.SearchProblems(query, 10))
}

func (api *API) docsPage(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`<!doctype html><html><body><h1>AlgoSphere API Docs</h1><p>Use <a href="/openapi.json">/openapi.json</a> for the generated contract placeholder.</p></body></html>`))
}

func (api *API) openapiPlaceholder(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"openapi": "3.1.0",
		"info": map[string]string{
			"title":   api.settings.AppName,
			"version": "go-migration",
		},
		"paths": map[string]any{},
	})
}
