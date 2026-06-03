package httpapi

import (
	"database/sql"
	"errors"
	"fmt"
	"html/template"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"gorm.io/gorm"

	"algosphere/backend/internal/model"
	"algosphere/backend/internal/security"
)

const adminPageSize = 50

type adminColumn struct {
	Key        string
	Label      string
	Searchable bool
	Sortable   bool
}

type adminResource struct {
	Key         string
	Label       string
	Table       string
	DefaultSort string
	DefaultDesc bool
	Columns     []adminColumn
}

type adminNavItem struct {
	Label  string
	URL    string
	Active bool
}

type adminSummaryItem struct {
	Label string
	Count int64
	URL   string
}

type adminHomeData struct {
	Email     string
	Resources []adminSummaryItem
}

type adminListHeader struct {
	Label   string
	SortURL string
	Sorted  bool
	Desc    bool
}

type adminListRow struct {
	DetailURL string
	Cells     []string
}

type adminListData struct {
	Email      string
	Resource   string
	Resources  []adminNavItem
	Query      string
	Headers    []adminListHeader
	Rows       []adminListRow
	CountLabel string
	PrevURL    string
	NextURL    string
}

type adminDetailField struct {
	Key   string
	Value string
}

type adminDetailData struct {
	Email     string
	Resource  string
	Resources []adminNavItem
	BackURL   string
	Fields    []adminDetailField
}

var adminResources = []adminResource{
	{
		Key:         "users",
		Label:       "Users",
		Table:       "users",
		DefaultSort: "created_at",
		DefaultDesc: true,
		Columns: []adminColumn{
			{Key: "id", Label: "ID", Sortable: true},
			{Key: "email", Label: "Email", Searchable: true, Sortable: true},
			{Key: "username", Label: "Username", Searchable: true, Sortable: true},
			{Key: "display_name", Label: "Display Name", Searchable: true},
			{Key: "auth_provider", Label: "Auth Provider"},
			{Key: "created_at", Label: "Created", Sortable: true},
		},
	},
	{
		Key:         "friendships",
		Label:       "Friendships",
		Table:       "friendships",
		DefaultSort: "created_at",
		DefaultDesc: true,
		Columns: []adminColumn{
			{Key: "id", Label: "ID", Sortable: true},
			{Key: "user_id", Label: "User ID"},
			{Key: "friend_id", Label: "Friend ID"},
			{Key: "status", Label: "Status", Sortable: true},
			{Key: "created_at", Label: "Created", Sortable: true},
		},
	},
	{
		Key:         "groups",
		Label:       "Groups",
		Table:       "groups",
		DefaultSort: "created_at",
		DefaultDesc: true,
		Columns: []adminColumn{
			{Key: "id", Label: "ID", Sortable: true},
			{Key: "name", Label: "Name", Searchable: true, Sortable: true},
			{Key: "owner_id", Label: "Owner ID"},
			{Key: "created_at", Label: "Created", Sortable: true},
		},
	},
	{
		Key:         "group-memberships",
		Label:       "Group Memberships",
		Table:       "group_memberships",
		DefaultSort: "created_at",
		DefaultDesc: true,
		Columns: []adminColumn{
			{Key: "id", Label: "ID", Sortable: true},
			{Key: "group_id", Label: "Group ID"},
			{Key: "user_id", Label: "User ID"},
			{Key: "role", Label: "Role"},
			{Key: "created_at", Label: "Created", Sortable: true},
		},
	},
	{
		Key:         "problem-shares",
		Label:       "Problem Shares",
		Table:       "problem_shares",
		DefaultSort: "shared_at",
		DefaultDesc: true,
		Columns: []adminColumn{
			{Key: "id", Label: "ID", Sortable: true},
			{Key: "title", Label: "Title", Searchable: true, Sortable: true},
			{Key: "platform", Label: "Platform", Searchable: true, Sortable: true},
			{Key: "difficulty", Label: "Difficulty"},
			{Key: "shared_by_id", Label: "Shared By"},
			{Key: "group_id", Label: "Group ID"},
			{Key: "shared_at", Label: "Shared", Sortable: true},
		},
	},
	{
		Key:         "join-requests",
		Label:       "Join Requests",
		Table:       "join_requests",
		DefaultSort: "created_at",
		DefaultDesc: true,
		Columns: []adminColumn{
			{Key: "id", Label: "ID", Sortable: true},
			{Key: "group_id", Label: "Group ID"},
			{Key: "user_id", Label: "User ID"},
			{Key: "status", Label: "Status", Sortable: true},
			{Key: "created_at", Label: "Created", Sortable: true},
		},
	},
	{
		Key:         "challenges",
		Label:       "Challenges",
		Table:       "challenges",
		DefaultSort: "created_at",
		DefaultDesc: true,
		Columns: []adminColumn{
			{Key: "id", Label: "ID", Sortable: true},
			{Key: "title", Label: "Title", Searchable: true, Sortable: true},
			{Key: "platform", Label: "Platform"},
			{Key: "status", Label: "Status", Sortable: true},
			{Key: "num_problems", Label: "Problems"},
			{Key: "created_by_id", Label: "Created By"},
			{Key: "created_at", Label: "Created", Sortable: true},
		},
	},
	{
		Key:         "challenge-participants",
		Label:       "Challenge Participants",
		Table:       "challenge_participants",
		DefaultSort: "id",
		DefaultDesc: true,
		Columns: []adminColumn{
			{Key: "id", Label: "ID", Sortable: true},
			{Key: "challenge_id", Label: "Challenge ID"},
			{Key: "user_id", Label: "User ID"},
			{Key: "status", Label: "Status", Sortable: true},
			{Key: "joined_at", Label: "Joined"},
		},
	},
	{
		Key:         "challenge-problems",
		Label:       "Challenge Problems",
		Table:       "challenge_problems",
		DefaultSort: "id",
		DefaultDesc: true,
		Columns: []adminColumn{
			{Key: "id", Label: "ID", Sortable: true},
			{Key: "challenge_id", Label: "Challenge ID"},
			{Key: "title", Label: "Title", Searchable: true, Sortable: true},
			{Key: "rating", Label: "Rating", Sortable: true},
			{Key: "order_index", Label: "Order"},
		},
	},
}

var adminResourcesByKey = func() map[string]adminResource {
	result := make(map[string]adminResource, len(adminResources))
	for _, resource := range adminResources {
		result[resource.Key] = resource
	}
	return result
}()

var adminLoginTemplate = template.Must(template.New("admin-login").Parse(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>AlgoSphere Admin</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; background:#f4f5f7; color:#1f2933; margin:0; }
    main { max-width: 28rem; margin: 4rem auto; background:#fff; border:1px solid #d9e2ec; border-radius:16px; padding:2rem; box-shadow:0 10px 30px rgba(15,23,42,.08); }
    h1 { margin:0 0 1rem; font-size:1.6rem; }
    label { display:block; margin-top:1rem; font-weight:600; }
    input { width:100%; box-sizing:border-box; margin-top:.4rem; padding:.75rem .85rem; border:1px solid #bcccdc; border-radius:10px; }
    button { margin-top:1.25rem; width:100%; padding:.8rem .95rem; border:0; border-radius:10px; background:#0f172a; color:#fff; font-weight:700; cursor:pointer; }
    .error { color:#b00020; margin:0 0 1rem; }
    .meta { color:#52606d; font-size:.95rem; line-height:1.5; }
  </style>
</head>
<body>
  <main>
    <h1>AlgoSphere Admin</h1>
    <p class="meta">Sign in with an explicitly allow-listed admin account. This console is read-only and intended for operational inspection.</p>
    {{if .Error}}<p class="error">{{.Error}}</p>{{end}}
    <form method="post" action="/admin/login">
      <label for="email">Email</label>
      <input id="email" name="email" type="email" autocomplete="username" required>
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required>
      <button type="submit">Sign in</button>
    </form>
  </main>
</body>
</html>`))

var adminHomeTemplate = template.Must(template.New("admin-home").Parse(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>AlgoSphere Admin</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; background:#f4f5f7; color:#1f2933; margin:0; }
    header { display:flex; justify-content:space-between; align-items:center; padding:1rem 1.5rem; background:#0f172a; color:#fff; }
    header form { margin:0; }
    header button { border:0; border-radius:10px; background:#fff; color:#0f172a; padding:.6rem .9rem; font-weight:700; cursor:pointer; }
    main { max-width: 72rem; margin: 2rem auto; padding: 0 1.5rem 2rem; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(14rem, 1fr)); gap:1rem; }
    .card { background:#fff; border:1px solid #d9e2ec; border-radius:16px; padding:1rem 1.1rem; box-shadow:0 10px 30px rgba(15,23,42,.06); }
    .card a { text-decoration:none; color:inherit; display:block; }
    .count { font-size:2rem; font-weight:800; margin:.25rem 0 .5rem; }
    .muted { color:#52606d; }
  </style>
</head>
<body>
  <header>
    <div>
      <strong>AlgoSphere Admin</strong><br>
      <span>Signed in as {{.Email}}</span>
    </div>
    <form method="post" action="/admin/logout"><button type="submit">Log out</button></form>
  </header>
  <main>
    <h1>Data Explorer</h1>
    <p class="muted">Read-only operational views for every migrated backend model.</p>
    <section class="grid">
      {{range .Resources}}
      <article class="card">
        <a href="{{.URL}}">
          <div class="muted">{{.Label}}</div>
          <div class="count">{{.Count}}</div>
          <div class="muted">Open resource</div>
        </a>
      </article>
      {{end}}
    </section>
  </main>
</body>
</html>`))

var adminListTemplate = template.Must(template.New("admin-list").Parse(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>{{.Resource}} | AlgoSphere Admin</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; background:#f4f5f7; color:#1f2933; margin:0; }
    header { display:flex; justify-content:space-between; align-items:center; padding:1rem 1.5rem; background:#0f172a; color:#fff; }
    header a { color:#fff; text-decoration:none; }
    header form { margin:0; }
    header button { border:0; border-radius:10px; background:#fff; color:#0f172a; padding:.6rem .9rem; font-weight:700; cursor:pointer; }
    .layout { display:grid; grid-template-columns:15rem 1fr; gap:1.5rem; max-width:88rem; margin:2rem auto; padding:0 1.5rem 2rem; }
    nav { background:#fff; border:1px solid #d9e2ec; border-radius:16px; padding:1rem; align-self:start; }
    nav a { display:block; padding:.6rem .7rem; border-radius:10px; color:#1f2933; text-decoration:none; }
    nav a.active { background:#d9e2ec; font-weight:700; }
    section { background:#fff; border:1px solid #d9e2ec; border-radius:16px; padding:1rem; overflow:auto; }
    .toolbar { display:flex; justify-content:space-between; align-items:flex-end; gap:1rem; margin-bottom:1rem; flex-wrap:wrap; }
    .toolbar form { display:flex; gap:.6rem; flex-wrap:wrap; }
    input { padding:.7rem .85rem; border:1px solid #bcccdc; border-radius:10px; min-width:16rem; }
    button { border:0; border-radius:10px; background:#0f172a; color:#fff; padding:.7rem .95rem; font-weight:700; cursor:pointer; }
    table { width:100%; border-collapse:collapse; }
    th, td { padding:.75rem .8rem; border-bottom:1px solid #e5e7eb; text-align:left; vertical-align:top; }
    th a { color:#1f2933; text-decoration:none; }
    .muted { color:#52606d; }
    .pager { display:flex; justify-content:flex-end; gap:.75rem; margin-top:1rem; }
    .pager a { color:#0f172a; text-decoration:none; font-weight:700; }
    .empty { padding:2rem 0; color:#52606d; }
  </style>
</head>
<body>
  <header>
    <div><a href="/admin/">AlgoSphere Admin</a><br><span>{{.Email}}</span></div>
    <form method="post" action="/admin/logout"><button type="submit">Log out</button></form>
  </header>
  <div class="layout">
    <nav>
      {{range .Resources}}
      <a href="{{.URL}}" class="{{if .Active}}active{{end}}">{{.Label}}</a>
      {{end}}
    </nav>
    <section>
      <div class="toolbar">
        <div>
          <h1>{{.Resource}}</h1>
          <div class="muted">{{.CountLabel}}</div>
        </div>
        <form method="get">
          <input type="search" name="q" value="{{.Query}}" placeholder="Search">
          <button type="submit">Apply</button>
        </form>
      </div>
      {{if .Rows}}
      <table>
        <thead>
          <tr>
            {{range .Headers}}
            <th>{{if .SortURL}}<a href="{{.SortURL}}">{{.Label}}{{if .Sorted}}{{if .Desc}} ↓{{else}} ↑{{end}}{{end}}</a>{{else}}{{.Label}}{{end}}</th>
            {{end}}
            <th>Open</th>
          </tr>
        </thead>
        <tbody>
          {{range .Rows}}
          <tr>
            {{range .Cells}}<td>{{.}}</td>{{end}}
            <td><a href="{{.DetailURL}}">View</a></td>
          </tr>
          {{end}}
        </tbody>
      </table>
      {{else}}
      <div class="empty">No rows matched the current filters.</div>
      {{end}}
      <div class="pager">
        {{if .PrevURL}}<a href="{{.PrevURL}}">Previous</a>{{end}}
        {{if .NextURL}}<a href="{{.NextURL}}">Next</a>{{end}}
      </div>
    </section>
  </div>
</body>
</html>`))

var adminDetailTemplate = template.Must(template.New("admin-detail").Parse(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>{{.Resource}} | AlgoSphere Admin</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; background:#f4f5f7; color:#1f2933; margin:0; }
    header { display:flex; justify-content:space-between; align-items:center; padding:1rem 1.5rem; background:#0f172a; color:#fff; }
    header a { color:#fff; text-decoration:none; }
    header form { margin:0; }
    header button { border:0; border-radius:10px; background:#fff; color:#0f172a; padding:.6rem .9rem; font-weight:700; cursor:pointer; }
    .layout { display:grid; grid-template-columns:15rem 1fr; gap:1.5rem; max-width:88rem; margin:2rem auto; padding:0 1.5rem 2rem; }
    nav { background:#fff; border:1px solid #d9e2ec; border-radius:16px; padding:1rem; align-self:start; }
    nav a { display:block; padding:.6rem .7rem; border-radius:10px; color:#1f2933; text-decoration:none; }
    nav a.active { background:#d9e2ec; font-weight:700; }
    section { background:#fff; border:1px solid #d9e2ec; border-radius:16px; padding:1rem; overflow:auto; }
    .back { display:inline-block; margin-bottom:1rem; text-decoration:none; color:#0f172a; font-weight:700; }
    table { width:100%; border-collapse:collapse; }
    th, td { padding:.75rem .8rem; border-bottom:1px solid #e5e7eb; text-align:left; vertical-align:top; }
    th { width:18rem; }
  </style>
</head>
<body>
  <header>
    <div><a href="/admin/">AlgoSphere Admin</a><br><span>{{.Email}}</span></div>
    <form method="post" action="/admin/logout"><button type="submit">Log out</button></form>
  </header>
  <div class="layout">
    <nav>
      {{range .Resources}}
      <a href="{{.URL}}" class="{{if .Active}}active{{end}}">{{.Label}}</a>
      {{end}}
    </nav>
    <section>
      <a class="back" href="{{.BackURL}}">Back to {{.Resource}}</a>
      <h1>{{.Resource}}</h1>
      <table>
        <tbody>
          {{range .Fields}}
          <tr><th>{{.Key}}</th><td>{{.Value}}</td></tr>
          {{end}}
        </tbody>
      </table>
    </section>
  </div>
</body>
</html>`))

func (api *API) adminLoginPage(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_ = adminLoginTemplate.Execute(w, map[string]string{})
}

func (api *API) adminLogin(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, "The sign-in form could not be read. Refresh the page and try again.", http.StatusBadRequest)
		return
	}
	email := strings.ToLower(strings.TrimSpace(r.FormValue("email")))
	password := r.FormValue("password")
	if email == "" || password == "" {
		w.WriteHeader(http.StatusBadRequest)
		_ = adminLoginTemplate.Execute(w, map[string]string{"Error": "Email and password are required."})
		return
	}

	key := buildAuthRateLimitKey(r, email)
	decision := api.adminLimiter.Check(key)
	if !decision.Allowed {
		w.WriteHeader(http.StatusBadRequest)
		_ = adminLoginTemplate.Execute(w, map[string]string{"Error": "Too many login attempts. Please wait and try again."})
		return
	}

	allowed := make(map[string]struct{}, len(api.settings.AdminEmails))
	for _, value := range api.settings.AdminEmails {
		allowed[strings.ToLower(value)] = struct{}{}
	}
	if _, ok := allowed[email]; !ok {
		api.adminLimiter.RecordFailure(key)
		w.WriteHeader(http.StatusBadRequest)
		_ = adminLoginTemplate.Execute(w, map[string]string{"Error": "Invalid email or password."})
		return
	}

	var user model.User
	if err := api.db.WithContext(r.Context()).Where("LOWER(email) = ?", email).First(&user).Error; err != nil {
		api.adminLimiter.RecordFailure(key)
		w.WriteHeader(http.StatusBadRequest)
		_ = adminLoginTemplate.Execute(w, map[string]string{"Error": "Invalid email or password."})
		return
	}
	if user.PasswordHash == nil {
		api.adminLimiter.RecordFailure(key)
		w.WriteHeader(http.StatusBadRequest)
		_ = adminLoginTemplate.Execute(w, map[string]string{"Error": "Invalid email or password."})
		return
	}
	match, err := security.VerifyPassword(password, *user.PasswordHash)
	if err != nil || !match {
		api.adminLimiter.RecordFailure(key)
		w.WriteHeader(http.StatusBadRequest)
		_ = adminLoginTemplate.Execute(w, map[string]string{"Error": "Invalid email or password."})
		return
	}

	session, err := api.sessionStore.Get(r, api.settings.SessionCookieName)
	if err != nil {
		http.Error(w, "The admin session could not be created. Check the server logs and try again.", http.StatusInternalServerError)
		return
	}
	session.Values["admin_email"] = user.Email
	if err := session.Save(r, w); err != nil {
		http.Error(w, "The admin session could not be saved. Check the server logs and try again.", http.StatusInternalServerError)
		return
	}
	api.adminLimiter.Clear(key)
	http.Redirect(w, r, "/admin/", http.StatusFound)
}

func (api *API) adminLogout(w http.ResponseWriter, r *http.Request) {
	session, _ := api.sessionStore.Get(r, api.settings.SessionCookieName)
	session.Options.MaxAge = -1
	_ = session.Save(r, w)
	http.Redirect(w, r, "/admin/login", http.StatusFound)
}

func (api *API) adminRoot(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, "/admin/", http.StatusFound)
}

func (api *API) adminHome(w http.ResponseWriter, r *http.Request) {
	email, err := api.adminSessionEmail(r)
	if err != nil {
		http.Redirect(w, r, "/admin/login", http.StatusFound)
		return
	}

	summaries := make([]adminSummaryItem, 0, len(adminResources))
	for _, resource := range adminResources {
		var count int64
		if err := api.db.WithContext(r.Context()).Table(resource.Table).Count(&count).Error; err != nil {
			http.Error(w, fmt.Sprintf("Failed to load %s. Check the server logs and retry after verifying the database schema.", strings.ToLower(resource.Label)), http.StatusInternalServerError)
			return
		}
		summaries = append(summaries, adminSummaryItem{
			Label: resource.Label,
			Count: count,
			URL:   adminListURL(resource.Key, "", 1, resource.DefaultSort, resource.DefaultDesc),
		})
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_ = adminHomeTemplate.Execute(w, adminHomeData{
		Email:     email,
		Resources: summaries,
	})
}

func (api *API) adminListResource(w http.ResponseWriter, r *http.Request) {
	email, err := api.adminSessionEmail(r)
	if err != nil {
		http.Redirect(w, r, "/admin/login", http.StatusFound)
		return
	}

	resource, ok := adminResourcesByKey[chi.URLParam(r, "resource")]
	if !ok {
		http.NotFound(w, r)
		return
	}

	queryText := strings.TrimSpace(r.URL.Query().Get("q"))
	page := parsePositiveInt(r.URL.Query().Get("page"), 1)
	if page < 1 {
		page = 1
	}

	sortColumn, descending := resolveAdminSort(resource, r.URL.Query().Get("sort"), r.URL.Query().Get("dir"))
	total, rows, err := api.loadAdminRows(r, resource, queryText, page, sortColumn, descending)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to load %s. Check the server logs and retry after verifying the database connection.", strings.ToLower(resource.Label)), http.StatusInternalServerError)
		return
	}

	headers := make([]adminListHeader, 0, len(resource.Columns))
	for _, column := range resource.Columns {
		header := adminListHeader{Label: column.Label}
		if column.Sortable {
			nextDesc := false
			if sortColumn == column.Key {
				nextDesc = !descending
			} else {
				nextDesc = resource.DefaultDesc
			}
			header.SortURL = adminListURL(resource.Key, queryText, page, column.Key, nextDesc)
			header.Sorted = sortColumn == column.Key
			header.Desc = descending
		}
		headers = append(headers, header)
	}

	viewRows := make([]adminListRow, 0, len(rows))
	for _, row := range rows {
		idValue := formatAdminValue(row["id"])
		cells := make([]string, 0, len(resource.Columns))
		for _, column := range resource.Columns {
			cells = append(cells, formatAdminValue(row[column.Key]))
		}
		viewRows = append(viewRows, adminListRow{
			DetailURL: fmt.Sprintf("/admin/models/%s/%s", resource.Key, idValue),
			Cells:     cells,
		})
	}

	prevURL := ""
	if page > 1 {
		prevURL = adminListURL(resource.Key, queryText, page-1, sortColumn, descending)
	}
	nextURL := ""
	if int64(page*adminPageSize) < total {
		nextURL = adminListURL(resource.Key, queryText, page+1, sortColumn, descending)
	}

	countLabel := fmt.Sprintf("%d total row(s)", total)
	if total > 0 {
		start := (page-1)*adminPageSize + 1
		end := page * adminPageSize
		if int64(end) > total {
			end = int(total)
		}
		countLabel = fmt.Sprintf("Showing %d-%d of %d row(s)", start, end, total)
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_ = adminListTemplate.Execute(w, adminListData{
		Email:      email,
		Resource:   resource.Label,
		Resources:  buildAdminNav(resource.Key),
		Query:      queryText,
		Headers:    headers,
		Rows:       viewRows,
		CountLabel: countLabel,
		PrevURL:    prevURL,
		NextURL:    nextURL,
	})
}

func (api *API) adminShowResource(w http.ResponseWriter, r *http.Request) {
	email, err := api.adminSessionEmail(r)
	if err != nil {
		http.Redirect(w, r, "/admin/login", http.StatusFound)
		return
	}

	resource, ok := adminResourcesByKey[chi.URLParam(r, "resource")]
	if !ok {
		http.NotFound(w, r)
		return
	}

	recordID, err := parseUintParam(chi.URLParam(r, "recordID"), "recordID")
	if err != nil {
		http.Error(w, "The requested record identifier is invalid. Use a positive numeric ID.", http.StatusBadRequest)
		return
	}

	record, err := api.loadAdminRecord(r, resource, recordID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			http.NotFound(w, r)
			return
		}
		http.Error(w, fmt.Sprintf("Failed to load %s. Check the server logs and retry after verifying the database connection.", strings.ToLower(resource.Label)), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_ = adminDetailTemplate.Execute(w, adminDetailData{
		Email:     email,
		Resource:  resource.Label,
		Resources: buildAdminNav(resource.Key),
		BackURL:   adminListURL(resource.Key, "", 1, resource.DefaultSort, resource.DefaultDesc),
		Fields:    buildAdminDetailFields(resource, record),
	})
}

func (api *API) requireAdminSession(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if _, err := api.adminSessionEmail(r); err != nil {
			http.Redirect(w, r, "/admin/login", http.StatusFound)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (api *API) adminSessionEmail(r *http.Request) (string, error) {
	session, err := api.sessionStore.Get(r, api.settings.SessionCookieName)
	if err != nil {
		return "", err
	}
	value, _ := session.Values["admin_email"].(string)
	value = strings.ToLower(strings.TrimSpace(value))
	if value == "" {
		return "", fmt.Errorf("admin session missing")
	}
	allowed := make(map[string]struct{}, len(api.settings.AdminEmails))
	for _, email := range api.settings.AdminEmails {
		allowed[strings.ToLower(email)] = struct{}{}
	}
	if _, ok := allowed[value]; !ok {
		return "", fmt.Errorf("admin session email is not allowed")
	}
	return value, nil
}

func (api *API) loadAdminRows(r *http.Request, resource adminResource, searchQuery string, page int, sortColumn string, descending bool) (int64, []map[string]any, error) {
	base := api.adminTableQuery(r, resource, searchQuery)

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return 0, nil, err
	}

	query := api.adminTableQuery(r, resource, searchQuery)
	rows, err := query.
		Select(strings.Join(resource.columnKeys(), ", ")).
		Order(buildAdminOrderClause(sortColumn, descending)).
		Limit(adminPageSize).
		Offset((page - 1) * adminPageSize).
		Rows()
	if err != nil {
		return 0, nil, err
	}
	defer rows.Close()

	records, err := scanAdminRows(rows)
	if err != nil {
		return 0, nil, err
	}
	return total, records, nil
}

func (api *API) loadAdminRecord(r *http.Request, resource adminResource, recordID uint64) (map[string]any, error) {
	rows, err := api.db.WithContext(r.Context()).
		Table(resource.Table).
		Where("id = ?", recordID).
		Limit(1).
		Rows()
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	records, err := scanAdminRows(rows)
	if err != nil {
		return nil, err
	}
	if len(records) == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	return records[0], nil
}

func (api *API) adminTableQuery(r *http.Request, resource adminResource, searchQuery string) *gorm.DB {
	query := api.db.WithContext(r.Context()).Table(resource.Table)
	searchQuery = strings.TrimSpace(searchQuery)
	if searchQuery == "" {
		return query
	}

	like := "%" + strings.ToLower(searchQuery) + "%"
	first := true
	for _, column := range resource.Columns {
		if !column.Searchable {
			continue
		}
		clause := fmt.Sprintf("LOWER(%s) LIKE ?", column.Key)
		if first {
			query = query.Where(clause, like)
			first = false
			continue
		}
		query = query.Or(clause, like)
	}
	return query
}

func buildAdminNav(activeKey string) []adminNavItem {
	items := make([]adminNavItem, 0, len(adminResources))
	for _, resource := range adminResources {
		items = append(items, adminNavItem{
			Label:  resource.Label,
			URL:    adminListURL(resource.Key, "", 1, resource.DefaultSort, resource.DefaultDesc),
			Active: resource.Key == activeKey,
		})
	}
	return items
}

func adminListURL(resourceKey string, queryText string, page int, sortColumn string, descending bool) string {
	values := url.Values{}
	if queryText != "" {
		values.Set("q", queryText)
	}
	if page > 1 {
		values.Set("page", strconv.Itoa(page))
	}
	if sortColumn != "" {
		values.Set("sort", sortColumn)
	}
	if descending {
		values.Set("dir", "desc")
	} else {
		values.Set("dir", "asc")
	}

	path := fmt.Sprintf("/admin/models/%s", resourceKey)
	encoded := values.Encode()
	if encoded == "" {
		return path
	}
	return path + "?" + encoded
}

func resolveAdminSort(resource adminResource, sortColumn string, direction string) (string, bool) {
	sortColumn = strings.TrimSpace(sortColumn)
	for _, column := range resource.Columns {
		if column.Sortable && column.Key == sortColumn {
			return column.Key, strings.EqualFold(direction, "desc")
		}
	}
	return resource.DefaultSort, resource.DefaultDesc
}

func buildAdminOrderClause(sortColumn string, descending bool) string {
	if descending {
		return sortColumn + " desc"
	}
	return sortColumn + " asc"
}

func buildAdminDetailFields(resource adminResource, row map[string]any) []adminDetailField {
	fields := make([]adminDetailField, 0, len(row))
	seen := make(map[string]struct{}, len(row))

	for _, column := range resource.Columns {
		if value, ok := row[column.Key]; ok {
			fields = append(fields, adminDetailField{Key: column.Label, Value: formatAdminValue(value)})
			seen[column.Key] = struct{}{}
		}
	}

	extraKeys := make([]string, 0)
	for key := range row {
		if _, ok := seen[key]; ok {
			continue
		}
		extraKeys = append(extraKeys, key)
	}
	sort.Strings(extraKeys)
	for _, key := range extraKeys {
		fields = append(fields, adminDetailField{Key: key, Value: formatAdminValue(row[key])})
	}

	return fields
}

func scanAdminRows(rows *sql.Rows) ([]map[string]any, error) {
	columns, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	records := make([]map[string]any, 0)
	for rows.Next() {
		values := make([]any, len(columns))
		destinations := make([]any, len(columns))
		for index := range values {
			destinations[index] = &values[index]
		}
		if err := rows.Scan(destinations...); err != nil {
			return nil, err
		}

		record := make(map[string]any, len(columns))
		for index, column := range columns {
			record[column] = normalizeAdminValue(values[index])
		}
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return records, nil
}

func normalizeAdminValue(value any) any {
	switch typed := value.(type) {
	case []byte:
		return string(typed)
	default:
		return typed
	}
}

func formatAdminValue(value any) string {
	switch typed := value.(type) {
	case nil:
		return "—"
	case time.Time:
		return typed.UTC().Format(time.RFC3339)
	case *time.Time:
		if typed == nil {
			return "—"
		}
		return typed.UTC().Format(time.RFC3339)
	case bool:
		if typed {
			return "true"
		}
		return "false"
	default:
		text := strings.TrimSpace(fmt.Sprint(typed))
		if text == "" {
			return "—"
		}
		return text
	}
}

func parsePositiveInt(raw string, fallback int) int {
	if strings.TrimSpace(raw) == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}

func (resource adminResource) columnKeys() []string {
	keys := make([]string, 0, len(resource.Columns))
	for _, column := range resource.Columns {
		keys = append(keys, column.Key)
	}
	return keys
}
