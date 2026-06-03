package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/gorilla/sessions"
	"gorm.io/gorm"

	"algosphere/backend/internal/analytics"
	"algosphere/backend/internal/apperror"
	"algosphere/backend/internal/config"
	"algosphere/backend/internal/database"
	"algosphere/backend/internal/metadata"
	"algosphere/backend/internal/model"
	"algosphere/backend/internal/ratelimit"
	"algosphere/backend/internal/search"
	"algosphere/backend/internal/security"
)

type Dependencies struct {
	Settings            config.Settings
	DB                  *gorm.DB
	SearchIndex         *search.Index
	AuthLimiter         *ratelimit.FixedWindowLimiter
	FriendLookupLimiter *ratelimit.FixedWindowLimiter
	AdminLimiter        *ratelimit.FixedWindowLimiter
	Logger              *slog.Logger
}

type API struct {
	settings            config.Settings
	db                  *gorm.DB
	searchIndex         *search.Index
	authLimiter         *ratelimit.FixedWindowLimiter
	friendLookupLimiter *ratelimit.FixedWindowLimiter
	adminLimiter        *ratelimit.FixedWindowLimiter
	logger              *slog.Logger
	sessionStore        *sessions.CookieStore
}

func NewRouter(deps Dependencies) http.Handler {
	api := &API{
		settings:            deps.Settings,
		db:                  deps.DB,
		searchIndex:         deps.SearchIndex,
		authLimiter:         deps.AuthLimiter,
		friendLookupLimiter: deps.FriendLookupLimiter,
		adminLimiter:        deps.AdminLimiter,
		logger:              deps.Logger,
		sessionStore:        sessions.NewCookieStore([]byte(deps.Settings.SecretKey)),
	}
	api.sessionStore.Options = &sessions.Options{
		Path:     "/",
		MaxAge:   86400 * 14,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   deps.Settings.Environment == "production",
	}

	router := chi.NewRouter()
	router.Use(middleware.RequestID)
	router.Use(middleware.RealIP)
	router.Use(middleware.Logger)
	router.Use(middleware.Recoverer)
	router.Use(withSecurityHeaders(deps.Settings.Environment))
	router.Use(withHostValidation(deps.Settings.AllowedHosts, deps.Settings.Environment))
	router.Use(withCORS(deps.Settings.CORSOrigins, deps.Settings.Environment))

	router.Get("/api/health", api.health)
	router.Get("/api/stats", api.getGlobalStats)
	router.Get("/api/auth/check-username", api.checkUsername)
	router.Post("/api/auth/register", api.register)
	router.Post("/api/auth/login", api.login)
	router.Post("/api/auth/google", api.googleAuth)
	router.Get("/api/auth/me", api.me)
	router.Get("/api/profile", api.getProfile)
	router.Patch("/api/profile", api.updateProfile)
	router.Get("/api/friends/lookup", api.lookupFriendByUsername)
	router.Get("/api/friends/search", api.searchUsers)
	router.Get("/api/autocomplete/users", api.autocompleteUsers)
	router.Get("/api/autocomplete/problems", api.autocompleteProblems)
	router.Get("/api/friends/list", api.listFriends)
	router.Post("/api/friends/{friendID}", api.addFriend)
	router.Delete("/api/friends/{friendID}", api.removeFriend)
	router.Get("/api/friends/requests", api.listFriendRequests)
	router.Post("/api/friends/requests/{requestID}/accept", api.acceptFriendRequest)
	router.Post("/api/friends/requests/{requestID}/reject", api.rejectFriendRequest)
	router.Get("/api/groups", api.listGroups)
	router.Post("/api/groups", api.createGroup)
	router.Get("/api/groups/top", api.topGroups)
	router.Get("/api/groups/join-requests", api.listJoinRequests)
	router.Post("/api/groups/join-requests/{requestID}/accept", api.acceptJoinRequest)
	router.Post("/api/groups/join-requests/{requestID}/reject", api.rejectJoinRequest)
	router.Post("/api/groups/{groupID}/request-join", api.requestJoinGroup)
	router.Delete("/api/groups/{groupID}", api.deleteGroup)
	router.Post("/api/groups/{groupID}/members", api.addGroupMembers)
	router.Delete("/api/groups/{groupID}/members/{userID}", api.removeGroupMember)
	router.Get("/api/groups/{groupID}/problems", api.listGroupProblems)
	router.Post("/api/groups/{groupID}/problems", api.addProblem)
	router.Delete("/api/groups/{groupID}/problems/{problemID}", api.removeGroupProblem)
	router.Get("/api/problems/feed", api.getProblemsFeed)
	router.Get("/api/groups/{groupID}/analytics", api.groupAnalytics)
	router.Get("/api/analytics/me", api.personalAnalytics)
	router.Post("/api/challenges", api.createChallenge)
	router.Get("/api/challenges", api.listChallenges)
	router.Get("/api/challenges/{challengeID}", api.getChallenge)
	router.Post("/api/challenges/{challengeID}/accept", api.acceptChallenge)
	router.Post("/api/challenges/{challengeID}/decline", api.declineChallenge)
	router.Post("/api/challenges/{challengeID}/start", api.startChallenge)

	if deps.Settings.EnableAdmin {
		router.Get("/admin", api.adminRoot)
		router.Get("/admin/login", api.adminLoginPage)
		router.Post("/admin/login", api.adminLogin)
		router.Group(func(admin chi.Router) {
			admin.Use(api.requireAdminSession)
			admin.Post("/admin/logout", api.adminLogout)
			admin.Get("/admin/", api.adminHome)
			admin.Get("/admin/models/{resource}", api.adminListResource)
			admin.Get("/admin/models/{resource}/{recordID}", api.adminShowResource)
		})
	}

	if deps.Settings.EnableDocs {
		router.Get("/docs", api.docsPage)
		router.Get("/openapi.json", api.openapiPlaceholder)
	}

	return router
}

func (api *API) health(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	if err := database.Ping(ctx, api.db); err != nil {
		writeAPIError(w, apperror.ServiceUnavailable("Database unavailable."))
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "database": "ok"})
}

func (api *API) currentUser(r *http.Request) (*model.User, error) {
	header := strings.TrimSpace(r.Header.Get("Authorization"))
	if header == "" {
		return nil, apperror.Unauthorized("Authentication credentials were not provided.")
	}
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || strings.TrimSpace(parts[1]) == "" {
		return nil, apperror.Unauthorized("Authentication credentials were not provided.")
	}

	claims, err := security.ParseAccessToken(api.settings, strings.TrimSpace(parts[1]))
	if err != nil {
		return nil, apperror.Unauthorized("Invalid or expired authentication token.")
	}
	userID, err := strconv.ParseUint(claims.Subject, 10, 64)
	if err != nil || userID == 0 {
		return nil, apperror.Unauthorized("Invalid authentication token.")
	}

	var user model.User
	if err := api.db.WithContext(r.Context()).First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.Unauthorized("Authenticated user no longer exists.")
		}
		return nil, apperror.Wrap(http.StatusInternalServerError, "Failed to load the authenticated user.", err)
	}
	return &user, nil
}

func (api *API) findUserByIdentifier(ctx context.Context, identifier string) (*model.User, error) {
	var user model.User
	err := api.db.WithContext(ctx).
		Where("LOWER(email) = ? OR LOWER(username) = ?", strings.ToLower(identifier), strings.ToLower(identifier)).
		First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (api *API) acceptedFriendIDSet(ctx context.Context, userID uint64) (map[uint64]struct{}, error) {
	var friendIDs []uint64
	if err := api.db.WithContext(ctx).
		Model(&model.Friendship{}).
		Where("user_id = ? AND status = ?", userID, "accepted").
		Pluck("friend_id", &friendIDs).Error; err != nil {
		return nil, err
	}
	return toSet(friendIDs), nil
}

func (api *API) pendingOutgoingSet(ctx context.Context, userID uint64) (map[uint64]struct{}, error) {
	var friendIDs []uint64
	if err := api.db.WithContext(ctx).
		Model(&model.Friendship{}).
		Where("user_id = ? AND status = ?", userID, "pending").
		Pluck("friend_id", &friendIDs).Error; err != nil {
		return nil, err
	}
	return toSet(friendIDs), nil
}

func (api *API) pendingIncomingSet(ctx context.Context, userID uint64) (map[uint64]struct{}, error) {
	var userIDs []uint64
	if err := api.db.WithContext(ctx).
		Model(&model.Friendship{}).
		Where("friend_id = ? AND status = ?", userID, "pending").
		Pluck("user_id", &userIDs).Error; err != nil {
		return nil, err
	}
	return toSet(userIDs), nil
}

func (api *API) getAccessibleGroup(ctx context.Context, groupID uint64, userID uint64) (*model.Group, error) {
	var group model.Group
	err := api.db.WithContext(ctx).
		Joins("JOIN group_memberships ON group_memberships.group_id = groups.id").
		Where("groups.id = ? AND group_memberships.user_id = ?", groupID, userID).
		Preload("Memberships.User").
		Preload("Problems").
		First(&group).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, apperror.NotFound("Group not found.")
	}
	if err != nil {
		return nil, apperror.Wrap(http.StatusInternalServerError, "Failed to load the requested group.", err)
	}
	return &group, nil
}

func serializeUser(user *model.User) userSummary {
	return userSummary{
		ID:               user.ID,
		Email:            user.Email,
		Username:         user.Username,
		DisplayName:      user.DisplayName,
		Bio:              user.Bio,
		FavoriteTopic:    user.FavoriteTopic,
		FavoritePlatform: user.FavoritePlatform,
		AvatarURL:        user.AvatarURL,
		LeetcodeHandle:   user.LeetcodeHandle,
		CodeforcesHandle: user.CodeforcesHandle,
		CodechefHandle:   user.CodechefHandle,
		AtcoderHandle:    user.AtcoderHandle,
	}
}

func (api *API) tokenResponseForUser(user *model.User) (tokenResponse, error) {
	token, err := security.CreateAccessToken(api.settings, strconv.FormatUint(user.ID, 10))
	if err != nil {
		return tokenResponse{}, apperror.Wrap(http.StatusInternalServerError, "Failed to create an access token.", err)
	}
	return tokenResponse{
		AccessToken: token,
		TokenType:   "bearer",
		User:        serializeUser(user),
	}, nil
}

func serializeFriendUser(user *model.User, friendIDs map[uint64]struct{}, pendingOutgoing map[uint64]struct{}, pendingIncoming map[uint64]struct{}) friendUser {
	status := "none"
	_, isFriend := friendIDs[user.ID]
	if isFriend {
		status = "accepted"
	} else if _, ok := pendingOutgoing[user.ID]; ok {
		status = "pending_outgoing"
	} else if _, ok := pendingIncoming[user.ID]; ok {
		status = "pending_incoming"
	}
	return friendUser{
		ID:               user.ID,
		Username:         user.Username,
		DisplayName:      user.DisplayName,
		AvatarURL:        user.AvatarURL,
		IsFriend:         isFriend,
		FriendshipStatus: status,
	}
}

func serializeGroup(group *model.Group, currentUserID uint64) groupSummary {
	memberNames := make([]string, 0, len(group.Memberships))
	memberDetails := make([]groupMember, 0, len(group.Memberships))
	for _, membership := range group.Memberships {
		memberNames = append(memberNames, membership.User.Username)
		memberDetails = append(memberDetails, groupMember{ID: membership.User.ID, Username: membership.User.Username})
	}
	sort.Strings(memberNames)
	sort.Slice(memberDetails, func(i int, j int) bool {
		return memberDetails[i].Username < memberDetails[j].Username
	})

	var lastActiveAt *time.Time
	for _, problem := range group.Problems {
		if lastActiveAt == nil || problem.SharedAt.After(*lastActiveAt) {
			value := problem.SharedAt
			lastActiveAt = &value
		}
	}

	return groupSummary{
		ID:           group.ID,
		Name:         group.Name,
		MemberCount:  len(group.Memberships),
		ProblemCount: len(group.Problems),
		LastActiveAt: lastActiveAt,
		Members:      memberNames,
		MemberDetail: memberDetails,
		IsOwner:      group.OwnerID == currentUserID,
	}
}

func serializeProblem(problem *model.ProblemShare) problemSummary {
	label := metadata.PlatformLabels()[problem.Platform]
	if label == "" {
		label = strings.Title(problem.Platform)
	}
	return problemSummary{
		ID:            problem.ID,
		Title:         problem.Title,
		Contest:       problem.Contest,
		Tags:          problem.Tags,
		Difficulty:    metadata.NormalizeDifficultyForPlatform(problem.Platform, problem.Difficulty, problem.PlatformProblemID),
		URL:           problem.ProblemURL,
		Platform:      label,
		SharedBy:      problem.SharedBy.Username,
		ThumbnailURL:  problem.ThumbnailURL,
		SolvedByCount: problem.SolvedByCount,
		SharedAt:      problem.SharedAt,
	}
}

func serializeChallenge(challenge *model.Challenge) challengeSummary {
	participants := make([]challengeParticipantSummary, 0, len(challenge.Participants))
	for _, participant := range challenge.Participants {
		participants = append(participants, challengeParticipantSummary{
			UserID:      participant.User.ID,
			Username:    participant.User.Username,
			DisplayName: participant.User.DisplayName,
			AvatarURL:   participant.User.AvatarURL,
			Status:      participant.Status,
		})
	}
	sort.Slice(participants, func(i int, j int) bool { return participants[i].Username < participants[j].Username })

	problems := make([]challengeProblemSummary, 0, len(challenge.Problems))
	for _, problem := range challenge.Problems {
		problems = append(problems, challengeProblemSummary{
			ID:           problem.ID,
			ProblemURL:   problem.ProblemURL,
			Title:        problem.Title,
			ContestID:    problem.ContestID,
			ProblemIndex: problem.ProblemIndex,
			Rating:       problem.Rating,
			Tags:         problem.Tags,
			OrderIndex:   problem.OrderIndex,
		})
	}
	sort.Slice(problems, func(i int, j int) bool { return problems[i].OrderIndex < problems[j].OrderIndex })

	return challengeSummary{
		ID:           challenge.ID,
		Title:        challenge.Title,
		Platform:     challenge.Platform,
		NumProblems:  challenge.NumProblems,
		MinRating:    challenge.MinRating,
		MaxRating:    challenge.MaxRating,
		Tags:         challenge.Tags,
		Status:       challenge.Status,
		CreatedBy:    challenge.CreatedBy.Username,
		CreatedByID:  challenge.CreatedByID,
		Participants: participants,
		Problems:     problems,
		CreatedAt:    challenge.CreatedAt,
		StartedAt:    challenge.StartedAt,
	}
}

func toAnalyticsRecords(problems []model.ProblemShare) []analytics.ProblemRecord {
	records := make([]analytics.ProblemRecord, 0, len(problems))
	for _, problem := range problems {
		records = append(records, analytics.ProblemRecord{
			Title:             problem.Title,
			Contest:           problem.Contest,
			Difficulty:        problem.Difficulty,
			Platform:          problem.Platform,
			PlatformProblemID: problem.PlatformProblemID,
			SharedAt:          problem.SharedAt,
			ProblemSignature:  problem.ProblemSignature,
			SharedByUsername:  problem.SharedBy.Username,
		})
	}
	return records
}

func buildAuthRateLimitKey(r *http.Request, identifier string) string {
	clientHost := r.RemoteAddr
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		clientHost = host
	}
	return strings.ToLower(clientHost + ":" + strings.TrimSpace(identifier))
}

func buildFriendLookupRateLimitKey(r *http.Request, userID uint64) string {
	clientHost := r.RemoteAddr
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		clientHost = host
	}
	return strconv.FormatUint(userID, 10) + ":" + clientHost
}

func toSet(values []uint64) map[uint64]struct{} {
	result := make(map[uint64]struct{}, len(values))
	for _, value := range values {
		result[value] = struct{}{}
	}
	return result
}

func withSecurityHeaders(environment string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if strings.HasPrefix(r.URL.Path, "/api/") {
				w.Header().Set("Cache-Control", "no-store")
				w.Header().Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
			}
			w.Header().Set("Permissions-Policy", "camera=(), geolocation=(), microphone=()")
			w.Header().Set("Referrer-Policy", "no-referrer")
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("X-Frame-Options", "DENY")
			if environment == "production" {
				w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
			}
			next.ServeHTTP(w, r)
		})
	}
}

func isPrivateOrLocalHost(host string) bool {
	host = strings.ToLower(host)
	if host == "localhost" || host == "127.0.0.1" || host == "::1" || host == "algosphere.local" {
		return true
	}
	ip := net.ParseIP(host)
	if ip == nil {
		return false
	}
	return ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast()
}

func withHostValidation(allowedHosts []string, environment string) func(http.Handler) http.Handler {
	allowed := make(map[string]struct{}, len(allowedHosts))
	for _, host := range allowedHosts {
		allowed[strings.ToLower(host)] = struct{}{}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			host := r.Host
			if strings.Contains(host, ":") {
				host = strings.Split(host, ":")[0]
			}
			if len(allowed) > 0 {
				normalizedHost := strings.ToLower(host)
				_, isAllowed := allowed[normalizedHost]
				if !isAllowed && (environment == "production" || !isPrivateOrLocalHost(normalizedHost)) {
					writeAPIError(w, apperror.BadRequest("Host is not allowed."))
					return
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

func withCORS(origins []string, environment string) func(http.Handler) http.Handler {
	allowed := make(map[string]struct{}, len(origins))
	for _, origin := range origins {
		allowed[origin] = struct{}{}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin != "" {
				isAllowed := false
				if _, ok := allowed[origin]; ok {
					isAllowed = true
				} else if environment != "production" {
					if u, err := url.Parse(origin); err == nil {
						host := u.Host
						if strings.Contains(host, ":") {
							host = strings.Split(host, ":")[0]
						}
						if isPrivateOrLocalHost(host) {
							isAllowed = true
						}
					}
				}

				if isAllowed {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					w.Header().Set("Access-Control-Allow-Credentials", "true")
					w.Header().Set("Vary", "Origin")
				}
				w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Authorization,Content-Type")
			}
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeAPIError(w http.ResponseWriter, err error) {
	var apiErr *apperror.Error
	if errors.As(err, &apiErr) {
		if len(apiErr.Issues) > 0 {
			writeJSON(w, apiErr.Status, map[string]any{"detail": apiErr.Issues})
			return
		}
		writeJSON(w, apiErr.Status, map[string]string{"detail": apiErr.Detail})
		return
	}
	writeJSON(w, http.StatusInternalServerError, map[string]string{"detail": "The request could not be completed. Please try again."})
}

func decodeJSON(r *http.Request, dest any) error {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(dest); err != nil {
		return err
	}
	if err := decoder.Decode(&struct{}{}); err != nil && !errors.Is(err, io.EOF) {
		return err
	}
	return nil
}
