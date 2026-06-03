package httpapi

import (
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"

	"algosphere/backend/internal/analytics"
	"algosphere/backend/internal/apperror"
	"algosphere/backend/internal/metadata"
	"algosphere/backend/internal/model"
	"algosphere/backend/internal/validation"
)

func (api *API) listGroups(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}

	var groups []model.Group
	if err := api.db.WithContext(r.Context()).
		Model(&model.Group{}).
		Joins("JOIN group_memberships ON group_memberships.group_id = groups.id").
		Where("group_memberships.user_id = ?", currentUser.ID).
		Preload("Memberships.User").
		Preload("Problems").
		Order("groups.created_at asc").
		Find(&groups).Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load groups.", err))
		return
	}

	response := make([]groupSummary, 0, len(groups))
	for index := range groups {
		response = append(response, serializeGroup(&groups[index], currentUser.ID))
	}
	writeJSON(w, http.StatusOK, response)
}

func (api *API) createGroup(w http.ResponseWriter, r *http.Request) {
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

	nameRaw, ok, _ := bodyString(payload, "name")
	memberIDsRaw, _, _ := bodyIntSlice(payload, "memberIds", "member_ids")
	issues := make([]apperror.ValidationIssue, 0)
	if !ok {
		issues = append(issues, validationIssue("body", "name", "Field required."))
	}
	if len(issues) > 0 {
		writeAPIError(w, apperror.Validation(issues...))
		return
	}

	name, err := validation.NormalizeRequiredText(nameRaw, "Group name")
	if err != nil {
		writeAPIError(w, apperror.Validation(validationIssue("body", "name", err.Error()+".")))
		return
	}
	memberIDs, err := normalizePositiveIDs(memberIDsRaw, "Member IDs", 0)
	if err != nil {
		writeAPIError(w, apperror.Validation(validationIssue("body", "memberIds", err.Error())))
		return
	}

	group := model.Group{Name: name, OwnerID: currentUser.ID}
	if err := api.db.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&group).Error; err != nil {
			return err
		}
		if err := tx.Create(&model.GroupMembership{GroupID: group.ID, UserID: currentUser.ID, Role: "owner"}).Error; err != nil {
			return err
		}

		filtered := make([]uint64, 0, len(memberIDs))
		for _, memberID := range memberIDs {
			if memberID != currentUser.ID {
				filtered = append(filtered, memberID)
			}
		}
		if len(filtered) == 0 {
			return nil
		}

		var users []model.User
		if err := tx.Where("id IN ?", filtered).Find(&users).Error; err != nil {
			return err
		}
		for _, user := range users {
			membership := model.GroupMembership{GroupID: group.ID, UserID: user.ID, Role: "member"}
			if err := tx.Create(&membership).Error; err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to create the group.", err))
		return
	}

	loadedGroup, err := api.getAccessibleGroup(r.Context(), group.ID, currentUser.ID)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, serializeGroup(loadedGroup, currentUser.ID))
}

func (api *API) topGroups(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}

	type row struct {
		ID            uint64
		Name          string
		OwnerID       uint64
		MemberCount   int
		ProblemCount  int
		LastActiveAt  *time.Time
		OwnerUsername string
	}

	var rows []row
	if err := api.db.WithContext(r.Context()).
		Table("groups").
		Select("groups.id, groups.name, groups.owner_id, COUNT(DISTINCT group_memberships.id) AS member_count, COUNT(DISTINCT problem_shares.id) AS problem_count, MAX(problem_shares.shared_at) AS last_active_at, users.username AS owner_username").
		Joins("JOIN group_memberships ON group_memberships.group_id = groups.id").
		Joins("JOIN users ON users.id = groups.owner_id").
		Joins("LEFT JOIN problem_shares ON problem_shares.group_id = groups.id").
		Group("groups.id, users.username").
		Having("COUNT(DISTINCT group_memberships.id) > 1").
		Order("COUNT(DISTINCT problem_shares.id) DESC, COUNT(DISTINCT group_memberships.id) DESC").
		Limit(20).
		Scan(&rows).Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load the top groups.", err))
		return
	}

	groupIDs := make([]uint64, 0, len(rows))
	for _, row := range rows {
		groupIDs = append(groupIDs, row.ID)
	}

	memberSet := make(map[uint64]struct{})
	pendingSet := make(map[uint64]struct{})
	if len(groupIDs) > 0 {
		var membershipIDs []uint64
		if err := api.db.WithContext(r.Context()).Model(&model.GroupMembership{}).
			Where("group_id IN ? AND user_id = ?", groupIDs, currentUser.ID).
			Pluck("group_id", &membershipIDs).Error; err == nil {
			memberSet = toSet(membershipIDs)
		}
		var pendingIDs []uint64
		if err := api.db.WithContext(r.Context()).Model(&model.JoinRequest{}).
			Where("group_id IN ? AND user_id = ? AND status = ?", groupIDs, currentUser.ID, "pending").
			Pluck("group_id", &pendingIDs).Error; err == nil {
			pendingSet = toSet(pendingIDs)
		}
	}

	response := make([]topGroupSummary, 0, len(rows))
	for _, row := range rows {
		var joinStatus *string
		if _, ok := memberSet[row.ID]; ok {
			joinStatus = stringPtr("member")
		} else if _, ok := pendingSet[row.ID]; ok {
			joinStatus = stringPtr("pending")
		}
		response = append(response, topGroupSummary{
			ID:            row.ID,
			Name:          row.Name,
			MemberCount:   row.MemberCount,
			ProblemCount:  row.ProblemCount,
			LastActiveAt:  row.LastActiveAt,
			OwnerUsername: row.OwnerUsername,
			JoinStatus:    joinStatus,
		})
	}
	writeJSON(w, http.StatusOK, response)
}

func (api *API) listJoinRequests(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}

	var requests []model.JoinRequest
	if err := api.db.WithContext(r.Context()).
		Joins("JOIN groups ON groups.id = join_requests.group_id").
		Where("groups.owner_id = ? AND join_requests.status = ?", currentUser.ID, "pending").
		Preload("User").
		Preload("Group").
		Order("join_requests.created_at desc").
		Find(&requests).Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load join requests.", err))
		return
	}

	response := make([]joinRequestSummary, 0, len(requests))
	for _, request := range requests {
		response = append(response, joinRequestSummary{
			ID:          request.ID,
			GroupID:     request.GroupID,
			GroupName:   request.Group.Name,
			UserID:      request.User.ID,
			Username:    request.User.Username,
			DisplayName: request.User.DisplayName,
			AvatarURL:   request.User.AvatarURL,
			Status:      request.Status,
			CreatedAt:   request.CreatedAt,
		})
	}
	writeJSON(w, http.StatusOK, response)
}

func (api *API) acceptJoinRequest(w http.ResponseWriter, r *http.Request) {
	api.resolveJoinRequestAction(w, r, "accepted")
}

func (api *API) rejectJoinRequest(w http.ResponseWriter, r *http.Request) {
	api.resolveJoinRequestAction(w, r, "rejected")
}

func (api *API) resolveJoinRequestAction(w http.ResponseWriter, r *http.Request, status string) {
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

	var joinRequest model.JoinRequest
	if err := api.db.WithContext(r.Context()).
		Where("id = ? AND status = ?", requestID, "pending").
		Preload("Group").
		First(&joinRequest).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) || joinRequest.Group.OwnerID != currentUser.ID {
			writeAPIError(w, apperror.NotFound("Join request not found."))
			return
		}
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load the join request.", err))
		return
	}
	if joinRequest.Group.OwnerID != currentUser.ID {
		writeAPIError(w, apperror.NotFound("Join request not found."))
		return
	}

	if err := api.db.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&joinRequest).Update("status", status).Error; err != nil {
			return err
		}
		if status == "accepted" {
			membership := model.GroupMembership{GroupID: joinRequest.GroupID, UserID: joinRequest.UserID, Role: "member"}
			if err := tx.Where("group_id = ? AND user_id = ?", joinRequest.GroupID, joinRequest.UserID).FirstOrCreate(&membership).Error; err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to update the join request.", err))
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": status})
}

func (api *API) requestJoinGroup(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	groupID, err := parseUintParam(chi.URLParam(r, "groupID"), "groupID")
	if err != nil {
		writeAPIError(w, err)
		return
	}

	var group model.Group
	if err := api.db.WithContext(r.Context()).First(&group, groupID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeAPIError(w, apperror.NotFound("Group not found."))
			return
		}
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load the group.", err))
		return
	}

	var membershipCount int64
	if err := api.db.WithContext(r.Context()).Model(&model.GroupMembership{}).Where("group_id = ? AND user_id = ?", groupID, currentUser.ID).Count(&membershipCount).Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to inspect group membership.", err))
		return
	}
	if membershipCount > 0 {
		writeAPIError(w, apperror.Conflict("You are already a member of this squad."))
		return
	}

	var pendingCount int64
	if err := api.db.WithContext(r.Context()).Model(&model.JoinRequest{}).Where("group_id = ? AND user_id = ? AND status = ?", groupID, currentUser.ID, "pending").Count(&pendingCount).Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to inspect join requests.", err))
		return
	}
	if pendingCount > 0 {
		writeAPIError(w, apperror.Conflict("You already have a pending request for this squad."))
		return
	}

	if err := api.db.WithContext(r.Context()).Create(&model.JoinRequest{GroupID: groupID, UserID: currentUser.ID, Status: "pending"}).Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to create the join request.", err))
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"status": "pending"})
}

func (api *API) deleteGroup(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	groupID, err := parseUintParam(chi.URLParam(r, "groupID"), "groupID")
	if err != nil {
		writeAPIError(w, err)
		return
	}

	result := api.db.WithContext(r.Context()).Where("id = ? AND owner_id = ?", groupID, currentUser.ID).Delete(&model.Group{})
	if result.Error != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to delete the group.", result.Error))
		return
	}
	if result.RowsAffected == 0 {
		writeAPIError(w, apperror.NotFound("Group not found or you don't have permission."))
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (api *API) addGroupMembers(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	groupID, err := parseUintParam(chi.URLParam(r, "groupID"), "groupID")
	if err != nil {
		writeAPIError(w, err)
		return
	}
	group, err := api.getAccessibleGroup(r.Context(), groupID, currentUser.ID)
	if err != nil {
		writeAPIError(w, err)
		return
	}

	payload, err := decodeBody(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	memberIDsRaw, ok, _ := bodyIntSlice(payload, "memberIds", "member_ids")
	if !ok {
		writeAPIError(w, apperror.Validation(validationIssue("body", "memberIds", "Field required.")))
		return
	}
	memberIDs, err := normalizePositiveIDs(memberIDsRaw, "Member IDs", 1)
	if err != nil {
		writeAPIError(w, apperror.Validation(validationIssue("body", "memberIds", err.Error())))
		return
	}

	existing := make(map[uint64]struct{}, len(group.Memberships))
	for _, membership := range group.Memberships {
		existing[membership.UserID] = struct{}{}
	}

	newIDs := make([]uint64, 0)
	for _, memberID := range memberIDs {
		if _, ok := existing[memberID]; !ok {
			newIDs = append(newIDs, memberID)
		}
	}

	if len(newIDs) > 0 {
		var users []model.User
		if err := api.db.WithContext(r.Context()).Where("id IN ?", newIDs).Find(&users).Error; err != nil {
			writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load users to add to the group.", err))
			return
		}
		for _, user := range users {
			membership := model.GroupMembership{GroupID: group.ID, UserID: user.ID, Role: "member"}
			if err := api.db.WithContext(r.Context()).Create(&membership).Error; err != nil {
				writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to add group members.", err))
				return
			}
		}
		group, err = api.getAccessibleGroup(r.Context(), groupID, currentUser.ID)
		if err != nil {
			writeAPIError(w, err)
			return
		}
	}

	writeJSON(w, http.StatusOK, serializeGroup(group, currentUser.ID))
}

func (api *API) removeGroupMember(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	groupID, err := parseUintParam(chi.URLParam(r, "groupID"), "groupID")
	if err != nil {
		writeAPIError(w, err)
		return
	}
	userID, err := parseUintParam(chi.URLParam(r, "userID"), "userID")
	if err != nil {
		writeAPIError(w, err)
		return
	}

	group, err := api.getAccessibleGroup(r.Context(), groupID, currentUser.ID)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	if userID != currentUser.ID && group.OwnerID != currentUser.ID {
		writeAPIError(w, apperror.Forbidden("Not authorized to remove this member."))
		return
	}

	var membership model.GroupMembership
	if err := api.db.WithContext(r.Context()).Where("group_id = ? AND user_id = ?", group.ID, userID).First(&membership).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeAPIError(w, apperror.NotFound("Member not found in group."))
			return
		}
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load the group membership.", err))
		return
	}

	if err := api.db.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		if userID == group.OwnerID {
			var nextMembership model.GroupMembership
			err := tx.Where("group_id = ? AND user_id <> ?", group.ID, userID).Order("created_at asc").First(&nextMembership).Error
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return tx.Delete(&model.Group{}, group.ID).Error
			}
			if err != nil {
				return err
			}
			if err := tx.Model(&model.Group{}).Where("id = ?", group.ID).Update("owner_id", nextMembership.UserID).Error; err != nil {
				return err
			}
			if err := tx.Model(&nextMembership).Update("role", "owner").Error; err != nil {
				return err
			}
		}
		return tx.Delete(&membership).Error
	}); err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to remove the group member.", err))
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (api *API) listGroupProblems(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	groupID, err := parseUintParam(chi.URLParam(r, "groupID"), "groupID")
	if err != nil {
		writeAPIError(w, err)
		return
	}
	group, err := api.getAccessibleGroup(r.Context(), groupID, currentUser.ID)
	if err != nil {
		writeAPIError(w, err)
		return
	}

	var problems []model.ProblemShare
	if err := api.db.WithContext(r.Context()).
		Where("group_id = ?", group.ID).
		Preload("SharedBy").
		Order("shared_at desc").
		Find(&problems).Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load group problems.", err))
		return
	}

	response := make([]problemSummary, 0, len(problems))
	for index := range problems {
		response = append(response, serializeProblem(&problems[index]))
	}
	writeJSON(w, http.StatusOK, response)
}

func (api *API) addProblem(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	groupID, err := parseUintParam(chi.URLParam(r, "groupID"), "groupID")
	if err != nil {
		writeAPIError(w, err)
		return
	}
	group, err := api.getAccessibleGroup(r.Context(), groupID, currentUser.ID)
	if err != nil {
		writeAPIError(w, err)
		return
	}

	payload, err := decodeBody(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	urlRaw, ok, _ := bodyString(payload, "url")
	if !ok {
		writeAPIError(w, apperror.Validation(validationIssue("body", "url", "Field required.")))
		return
	}
	urlValue, err := validation.ValidateProblemURL(urlRaw)
	if err != nil {
		writeAPIError(w, apperror.Validation(validationIssue("body", "url", err.Error()+".")))
		return
	}

	resolved, err := metadata.ResolveProblem(urlValue)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	problem := model.ProblemShare{
		GroupID:           group.ID,
		SharedByID:        currentUser.ID,
		Platform:          resolved.Platform,
		ProblemURL:        resolved.ProblemURL,
		PlatformProblemID: resolved.PlatformProblemID,
		Title:             resolved.Title,
		Contest:           resolved.Contest,
		Tags:              resolved.Tags,
		Difficulty:        resolved.Difficulty,
		ThumbnailURL:      resolved.ThumbnailURL,
		SolvedByCount:     resolved.SolvedByCount,
		ProblemSignature:  resolved.Signature(),
	}
	if err := api.db.WithContext(r.Context()).Create(&problem).Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to add the problem to the group.", err))
		return
	}
	api.searchIndex.AddProblemTitle(problem.Title)

	if err := api.db.WithContext(r.Context()).Preload("SharedBy").First(&problem, problem.ID).Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load the newly added problem.", err))
		return
	}
	writeJSON(w, http.StatusCreated, serializeProblem(&problem))
}

func (api *API) removeGroupProblem(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	groupID, err := parseUintParam(chi.URLParam(r, "groupID"), "groupID")
	if err != nil {
		writeAPIError(w, err)
		return
	}
	problemID, err := parseUintParam(chi.URLParam(r, "problemID"), "problemID")
	if err != nil {
		writeAPIError(w, err)
		return
	}
	group, err := api.getAccessibleGroup(r.Context(), groupID, currentUser.ID)
	if err != nil {
		writeAPIError(w, err)
		return
	}

	var problem model.ProblemShare
	if err := api.db.WithContext(r.Context()).Where("id = ? AND group_id = ?", problemID, group.ID).First(&problem).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeAPIError(w, apperror.NotFound("Problem not found in group."))
			return
		}
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load the problem.", err))
		return
	}
	if problem.SharedByID != currentUser.ID && group.OwnerID != currentUser.ID {
		writeAPIError(w, apperror.Forbidden("Not authorized to remove this problem."))
		return
	}
	if err := api.db.WithContext(r.Context()).Delete(&problem).Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to remove the problem.", err))
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (api *API) getProblemsFeed(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}

	var problems []model.ProblemShare
	if err := api.db.WithContext(r.Context()).
		Joins("JOIN groups ON groups.id = problem_shares.group_id").
		Joins("JOIN group_memberships ON group_memberships.group_id = groups.id").
		Where("group_memberships.user_id = ?", currentUser.ID).
		Preload("SharedBy").
		Order("problem_shares.shared_at desc").
		Limit(50).
		Find(&problems).Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load the problems feed.", err))
		return
	}
	response := make([]problemSummary, 0, len(problems))
	for index := range problems {
		response = append(response, serializeProblem(&problems[index]))
	}
	writeJSON(w, http.StatusOK, response)
}

func (api *API) groupAnalytics(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}
	groupID, err := parseUintParam(chi.URLParam(r, "groupID"), "groupID")
	if err != nil {
		writeAPIError(w, err)
		return
	}
	group, err := api.getAccessibleGroup(r.Context(), groupID, currentUser.ID)
	if err != nil {
		writeAPIError(w, err)
		return
	}

	var problems []model.ProblemShare
	if err := api.db.WithContext(r.Context()).
		Where("group_id = ?", group.ID).
		Preload("SharedBy").
		Order("shared_at desc").
		Find(&problems).Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load analytics data.", err))
		return
	}
	window := r.URL.Query().Get("window")
	if window == "" {
		window = "30d"
	}
	response := analytics.Build(analytics.FilterByWindow(toAnalyticsRecords(problems), window, time.Now().UTC()))
	writeJSON(w, http.StatusOK, response)
}

func (api *API) personalAnalytics(w http.ResponseWriter, r *http.Request) {
	currentUser, err := api.currentUser(r)
	if err != nil {
		writeAPIError(w, err)
		return
	}

	var problems []model.ProblemShare
	if err := api.db.WithContext(r.Context()).
		Where("shared_by_id = ?", currentUser.ID).
		Preload("SharedBy").
		Order("shared_at desc").
		Find(&problems).Error; err != nil {
		writeAPIError(w, apperror.Wrap(http.StatusInternalServerError, "Failed to load analytics data.", err))
		return
	}
	window := r.URL.Query().Get("window")
	if window == "" {
		window = "30d"
	}
	response := analytics.Build(analytics.FilterByWindow(toAnalyticsRecords(problems), window, time.Now().UTC()))
	writeJSON(w, http.StatusOK, response)
}
