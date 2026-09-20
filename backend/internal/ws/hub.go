package ws

import (
    "encoding/json"
    "log"
    "sync"

    "github.com/gofiber/websocket/v2"

    "multiapp/internal/auth"
)

type Client struct {
    UserID string
    Conn   *websocket.Conn
    Send   chan []byte
}

type Hub struct {
    mu      sync.RWMutex
    clients map[string]map[*Client]bool
}

func NewHub() *Hub {
    return &Hub{clients: make(map[string]map[*Client]bool)}
}

func (h *Hub) Run() { select {} }

func (h *Hub) Register(c *Client) {
    h.mu.Lock()
    if h.clients[c.UserID] == nil {
        h.clients[c.UserID] = make(map[*Client]bool)
    }
    h.clients[c.UserID][c] = true
    h.mu.Unlock()
}

func (h *Hub) Unregister(c *Client) {
    h.mu.Lock()
    if m, ok := h.clients[c.UserID]; ok {
        delete(m, c)
        if len(m) == 0 {
            delete(h.clients, c.UserID)
        }
    }
    h.mu.Unlock()
    close(c.Send)
}

func (h *Hub) SendToUser(userID string, event string, payload any) {
    h.mu.RLock()
    defer h.mu.RUnlock()
    data, _ := json.Marshal(map[string]any{"event": event, "payload": payload})
    for c := range h.clients[userID] {
        select {
        case c.Send <- data:
        default:
        }
    }
}

func (h *Hub) BroadcastChat(members []string, event string, payload any) {
    for _, uid := range members {
        h.SendToUser(uid, event, payload)
    }
}

func (h *Hub) HandleConn(conn *websocket.Conn, svc *auth.Service) {
    token := conn.Query("token")
    cl, err := svc.Parse(token)
    if err != nil {
        _ = conn.Close()
        return
    }
    c := &Client{UserID: cl.UserID, Conn: conn, Send: make(chan []byte, 64)}
    h.Register(c)
    defer h.Unregister(c)

    go func() {
        for msg := range c.Send {
            if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
                return
            }
        }
    }()

    for {
        _, _, err := conn.ReadMessage()
        if err != nil {
            log.Printf("ws closed: %v", err)
            return
        }
    }
}