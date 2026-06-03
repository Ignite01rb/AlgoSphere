package database

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"net"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/glebarez/sqlite"
	mysqlDriver "github.com/go-sql-driver/mysql"
	gormmysql "gorm.io/driver/mysql"
	gormpostgres "gorm.io/driver/postgres"
	"gorm.io/gorm"

	"algosphere/backend/internal/config"
)

type Dialect string

const (
	DialectSQLite   Dialect = "sqlite"
	DialectMySQL    Dialect = "mysql"
	DialectPostgres Dialect = "postgres"
)

func Open(ctx context.Context, settings config.Settings) (*gorm.DB, Dialect, error) {
	dialect, dsn, err := buildDSN(settings)
	if err != nil {
		return nil, "", err
	}

	var dialector gorm.Dialector
	switch dialect {
	case DialectSQLite:
		dialector = sqlite.Open(dsn)
	case DialectMySQL:
		dialector = gormmysql.Open(dsn)
	case DialectPostgres:
		dialector = gormpostgres.Open(dsn)
	default:
		return nil, "", fmt.Errorf("unsupported database dialect %q", dialect)
	}

	db, err := gorm.Open(dialector, &gorm.Config{
		NowFunc: func() time.Time { return time.Now().UTC() },
	})
	if err != nil {
		return nil, "", fmt.Errorf("open database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, "", fmt.Errorf("unwrap sql db: %w", err)
	}

	maxOpen := settings.DatabasePoolSize + settings.DatabaseMaxOverflow
	if maxOpen <= 0 {
		maxOpen = settings.DatabasePoolSize
	}
	if maxOpen <= 0 {
		maxOpen = 10
	}
	sqlDB.SetMaxOpenConns(maxOpen)
	sqlDB.SetMaxIdleConns(settings.DatabasePoolSize)
	sqlDB.SetConnMaxLifetime(time.Duration(settings.DatabasePoolRecycleSeconds) * time.Second)

	if dialect == DialectSQLite {
		if err := db.Exec("PRAGMA foreign_keys = ON").Error; err != nil {
			return nil, "", fmt.Errorf("enable sqlite foreign keys: %w", err)
		}
	}

	if err := sqlDB.PingContext(ctx); err != nil {
		return nil, "", fmt.Errorf("ping database: %w", err)
	}

	return db, dialect, nil
}

func Ping(ctx context.Context, db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("unwrap sql db: %w", err)
	}
	return sqlDB.PingContext(ctx)
}

func buildDSN(settings config.Settings) (Dialect, string, error) {
	switch {
	case strings.HasPrefix(settings.DatabaseURL, "sqlite:///"):
		return DialectSQLite, strings.TrimPrefix(settings.DatabaseURL, "sqlite:///"), nil
	case strings.HasPrefix(settings.DatabaseURL, "sqlite://"):
		return DialectSQLite, strings.TrimPrefix(settings.DatabaseURL, "sqlite://"), nil
	case strings.HasPrefix(settings.DatabaseURL, "mysql+pymysql://"):
		return buildMySQLDSN(strings.TrimPrefix(settings.DatabaseURL, "mysql+pymysql://"), settings)
	case strings.HasPrefix(settings.DatabaseURL, "mysql://"):
		return buildMySQLDSN(strings.TrimPrefix(settings.DatabaseURL, "mysql://"), settings)
	case strings.HasPrefix(settings.DatabaseURL, "postgres://") || strings.HasPrefix(settings.DatabaseURL, "postgresql://"):
		return DialectPostgres, settings.DatabaseURL, nil
	default:
		return "", "", fmt.Errorf("unsupported ALGOSPHERE_DATABASE_URL format %q", settings.DatabaseURL)
	}
}

func buildMySQLDSN(raw string, settings config.Settings) (Dialect, string, error) {
	parsed, err := url.Parse("mysql://" + raw)
	if err != nil {
		return "", "", fmt.Errorf("parse mysql url: %w", err)
	}

	if parsed.User == nil {
		return "", "", errors.New("database username is required")
	}

	user := parsed.User.Username()
	password, _ := parsed.User.Password()
	host := parsed.Hostname()
	port := parsed.Port()
	if host == "" {
		return "", "", errors.New("database host is required")
	}
	if port == "" {
		port = "3306"
	}

	dbName := strings.TrimPrefix(parsed.Path, "/")
	if dbName == "" {
		return "", "", errors.New("database name is required")
	}

	query := parsed.Query()
	if query.Get("charset") == "" {
		query.Set("charset", "utf8mb4")
	}
	query.Set("parseTime", "true")

	cfg := mysqlDriver.Config{
		User:                 user,
		Passwd:               password,
		Net:                  "tcp",
		Addr:                 net.JoinHostPort(host, port),
		DBName:               dbName,
		AllowNativePasswords: true,
		Params:               map[string]string{},
	}

	for key, values := range query {
		if len(values) == 0 {
			continue
		}
		cfg.Params[key] = values[len(values)-1]
	}

	if settings.DatabaseSSLCAPath != "" || settings.DatabaseSSLVerifyCert || settings.DatabaseSSLVerifyIdentity {
		tlsConfig, err := buildTLSConfig(host, settings)
		if err != nil {
			return "", "", err
		}
		const tlsName = "algosphere"
		if err := mysqlDriver.RegisterTLSConfig(tlsName, tlsConfig); err != nil && !strings.Contains(err.Error(), "already exists") {
			return "", "", fmt.Errorf("register mysql tls config: %w", err)
		}
		cfg.TLSConfig = tlsName
	}

	return DialectMySQL, cfg.FormatDSN(), nil
}

func buildTLSConfig(host string, settings config.Settings) (*tls.Config, error) {
	tlsConfig := &tls.Config{MinVersion: tls.VersionTLS12}
	if !settings.DatabaseSSLVerifyCert && !settings.DatabaseSSLVerifyIdentity {
		tlsConfig.InsecureSkipVerify = true
	}
	if settings.DatabaseSSLVerifyIdentity {
		tlsConfig.ServerName = host
	}
	if settings.DatabaseSSLCAPath == "" {
		return tlsConfig, nil
	}

	caBytes, err := os.ReadFile(settings.DatabaseSSLCAPath)
	if err != nil {
		return nil, fmt.Errorf("read database ca path: %w", err)
	}
	rootCAs := x509.NewCertPool()
	if !rootCAs.AppendCertsFromPEM(caBytes) {
		return nil, errors.New("database ca path did not contain a valid PEM certificate")
	}
	tlsConfig.RootCAs = rootCAs
	return tlsConfig, nil
}
