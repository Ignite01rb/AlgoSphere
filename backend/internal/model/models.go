package model

import "time"

type User struct {
	ID               uint64    `gorm:"primaryKey"`
	Email            string    `gorm:"size:255;uniqueIndex;not null"`
	Username         string    `gorm:"size:32;uniqueIndex;not null"`
	DisplayName      string    `gorm:"size:120;not null"`
	Bio              string    `gorm:"size:255;not null;default:''"`
	FavoriteTopic    *string   `gorm:"size:120"`
	FavoritePlatform *string   `gorm:"size:120"`
	AvatarURL        *string   `gorm:"size:500"`
	LeetcodeHandle   *string   `gorm:"size:120"`
	CodeforcesHandle *string   `gorm:"size:120"`
	CodechefHandle   *string   `gorm:"size:120"`
	AtcoderHandle    *string   `gorm:"size:120"`
	PasswordHash     *string   `gorm:"size:255"`
	GoogleID         *string   `gorm:"size:255;uniqueIndex"`
	AuthProvider     string    `gorm:"size:32;not null;default:local"`
	CreatedAt        time.Time `gorm:"not null"`

	OwnedGroups    []Group           `gorm:"foreignKey:OwnerID"`
	Memberships    []GroupMembership `gorm:"foreignKey:UserID"`
	SharedProblems []ProblemShare    `gorm:"foreignKey:SharedByID"`
	Friends        []Friendship      `gorm:"foreignKey:UserID"`
}

func (User) TableName() string { return "users" }

type Friendship struct {
	ID        uint64    `gorm:"primaryKey"`
	UserID    uint64    `gorm:"not null;index;uniqueIndex:uq_friendship_pair"`
	FriendID  uint64    `gorm:"not null;index;uniqueIndex:uq_friendship_pair"`
	Status    string    `gorm:"size:20;not null;default:pending"`
	CreatedAt time.Time `gorm:"not null"`

	User   User `gorm:"foreignKey:UserID"`
	Friend User `gorm:"foreignKey:FriendID"`
}

func (Friendship) TableName() string { return "friendships" }

type Group struct {
	ID        uint64    `gorm:"primaryKey"`
	Name      string    `gorm:"size:120;not null;index"`
	OwnerID   uint64    `gorm:"not null;index"`
	CreatedAt time.Time `gorm:"not null"`

	Owner       User              `gorm:"foreignKey:OwnerID"`
	Memberships []GroupMembership `gorm:"foreignKey:GroupID"`
	Problems    []ProblemShare    `gorm:"foreignKey:GroupID"`
}

func (Group) TableName() string { return "groups" }

type GroupMembership struct {
	ID        uint64    `gorm:"primaryKey"`
	GroupID   uint64    `gorm:"not null;index;uniqueIndex:uq_group_membership"`
	UserID    uint64    `gorm:"not null;index;uniqueIndex:uq_group_membership"`
	Role      string    `gorm:"size:20;not null;default:member"`
	CreatedAt time.Time `gorm:"not null"`

	Group Group `gorm:"foreignKey:GroupID"`
	User  User  `gorm:"foreignKey:UserID"`
}

func (GroupMembership) TableName() string { return "group_memberships" }

type ProblemShare struct {
	ID                uint64    `gorm:"primaryKey"`
	GroupID           uint64    `gorm:"not null;index;index:ix_problem_shares_group_shared_at,priority:1;index:ix_problem_shares_group_signature,priority:1"`
	SharedByID        uint64    `gorm:"not null;index;index:ix_problem_shares_shared_by_shared_at,priority:1"`
	Platform          string    `gorm:"size:32;not null;index"`
	ProblemURL        string    `gorm:"type:text;not null"`
	PlatformProblemID *string   `gorm:"size:120;index"`
	Title             string    `gorm:"size:255;not null;index"`
	Contest           *string   `gorm:"size:255"`
	Tags              *string   `gorm:"size:255"`
	Difficulty        string    `gorm:"size:64;not null;default:Unknown"`
	ThumbnailURL      *string   `gorm:"size:500"`
	SolvedByCount     *int      `gorm:"type:int"`
	ProblemSignature  string    `gorm:"size:255;not null;index;index:ix_problem_shares_group_signature,priority:2"`
	SharedAt          time.Time `gorm:"not null;index;index:ix_problem_shares_group_shared_at,priority:2;index:ix_problem_shares_shared_by_shared_at,priority:2"`

	Group    Group `gorm:"foreignKey:GroupID"`
	SharedBy User  `gorm:"foreignKey:SharedByID"`
}

func (ProblemShare) TableName() string { return "problem_shares" }

type JoinRequest struct {
	ID        uint64    `gorm:"primaryKey"`
	GroupID   uint64    `gorm:"not null;index;uniqueIndex:uq_join_request"`
	UserID    uint64    `gorm:"not null;index;uniqueIndex:uq_join_request"`
	Status    string    `gorm:"size:20;not null;default:pending"`
	CreatedAt time.Time `gorm:"not null"`

	Group Group `gorm:"foreignKey:GroupID"`
	User  User  `gorm:"foreignKey:UserID"`
}

func (JoinRequest) TableName() string { return "join_requests" }

type Challenge struct {
	ID          uint64    `gorm:"primaryKey"`
	CreatedByID uint64    `gorm:"not null;index:ix_challenges_created_by_status,priority:1"`
	Title       string    `gorm:"size:120;not null"`
	Platform    string    `gorm:"size:32;not null;default:codeforces"`
	NumProblems int16     `gorm:"not null;default:3"`
	MinRating   *int      `gorm:"type:int"`
	MaxRating   *int      `gorm:"type:int"`
	Tags        *string   `gorm:"size:500"`
	Status      string    `gorm:"size:20;not null;default:pending;index:ix_challenges_created_by_status,priority:2"`
	CreatedAt   time.Time `gorm:"not null"`
	StartedAt   *time.Time

	CreatedBy    User                   `gorm:"foreignKey:CreatedByID"`
	Participants []ChallengeParticipant `gorm:"foreignKey:ChallengeID"`
	Problems     []ChallengeProblem     `gorm:"foreignKey:ChallengeID"`
}

func (Challenge) TableName() string { return "challenges" }

type ChallengeParticipant struct {
	ID          uint64 `gorm:"primaryKey"`
	ChallengeID uint64 `gorm:"not null;index;uniqueIndex:uq_challenge_participant"`
	UserID      uint64 `gorm:"not null;index;uniqueIndex:uq_challenge_participant"`
	Status      string `gorm:"size:20;not null;default:invited"`
	JoinedAt    *time.Time

	Challenge Challenge `gorm:"foreignKey:ChallengeID"`
	User      User      `gorm:"foreignKey:UserID"`
}

func (ChallengeParticipant) TableName() string { return "challenge_participants" }

type ChallengeProblem struct {
	ID           uint64  `gorm:"primaryKey"`
	ChallengeID  uint64  `gorm:"not null;index"`
	ProblemURL   string  `gorm:"type:text;not null"`
	Title        string  `gorm:"size:255;not null"`
	ContestID    *int    `gorm:"type:int"`
	ProblemIndex *string `gorm:"size:10"`
	Rating       *int    `gorm:"type:int"`
	Tags         *string `gorm:"size:500"`
	OrderIndex   int16   `gorm:"not null;default:0"`

	Challenge Challenge `gorm:"foreignKey:ChallengeID"`
}

func (ChallengeProblem) TableName() string { return "challenge_problems" }

type SchemaMigration struct {
	ID        string    `gorm:"primaryKey;size:64"`
	Source    string    `gorm:"size:32;not null"`
	AppliedAt time.Time `gorm:"not null"`
}

func (SchemaMigration) TableName() string { return "schema_migrations" }
