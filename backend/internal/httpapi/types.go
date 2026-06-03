package httpapi

import (
	"encoding/json"
	"time"

	"algosphere/backend/internal/analytics"
)

type userSummary struct {
	ID               uint64  `json:"id"`
	Email            string  `json:"email"`
	Username         string  `json:"username"`
	DisplayName      string  `json:"displayName"`
	Bio              string  `json:"bio"`
	FavoriteTopic    *string `json:"favoriteTopic,omitempty"`
	FavoritePlatform *string `json:"favoritePlatform,omitempty"`
	AvatarURL        *string `json:"avatarUrl,omitempty"`
	LeetcodeHandle   *string `json:"leetcodeHandle,omitempty"`
	CodeforcesHandle *string `json:"codeforcesHandle,omitempty"`
	CodechefHandle   *string `json:"codechefHandle,omitempty"`
	AtcoderHandle    *string `json:"atcoderHandle,omitempty"`
}

type tokenResponse struct {
	AccessToken string      `json:"accessToken"`
	TokenType   string      `json:"tokenType"`
	User        userSummary `json:"user"`
}

type friendUser struct {
	ID               uint64  `json:"id"`
	Username         string  `json:"username"`
	DisplayName      string  `json:"displayName"`
	AvatarURL        *string `json:"avatarUrl,omitempty"`
	IsFriend         bool    `json:"isFriend"`
	FriendshipStatus string  `json:"friendshipStatus"`
}

type friendLookupResponse struct {
	User *friendUser `json:"user"`
}

type friendRequestResponse struct {
	ID        uint64     `json:"id"`
	FromUser  friendUser `json:"fromUser"`
	CreatedAt time.Time  `json:"createdAt"`
}

type groupMember struct {
	ID       uint64 `json:"id"`
	Username string `json:"username"`
}

type groupSummary struct {
	ID           uint64        `json:"id"`
	Name         string        `json:"name"`
	MemberCount  int           `json:"memberCount"`
	ProblemCount int           `json:"problemCount"`
	LastActiveAt *time.Time    `json:"lastActiveAt,omitempty"`
	Members      []string      `json:"members"`
	MemberDetail []groupMember `json:"memberDetails"`
	IsOwner      bool          `json:"isOwner"`
}

type topGroupSummary struct {
	ID            uint64     `json:"id"`
	Name          string     `json:"name"`
	MemberCount   int        `json:"memberCount"`
	ProblemCount  int        `json:"problemCount"`
	LastActiveAt  *time.Time `json:"lastActiveAt,omitempty"`
	OwnerUsername string     `json:"ownerUsername"`
	JoinStatus    *string    `json:"joinStatus,omitempty"`
}

type joinRequestSummary struct {
	ID          uint64    `json:"id"`
	GroupID     uint64    `json:"groupId"`
	GroupName   string    `json:"groupName"`
	UserID      uint64    `json:"userId"`
	Username    string    `json:"username"`
	DisplayName string    `json:"displayName"`
	AvatarURL   *string   `json:"avatarUrl,omitempty"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"createdAt"`
}

type problemSummary struct {
	ID            uint64    `json:"id"`
	Title         string    `json:"title"`
	Contest       *string   `json:"contest,omitempty"`
	Tags          *string   `json:"tags,omitempty"`
	Difficulty    string    `json:"difficulty"`
	URL           string    `json:"url"`
	Platform      string    `json:"platform"`
	SharedBy      string    `json:"sharedBy"`
	ThumbnailURL  *string   `json:"thumbnailUrl,omitempty"`
	SolvedByCount *int      `json:"solvedByCount,omitempty"`
	SharedAt      time.Time `json:"sharedAt"`
}

type globalStatsResponse struct {
	GroupsCreated  int64 `json:"groupsCreated"`
	ProblemsShared int64 `json:"problemsShared"`
	ActiveMembers  int64 `json:"activeMembers"`
}

type challengeParticipantSummary struct {
	UserID      uint64  `json:"userId"`
	Username    string  `json:"username"`
	DisplayName string  `json:"displayName"`
	AvatarURL   *string `json:"avatarUrl,omitempty"`
	Status      string  `json:"status"`
}

type challengeProblemSummary struct {
	ID           uint64  `json:"id"`
	ProblemURL   string  `json:"problemUrl"`
	Title        string  `json:"title"`
	ContestID    *int    `json:"contestId,omitempty"`
	ProblemIndex *string `json:"problemIndex,omitempty"`
	Rating       *int    `json:"rating,omitempty"`
	Tags         *string `json:"tags,omitempty"`
	OrderIndex   int16   `json:"orderIndex"`
}

type challengeSummary struct {
	ID           uint64                        `json:"id"`
	Title        string                        `json:"title"`
	Platform     string                        `json:"platform"`
	NumProblems  int16                         `json:"numProblems"`
	MinRating    *int                          `json:"minRating,omitempty"`
	MaxRating    *int                          `json:"maxRating,omitempty"`
	Tags         *string                       `json:"tags,omitempty"`
	Status       string                        `json:"status"`
	CreatedBy    string                        `json:"createdBy"`
	CreatedByID  uint64                        `json:"createdById"`
	Participants []challengeParticipantSummary `json:"participants"`
	Problems     []challengeProblemSummary     `json:"problems"`
	CreatedAt    time.Time                     `json:"createdAt"`
	StartedAt    *time.Time                    `json:"startedAt,omitempty"`
}

type registerRequest struct {
	Email            string
	Username         string
	DisplayName      string
	Password         string
	FavoriteTopic    *string
	FavoritePlatform *string
}

func (r *registerRequest) UnmarshalJSON(data []byte) error {
	var raw struct {
		Email                 string  `json:"email"`
		Username              string  `json:"username"`
		DisplayName           string  `json:"displayName"`
		DisplayNameSnake      string  `json:"display_name"`
		Password              string  `json:"password"`
		FavoriteTopic         *string `json:"favoriteTopic"`
		FavoriteTopicSnake    *string `json:"favorite_topic"`
		FavoritePlatform      *string `json:"favoritePlatform"`
		FavoritePlatformSnake *string `json:"favorite_platform"`
	}
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	r.Email = raw.Email
	r.Username = raw.Username
	r.DisplayName = firstString(raw.DisplayName, raw.DisplayNameSnake)
	r.Password = raw.Password
	r.FavoriteTopic = firstStringPtr(raw.FavoriteTopic, raw.FavoriteTopicSnake)
	r.FavoritePlatform = firstStringPtr(raw.FavoritePlatform, raw.FavoritePlatformSnake)
	return nil
}

type loginRequest struct {
	Identifier string
	Password   string
}

func (r *loginRequest) UnmarshalJSON(data []byte) error {
	var raw struct {
		Identifier string `json:"identifier"`
		Email      string `json:"email"`
		Password   string `json:"password"`
	}
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	r.Identifier = firstString(raw.Identifier, raw.Email)
	r.Password = raw.Password
	return nil
}

type googleAuthRequest struct {
	Code string `json:"code"`
}

type profileUpdateRequest struct {
	DisplayName      string
	Bio              string
	FavoriteTopic    *string
	FavoritePlatform *string
	AvatarURL        *string
	LeetcodeHandle   *string
	CodeforcesHandle *string
	CodechefHandle   *string
	AtcoderHandle    *string
}

func (r *profileUpdateRequest) UnmarshalJSON(data []byte) error {
	var raw struct {
		DisplayName           string  `json:"displayName"`
		DisplayNameSnake      string  `json:"display_name"`
		Bio                   string  `json:"bio"`
		FavoriteTopic         *string `json:"favoriteTopic"`
		FavoriteTopicSnake    *string `json:"favorite_topic"`
		FavoritePlatform      *string `json:"favoritePlatform"`
		FavoritePlatformSnake *string `json:"favorite_platform"`
		AvatarURL             *string `json:"avatarUrl"`
		AvatarURLSnake        *string `json:"avatar_url"`
		LeetcodeHandle        *string `json:"leetcodeHandle"`
		LeetcodeHandleSnake   *string `json:"leetcode_handle"`
		CodeforcesHandle      *string `json:"codeforcesHandle"`
		CodeforcesHandleSnake *string `json:"codeforces_handle"`
		CodechefHandle        *string `json:"codechefHandle"`
		CodechefHandleSnake   *string `json:"codechef_handle"`
		AtcoderHandle         *string `json:"atcoderHandle"`
		AtcoderHandleSnake    *string `json:"atcoder_handle"`
	}
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	r.DisplayName = firstString(raw.DisplayName, raw.DisplayNameSnake)
	r.Bio = raw.Bio
	r.FavoriteTopic = firstStringPtr(raw.FavoriteTopic, raw.FavoriteTopicSnake)
	r.FavoritePlatform = firstStringPtr(raw.FavoritePlatform, raw.FavoritePlatformSnake)
	r.AvatarURL = firstStringPtr(raw.AvatarURL, raw.AvatarURLSnake)
	r.LeetcodeHandle = firstStringPtr(raw.LeetcodeHandle, raw.LeetcodeHandleSnake)
	r.CodeforcesHandle = firstStringPtr(raw.CodeforcesHandle, raw.CodeforcesHandleSnake)
	r.CodechefHandle = firstStringPtr(raw.CodechefHandle, raw.CodechefHandleSnake)
	r.AtcoderHandle = firstStringPtr(raw.AtcoderHandle, raw.AtcoderHandleSnake)
	return nil
}

type groupCreateRequest struct {
	Name      string
	MemberIDs []uint64
}

func (r *groupCreateRequest) UnmarshalJSON(data []byte) error {
	var raw struct {
		Name           string   `json:"name"`
		MemberIDs      []uint64 `json:"memberIds"`
		MemberIDsSnake []uint64 `json:"member_ids"`
	}
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	r.Name = raw.Name
	r.MemberIDs = firstUintSlice(raw.MemberIDs, raw.MemberIDsSnake)
	return nil
}

type groupAddMembersRequest struct {
	MemberIDs []uint64
}

func (r *groupAddMembersRequest) UnmarshalJSON(data []byte) error {
	var raw struct {
		MemberIDs      []uint64 `json:"memberIds"`
		MemberIDsSnake []uint64 `json:"member_ids"`
	}
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	r.MemberIDs = firstUintSlice(raw.MemberIDs, raw.MemberIDsSnake)
	return nil
}

type problemCreateRequest struct {
	URL string `json:"url"`
}

type challengeCreateRequest struct {
	Title         string
	Platform      string
	NumProblems   int
	MinRating     *int
	MaxRating     *int
	Tags          []string
	InviteUserIDs []uint64
}

func (r *challengeCreateRequest) UnmarshalJSON(data []byte) error {
	var raw struct {
		Title              string   `json:"title"`
		Platform           string   `json:"platform"`
		NumProblems        int      `json:"numProblems"`
		NumProblemsSnake   int      `json:"num_problems"`
		MinRating          *int     `json:"minRating"`
		MinRatingSnake     *int     `json:"min_rating"`
		MaxRating          *int     `json:"maxRating"`
		MaxRatingSnake     *int     `json:"max_rating"`
		Tags               []string `json:"tags"`
		InviteUserIDs      []uint64 `json:"inviteUserIds"`
		InviteUserIDsSnake []uint64 `json:"invite_user_ids"`
	}
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	r.Title = raw.Title
	r.Platform = raw.Platform
	r.NumProblems = firstInt(raw.NumProblems, raw.NumProblemsSnake)
	r.MinRating = firstIntPtr(raw.MinRating, raw.MinRatingSnake)
	r.MaxRating = firstIntPtr(raw.MaxRating, raw.MaxRatingSnake)
	r.Tags = raw.Tags
	r.InviteUserIDs = firstUintSlice(raw.InviteUserIDs, raw.InviteUserIDsSnake)
	return nil
}

type analyticsWindow string

const (
	window7d  analyticsWindow = "7d"
	window30d analyticsWindow = "30d"
	window90d analyticsWindow = "90d"
	windowAll analyticsWindow = "all"
)

var supportedWindows = map[analyticsWindow]struct{}{
	window7d:  {},
	window30d: {},
	window90d: {},
	windowAll: {},
}

type analyticsResponse = analytics.Response

func firstString(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func firstStringPtr(values ...*string) *string {
	for _, value := range values {
		if value != nil {
			return value
		}
	}
	return nil
}

func firstUintSlice(values ...[]uint64) []uint64 {
	for _, value := range values {
		if len(value) > 0 {
			return value
		}
	}
	return nil
}

func firstInt(values ...int) int {
	for _, value := range values {
		if value != 0 {
			return value
		}
	}
	return 0
}

func firstIntPtr(values ...*int) *int {
	for _, value := range values {
		if value != nil {
			return value
		}
	}
	return nil
}

func stringPtr(value string) *string {
	return &value
}
