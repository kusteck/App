package auth

import (
    "context"
    "errors"
    "strings"
    "time"

    "github.com/gofiber/fiber/v2"
    "github.com/golang-jwt/jwt/v5"
    "github.com/jackc/pgx/v5/pgxpool"
    "golang.org/x/crypto/bcrypt"
)

type Service struct {
    Pool   *pgxpool.Pool
    Secret string
}

func NewService(p *pgxpool.Pool, secret string) *Service {
    return &Service{Pool: p, Secret: secret}
}

type Claims struct {
    UserID string `json:"uid"`
    jwt.RegisteredClaims
}

func (s *Service) sign(userID string, ttl time.Duration) (string, error) {
    c := Claims{
        UserID: userID,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
        },
    }
    return jwt.NewWithClaims(jwt.SigningMethodHS256, c).SignedString([]byte(s.Secret))
}

func (s *Service) Access(userID string) (string, error) {
    return s.sign(userID, 15*time.Minute)
}

func (s *Service) Refresh(userID string) (string, error) {
    return s.sign(userID, 30*24*time.Hour)
}

func (s *Service) Parse(token string) (*Claims, error) {
    t, err := jwt.ParseWithClaims(token, &Claims{}, func(t *jwt.Token) (interface{}, error) {
        return []byte(s.Secret), nil
    })
    if err != nil || !t.Valid {
        return nil, errors.New("invalid token")
    }
    return t.Claims.(*Claims), nil
}

type registerReq struct {
    Phone       string `json:"phone"`
    Email       string `json:"email"`
    Username    string `json:"username"`
    DisplayName string `json:"display_name"`
    BirthDate   string `json:"birth_date"`
    Password    string `json:"password"`
    Confirm     string `json:"confirm_password"`
}

type loginReq struct {
    Login    string `json:"login"`
    Password string `json:"password"`
}

func RegisterRoutes(r fiber.Router, s *Service) {
    r.Post("/auth/register", func(c *fiber.Ctx) error {
        var req registerReq
        if err := c.BodyParser(&req); err != nil {
            return fiber.NewError(400, "invalid body")
        }
        if req.Password != req.Confirm || len(req.Password) < 6 {
            return fiber.NewError(400, "password mismatch or too short")
        }
        if !strings.Contains(req.Email, "@") || len(req.Phone) < 6 || req.Username == "" {
            return fiber.NewError(400, "invalid fields")
        }
        hash, _ := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
        var id string
        err := s.Pool.QueryRow(context.Background(),
            `INSERT INTO users(phone,email,username,display_name,birth_date,password_hash)
             VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
            req.Phone, req.Email, req.Username, req.DisplayName, req.BirthDate, string(hash),
        ).Scan(&id)
        if err != nil {
            return fiber.NewError(409, "user already exists")
        }
        access, _ := s.Access(id)
        refresh, _ := s.Refresh(id)
        return c.JSON(fiber.Map{"access": access, "refresh": refresh, "user_id": id})
    })

    r.Post("/auth/login", func(c *fiber.Ctx) error {
        var req loginReq
        if err := c.BodyParser(&req); err != nil {
            return fiber.NewError(400, "invalid body")
        }
        var id, hash string
        err := s.Pool.QueryRow(context.Background(),
            `SELECT id, password_hash FROM users WHERE username=$1 OR email=$1 OR phone=$1`,
            req.Login).Scan(&id, &hash)
        if err != nil || bcrypt.CompareHashAndPassword([]byte(hash), []byte(req.Password)) != nil {
            return fiber.NewError(401, "invalid credentials")
        }
        access, _ := s.Access(id)
        refresh, _ := s.Refresh(id)
        return c.JSON(fiber.Map{"access": access, "refresh": refresh, "user_id": id})
    })

    r.Post("/auth/refresh", func(c *fiber.Ctx) error {
        var body struct {
            Refresh string `json:"refresh"`
        }
        if err := c.BodyParser(&body); err != nil {
            return fiber.NewError(400, "invalid body")
        }
        cl, err := s.Parse(body.Refresh)
        if err != nil {
            return fiber.NewError(401, "invalid refresh")
        }
        access, _ := s.Access(cl.UserID)
        return c.JSON(fiber.Map{"access": access})
    })
}

func JWTMiddleware(secret string) fiber.Handler {
    return func(c *fiber.Ctx) error {
        h := c.Get("Authorization")
        if !strings.HasPrefix(h, "Bearer ") {
            return fiber.NewError(401, "unauthorized")
        }
        t := strings.TrimPrefix(h, "Bearer ")
        cl, err := (&Service{Secret: secret}).Parse(t)
        if err != nil {
            return fiber.NewError(401, "invalid token")
        }
        c.Locals("uid", cl.UserID)
        return c.Next()
    }
}

func UID(c *fiber.Ctx) string {
    v, _ := c.Locals("uid").(string)
    return v
}