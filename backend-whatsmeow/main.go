package main

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"sync"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/rs/cors"
	"github.com/skip2/go-qrcode"

	_ "github.com/mattn/go-sqlite3"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waLog "go.mau.fi/whatsmeow/util/log"
	waProto "go.mau.fi/whatsmeow/binary/proto"
	"google.golang.org/protobuf/proto"
)

var (
	client    *whatsmeow.Client
	qrChan    <-chan whatsmeow.QRChannelItem
	connected bool
	connMu    sync.RWMutex
	msgDB     *sql.DB
	msgDBMu   sync.RWMutex
)

// ─── WebSocket Hub ─────────────────────────────────────────
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type WSClient struct {
	conn *websocket.Conn
	send chan []byte
}

type WSHub struct {
	clients    map[*WSClient]bool
	broadcast  chan []byte
	register   chan *WSClient
	unregister chan *WSClient
	mu         sync.RWMutex
}

var hub = &WSHub{
	clients:    make(map[*WSClient]bool),
	broadcast:  make(chan []byte, 256),
	register:   make(chan *WSClient),
	unregister: make(chan *WSClient),
}

func (h *WSHub) run() {
	for {
		select {
		case c := <-h.register:
			h.mu.Lock()
			h.clients[c] = true
			h.mu.Unlock()
			log.Printf("📡 WebSocket client connected (%d total)", len(h.clients))
		case c := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[c]; ok {
				delete(h.clients, c)
				close(c.send)
			}
			h.mu.Unlock()
			log.Printf("📡 WebSocket client disconnected (%d total)", len(h.clients))
		case msg := <-h.broadcast:
			h.mu.RLock()
			for c := range h.clients {
				select {
				case c.send <- msg:
				default:
					h.mu.RUnlock()
					h.mu.Lock()
					delete(h.clients, c)
					close(c.send)
					h.mu.Unlock()
					h.mu.RLock()
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (c *WSClient) writePump() {
	defer c.conn.Close()
	for msg := range c.send {
		if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
			return
		}
	}
}

func (c *WSClient) readPump() {
	defer func() {
		hub.unregister <- c
		c.conn.Close()
	}()
	c.conn.SetReadLimit(512)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})
	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

// Broadcast a typed event to all WS clients
type WSEvent struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

func broadcastEvent(eventType string, data interface{}) {
	evt := WSEvent{Type: eventType, Data: data}
	b, err := json.Marshal(evt)
	if err != nil {
		return
	}
	hub.broadcast <- b
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WS upgrade error: %v", err)
		return
	}
	c := &WSClient{conn: conn, send: make(chan []byte, 256)}
	hub.register <- c

	// Send current status on connect
	connMu.RLock()
	isConn := connected
	connMu.RUnlock()
	phone, name := "", ""
	if client.Store.ID != nil {
		phone = client.Store.ID.User
		name = client.Store.PushName
	}
	statusData, _ := json.Marshal(WSEvent{
		Type: "status",
		Data: map[string]interface{}{"connected": isConn, "phone": phone, "name": name},
	})
	c.send <- statusData

	go c.writePump()
	go c.readPump()

	// Keep-alive pings
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}()
}

// ─── Data Types ────────────────────────────────────────────
type StoredMessage struct {
	ID         string `json:"id"`
	JID        string `json:"jid"`
	FromMe     bool   `json:"fromMe"`
	Text       string `json:"text"`
	Timestamp  string `json:"timestamp"`
	Type       string `json:"type"`
	SenderName string `json:"senderName,omitempty"`
	MediaURL   string `json:"mediaUrl,omitempty"`
}

func initMessageDB() {
	var err error
	msgDB, err = sql.Open("sqlite3", "file:messages.db?_foreign_keys=on&_journal_mode=WAL")
	if err != nil {
		log.Fatalf("Messages DB error: %v", err)
	}
	_, err = msgDB.Exec(`CREATE TABLE IF NOT EXISTS messages (
		id TEXT PRIMARY KEY,
		jid TEXT NOT NULL,
		from_me INTEGER NOT NULL DEFAULT 0,
		text TEXT NOT NULL DEFAULT '',
		timestamp TEXT NOT NULL,
		type TEXT NOT NULL DEFAULT 'text',
		sender_name TEXT NOT NULL DEFAULT '',
		media_url TEXT NOT NULL DEFAULT ''
	)`)
	if err != nil {
		log.Fatalf("Create messages table error: %v", err)
	}
	_, err = msgDB.Exec(`CREATE INDEX IF NOT EXISTS idx_messages_jid ON messages(jid)`)
	if err != nil {
		log.Printf("Index creation warning: %v", err)
	}
	_, err = msgDB.Exec(`CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)`)
	if err != nil {
		log.Printf("Index creation warning: %v", err)
	}
	// FTS5 virtual table for full-text search
	_, err = msgDB.Exec(`CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(id UNINDEXED, jid UNINDEXED, text, sender_name, content=messages, content_rowid=rowid)`)
	if err != nil {
		log.Printf("FTS5 creation warning: %v", err)
	}
	// Triggers to keep FTS index in sync
	msgDB.Exec(`CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
		INSERT INTO messages_fts(rowid, id, jid, text, sender_name) VALUES (new.rowid, new.id, new.jid, new.text, new.sender_name);
	END`)
	msgDB.Exec(`CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
		INSERT INTO messages_fts(messages_fts, rowid, id, jid, text, sender_name) VALUES ('delete', old.rowid, old.id, old.jid, old.text, old.sender_name);
	END`)
	msgDB.Exec(`CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
		INSERT INTO messages_fts(messages_fts, rowid, id, jid, text, sender_name) VALUES ('delete', old.rowid, old.id, old.jid, old.text, old.sender_name);
		INSERT INTO messages_fts(rowid, id, jid, text, sender_name) VALUES (new.rowid, new.id, new.jid, new.text, new.sender_name);
	END`)
	// Rebuild FTS index from existing data
	msgDB.Exec(`INSERT INTO messages_fts(messages_fts) VALUES ('rebuild')`)
	log.Println("✅ Messages DB initialized (SQLite + FTS5)")
}

func dbInsertMessage(m StoredMessage) {
	fromMe := 0
	if m.FromMe { fromMe = 1 }
	_, err := msgDB.Exec(`INSERT OR IGNORE INTO messages (id, jid, from_me, text, timestamp, type, sender_name, media_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		m.ID, m.JID, fromMe, m.Text, m.Timestamp, m.Type, m.SenderName, m.MediaURL)
	if err != nil {
		log.Printf("DB insert error: %v", err)
	}
}

func dbGetMessages(jid string, limit int) []StoredMessage {
	rows, err := msgDB.Query(`SELECT id, jid, from_me, text, timestamp, type, sender_name, media_url FROM messages WHERE jid = ? ORDER BY timestamp ASC LIMIT ?`, jid, limit)
	if err != nil {
		log.Printf("DB query error: %v", err)
		return []StoredMessage{}
	}
	defer rows.Close()
	return scanMessages(rows)
}

func dbGetAllMessages() []StoredMessage {
	rows, err := msgDB.Query(`SELECT id, jid, from_me, text, timestamp, type, sender_name, media_url FROM messages ORDER BY timestamp ASC`)
	if err != nil {
		log.Printf("DB query error: %v", err)
		return []StoredMessage{}
	}
	defer rows.Close()
	return scanMessages(rows)
}

func scanMessages(rows *sql.Rows) []StoredMessage {
	var result []StoredMessage
	for rows.Next() {
		var m StoredMessage
		var fromMe int
		if err := rows.Scan(&m.ID, &m.JID, &fromMe, &m.Text, &m.Timestamp, &m.Type, &m.SenderName, &m.MediaURL); err != nil {
			continue
		}
		m.FromMe = fromMe == 1
		result = append(result, m)
	}
	if result == nil { result = []StoredMessage{} }
	return result
}

func main() {
	port := os.Getenv("API_PORT")
	if port == "" {
		port = "3000"
	}

	// Start WebSocket hub
	go hub.run()

	// Initialize messages DB
	initMessageDB()

	dbLog := waLog.Stdout("DB", "WARN", true)
	container, err := sqlstore.New("sqlite3", "file:whatsmeow.db?_foreign_keys=on", dbLog)
	if err != nil {
		log.Fatalf("DB error: %v", err)
	}

	deviceStore, err := container.GetFirstDevice()
	if err != nil {
		log.Fatalf("Device error: %v", err)
	}

	clientLog := waLog.Stdout("Client", "WARN", true)
	client = whatsmeow.NewClient(deviceStore, clientLog)
	client.AddEventHandler(eventHandler)

	if client.Store.ID != nil {
		if err = client.Connect(); err != nil {
			log.Printf("Connect error: %v", err)
		} else {
			connMu.Lock()
			connected = true
			connMu.Unlock()
			log.Println("✅ WhatsApp conectado")
		}
	}

	r := mux.NewRouter()

	// WebSocket
	r.HandleFunc("/ws", handleWebSocket)

	// Sessão
	r.HandleFunc("/api/qrcode", handleQRCode).Methods("GET")
	r.HandleFunc("/api/status", handleStatus).Methods("GET")
	r.HandleFunc("/api/disconnect", handleDisconnect).Methods("POST")
	r.HandleFunc("/api/reconnect", handleReconnect).Methods("POST")

	// Mensagens
	r.HandleFunc("/api/send/text", handleSendText).Methods("POST")
	r.HandleFunc("/api/send/image", handleSendImage).Methods("POST")
	r.HandleFunc("/api/send/document", handleSendDocument).Methods("POST")
	r.HandleFunc("/api/send/audio", handleSendAudio).Methods("POST")
	r.HandleFunc("/api/send/video", handleSendVideo).Methods("POST")
	r.HandleFunc("/api/send/location", handleSendLocation).Methods("POST")
	r.HandleFunc("/api/send/reaction", handleSendReaction).Methods("POST")
	r.HandleFunc("/api/send/contact", handleSendContact).Methods("POST")

	// Chats & Contatos
	r.HandleFunc("/api/chats", handleGetChats).Methods("GET")
	r.HandleFunc("/api/messages/{jid}", handleGetMessages).Methods("GET")
	r.HandleFunc("/api/contacts", handleGetContacts).Methods("GET")
	r.HandleFunc("/api/contacts/{jid}", handleGetContactInfo).Methods("GET")
	r.HandleFunc("/api/check-number", handleCheckNumber).Methods("POST")

	// Grupos
	r.HandleFunc("/api/groups", handleGetGroups).Methods("GET")
	r.HandleFunc("/api/groups/{jid}", handleGetGroupInfo).Methods("GET")

	// Utilidades
	r.HandleFunc("/api/mark-read", handleMarkRead).Methods("POST")
	r.HandleFunc("/api/messages/delete", handleDeleteMessage).Methods("POST")
	r.HandleFunc("/api/profile-pic/{jid}", handleGetProfilePic).Methods("GET")
	r.HandleFunc("/api/presence", handleSetPresence).Methods("POST")
	r.HandleFunc("/api/webhook", handleWebhook).Methods("GET", "POST")

	// Estatísticas
	r.HandleFunc("/api/stats", handleStats).Methods("GET")

	// Busca full-text
	r.HandleFunc("/api/search", handleSearch).Methods("GET")

	// Filas
	r.HandleFunc("/api/transfer", handleTransfer).Methods("POST")
	r.HandleFunc("/api/close", handleClose).Methods("POST")

	handler := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	}).Handler(r)

	srv := &http.Server{Addr: ":" + port, Handler: handler}
	go func() {
		log.Printf("🚀 API WhatsApp rodando na porta %s", port)
		log.Printf("📡 WebSocket disponível em ws://localhost:%s/ws", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop
	log.Println("Encerrando...")
	if client != nil {
		client.Disconnect()
	}
	if msgDB != nil {
		msgDB.Close()
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
}

func eventHandler(evt interface{}) {
	switch v := evt.(type) {
	case *events.Connected:
		connMu.Lock()
		connected = true
		connMu.Unlock()
		broadcastEvent("status", map[string]interface{}{"connected": true})

	case *events.Disconnected:
		connMu.Lock()
		connected = false
		connMu.Unlock()
		broadcastEvent("status", map[string]interface{}{"connected": false})

	case *events.Message:
		msg := StoredMessage{
			ID: v.Info.ID, JID: v.Info.Chat.String(),
			FromMe: v.Info.IsFromMe, Timestamp: v.Info.Timestamp.Format(time.RFC3339),
			Type: "text", SenderName: v.Info.PushName,
		}
		if t := v.Message.GetConversation(); t != "" {
			msg.Text = t
		} else if t := v.Message.GetExtendedTextMessage(); t != nil {
			msg.Text = t.GetText()
		} else if t := v.Message.GetImageMessage(); t != nil {
			msg.Type = "image"
			msg.Text = t.GetCaption()
		} else if t := v.Message.GetDocumentMessage(); t != nil {
			msg.Type = "document"
			msg.Text = t.GetFileName()
		} else if v.Message.GetAudioMessage() != nil {
			msg.Type = "audio"
		} else if t := v.Message.GetVideoMessage(); t != nil {
			msg.Type = "video"
			msg.Text = t.GetCaption()
		}
		dbInsertMessage(msg)

		// Broadcast new message to all WS clients
		broadcastEvent("message", msg)

		// Broadcast updated chat info
		broadcastEvent("chat_update", map[string]interface{}{
			"jid":             msg.JID,
			"name":            msg.SenderName,
			"lastMessage":     msg.Text,
			"lastMessageTime": msg.Timestamp,
			"isGroup":         len(msg.JID) > 20,
		})

	case *events.Receipt:
		if v.Type == events.ReceiptTypeRead || v.Type == events.ReceiptTypeDelivered {
			broadcastEvent("receipt", map[string]interface{}{
				"jid":        v.Chat.String(),
				"messageIds": v.MessageIDs,
				"type":       string(v.Type),
				"timestamp":  v.Timestamp.Format(time.RFC3339),
			})
		}

	case *events.Presence:
		broadcastEvent("presence", map[string]interface{}{
			"jid":         v.From.String(),
			"available":   v.Unavailable == false,
			"lastSeen":    v.LastSeen.Format(time.RFC3339),
		})

	case *events.ChatPresence:
		state := "paused"
		if v.State == types.ChatPresenceComposing {
			state = "composing"
		}
		broadcastEvent("typing", map[string]interface{}{
			"jid":   v.MessageSource.Chat.String(),
			"from":  v.MessageSource.Sender.String(),
			"state": state,
		})
	}
}

// ─── Utility ───────────────────────────────────────────────
func jsonOK(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}
func jsonErr(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
func parseJID(s string) (types.JID, error) {
	return types.ParseJID(s)
}

// ─── Handlers (unchanged) ──────────────────────────────────

func handleQRCode(w http.ResponseWriter, r *http.Request) {
	if client.Store.ID != nil {
		connMu.RLock()
		c := connected
		connMu.RUnlock()
		if c {
			jsonOK(w, map[string]string{"status": "connected", "qrcode": ""})
			return
		}
	}
	qrChan, _ = client.GetQRChannel(r.Context())
	if err := client.Connect(); err != nil {
		jsonErr(w, err.Error(), 500)
		return
	}
	select {
	case evt := <-qrChan:
		if evt.Event == "code" {
			png, _ := qrcode.Encode(evt.Code, qrcode.Medium, 256)
			b64 := base64.StdEncoding.EncodeToString(png)
			jsonOK(w, map[string]string{"status": "waiting_scan", "qrcode": "data:image/png;base64," + b64})
		} else {
			jsonOK(w, map[string]string{"status": evt.Event, "qrcode": ""})
		}
	case <-time.After(30 * time.Second):
		jsonOK(w, map[string]string{"status": "timeout", "qrcode": ""})
	}
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	connMu.RLock()
	c := connected
	connMu.RUnlock()
	phone, name := "", ""
	if client.Store.ID != nil {
		phone = client.Store.ID.User
		name = client.Store.PushName
	}
	jsonOK(w, map[string]interface{}{"connected": c, "phone": phone, "name": name})
}

func handleDisconnect(w http.ResponseWriter, r *http.Request) {
	client.Disconnect()
	connMu.Lock()
	connected = false
	connMu.Unlock()
	broadcastEvent("status", map[string]interface{}{"connected": false})
	jsonOK(w, map[string]bool{"success": true})
}

func handleReconnect(w http.ResponseWriter, r *http.Request) {
	if err := client.Connect(); err != nil {
		jsonErr(w, err.Error(), 500)
		return
	}
	jsonOK(w, map[string]bool{"success": true})
}

func handleSendText(w http.ResponseWriter, r *http.Request) {
	var b struct{ JID, Text string }
	json.NewDecoder(r.Body).Decode(&b)
	jid, err := parseJID(b.JID)
	if err != nil { jsonErr(w, err.Error(), 400); return }
	resp, err := client.SendMessage(r.Context(), jid, &waProto.Message{Conversation: proto.String(b.Text)})
	if err != nil { jsonErr(w, err.Error(), 500); return }
	jsonOK(w, map[string]string{"id": resp.ID})
}

func handleSendImage(w http.ResponseWriter, r *http.Request)    { jsonOK(w, map[string]string{"id": "todo"}) }
func handleSendDocument(w http.ResponseWriter, r *http.Request) { jsonOK(w, map[string]string{"id": "todo"}) }
func handleSendAudio(w http.ResponseWriter, r *http.Request)    { jsonOK(w, map[string]string{"id": "todo"}) }
func handleSendVideo(w http.ResponseWriter, r *http.Request)    { jsonOK(w, map[string]string{"id": "todo"}) }
func handleSendContact(w http.ResponseWriter, r *http.Request)  { jsonOK(w, map[string]string{"id": "todo"}) }

func handleSendLocation(w http.ResponseWriter, r *http.Request) {
	var b struct{ JID string; Lat, Lng float64; Name string }
	json.NewDecoder(r.Body).Decode(&b)
	jid, err := parseJID(b.JID)
	if err != nil { jsonErr(w, err.Error(), 400); return }
	resp, err := client.SendMessage(r.Context(), jid, &waProto.Message{
		LocationMessage: &waProto.LocationMessage{
			DegreesLatitude: proto.Float64(b.Lat), DegreesLongitude: proto.Float64(b.Lng), Name: proto.String(b.Name),
		},
	})
	if err != nil { jsonErr(w, err.Error(), 500); return }
	jsonOK(w, map[string]string{"id": resp.ID})
}

func handleSendReaction(w http.ResponseWriter, r *http.Request) {
	var b struct{ JID, MessageID, Emoji string }
	json.NewDecoder(r.Body).Decode(&b)
	jid, err := parseJID(b.JID)
	if err != nil { jsonErr(w, err.Error(), 400); return }
	resp, err := client.SendMessage(r.Context(), jid, &waProto.Message{
		ReactionMessage: &waProto.ReactionMessage{
			Key:  &waProto.MessageKey{RemoteJid: proto.String(b.JID), Id: proto.String(b.MessageID)},
			Text: proto.String(b.Emoji),
		},
	})
	if err != nil { jsonErr(w, err.Error(), 500); return }
	jsonOK(w, map[string]string{"id": resp.ID})
}

func handleGetChats(w http.ResponseWriter, r *http.Request) {
	messages := dbGetAllMessages()
	chatMap := map[string]map[string]interface{}{}
	for _, m := range messages {
		if _, ok := chatMap[m.JID]; !ok {
			chatMap[m.JID] = map[string]interface{}{
				"jid": m.JID, "name": m.SenderName, "lastMessage": m.Text,
				"lastMessageTime": m.Timestamp, "unreadCount": 0,
				"isGroup": len(m.JID) > 20, "status": "attending",
			}
		} else {
			chatMap[m.JID]["lastMessage"] = m.Text
			chatMap[m.JID]["lastMessageTime"] = m.Timestamp
		}
	}
	chats := make([]map[string]interface{}, 0, len(chatMap))
	for _, c := range chatMap { chats = append(chats, c) }
	jsonOK(w, chats)
}

func handleGetMessages(w http.ResponseWriter, r *http.Request) {
	jid := mux.Vars(r)["jid"]
	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 { limit = v }
	}
	result := dbGetMessages(jid, limit)
	jsonOK(w, result)
}

func handleGetContacts(w http.ResponseWriter, r *http.Request) {
	contacts, err := client.Store.Contacts.GetAllContacts()
	if err != nil { jsonOK(w, []interface{}{}); return }
	result := make([]map[string]string, 0)
	for jid, info := range contacts {
		result = append(result, map[string]string{
			"jid": jid.String(), "name": info.FullName, "pushName": info.PushName, "phone": jid.User,
		})
	}
	jsonOK(w, result)
}

func handleGetContactInfo(w http.ResponseWriter, r *http.Request) {
	jid, err := parseJID(mux.Vars(r)["jid"])
	if err != nil { jsonErr(w, err.Error(), 400); return }
	info, err := client.Store.Contacts.GetContact(jid)
	if err != nil { jsonErr(w, "Not found", 404); return }
	jsonOK(w, map[string]string{"jid": jid.String(), "name": info.FullName, "pushName": info.PushName, "phone": jid.User})
}

func handleGetGroups(w http.ResponseWriter, r *http.Request) {
	groups, err := client.GetJoinedGroups()
	if err != nil { jsonErr(w, err.Error(), 500); return }
	result := make([]map[string]interface{}, 0)
	for _, g := range groups {
		ps := make([]map[string]interface{}, 0)
		for _, p := range g.Participants {
			ps = append(ps, map[string]interface{}{"jid": p.JID.String(), "isAdmin": p.IsAdmin || p.IsSuperAdmin})
		}
		result = append(result, map[string]interface{}{"jid": g.JID.String(), "name": g.Name, "description": g.Topic, "participants": ps})
	}
	jsonOK(w, result)
}

func handleGetGroupInfo(w http.ResponseWriter, r *http.Request) {
	jid, err := parseJID(mux.Vars(r)["jid"])
	if err != nil { jsonErr(w, err.Error(), 400); return }
	info, err := client.GetGroupInfo(jid)
	if err != nil { jsonErr(w, err.Error(), 500); return }
	ps := make([]map[string]interface{}, 0)
	for _, p := range info.Participants {
		ps = append(ps, map[string]interface{}{"jid": p.JID.String(), "isAdmin": p.IsAdmin || p.IsSuperAdmin})
	}
	jsonOK(w, map[string]interface{}{"jid": info.JID.String(), "name": info.Name, "description": info.Topic, "participants": ps})
}

func handleCheckNumber(w http.ResponseWriter, r *http.Request) {
	var b struct{ Phone string }
	json.NewDecoder(r.Body).Decode(&b)
	resp, err := client.IsOnWhatsApp([]string{"+" + b.Phone})
	if err != nil || len(resp) == 0 { jsonOK(w, map[string]interface{}{"exists": false, "jid": ""}); return }
	jsonOK(w, map[string]interface{}{"exists": resp[0].IsIn, "jid": resp[0].JID.String()})
}

func handleMarkRead(w http.ResponseWriter, r *http.Request) {
	var b struct{ JID string; MessageIDs []string }
	json.NewDecoder(r.Body).Decode(&b)
	jid, _ := parseJID(b.JID)
	ids := make([]types.MessageID, len(b.MessageIDs))
	for i, id := range b.MessageIDs { ids[i] = types.MessageID(id) }
	client.MarkRead(ids, time.Now(), jid, jid)
	jsonOK(w, map[string]bool{"success": true})
}

func handleDeleteMessage(w http.ResponseWriter, r *http.Request) {
	var b struct{ JID, MessageID string }
	json.NewDecoder(r.Body).Decode(&b)
	jid, _ := parseJID(b.JID)
	client.SendMessage(r.Context(), jid, client.BuildRevoke(jid, types.EmptyJID, b.MessageID))
	jsonOK(w, map[string]bool{"success": true})
}

func handleGetProfilePic(w http.ResponseWriter, r *http.Request) {
	jid, _ := parseJID(mux.Vars(r)["jid"])
	pic, err := client.GetProfilePictureInfo(jid, nil)
	if err != nil || pic == nil { jsonOK(w, map[string]string{"url": ""}); return }
	jsonOK(w, map[string]string{"url": pic.URL})
}

func handleSetPresence(w http.ResponseWriter, r *http.Request) {
	var b struct{ JID, Presence string }
	json.NewDecoder(r.Body).Decode(&b)
	jid, _ := parseJID(b.JID)
	switch b.Presence {
	case "composing":
		client.SendChatPresence(jid, types.ChatPresenceComposing, types.ChatPresenceMediaText)
	case "paused":
		client.SendChatPresence(jid, types.ChatPresencePaused, types.ChatPresenceMediaText)
	case "available":
		client.SendPresence(types.PresenceAvailable)
	case "unavailable":
		client.SendPresence(types.PresenceUnavailable)
	}
	jsonOK(w, map[string]bool{"success": true})
}

var (webhookURL string; webhookEvents []string; webhookMu sync.RWMutex)

func handleWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		webhookMu.RLock(); defer webhookMu.RUnlock()
		jsonOK(w, map[string]interface{}{"url": webhookURL, "events": webhookEvents})
		return
	}
	var b struct{ URL string; Events []string }
	json.NewDecoder(r.Body).Decode(&b)
	webhookMu.Lock(); webhookURL = b.URL; webhookEvents = b.Events; webhookMu.Unlock()
	jsonOK(w, map[string]bool{"success": true})
}

func handleTransfer(w http.ResponseWriter, r *http.Request) {
	jsonOK(w, map[string]bool{"success": true})
}

func handleClose(w http.ResponseWriter, r *http.Request) {
	jsonOK(w, map[string]bool{"success": true})
}

// ─── Stats Endpoint ────────────────────────────────────────
func handleStats(w http.ResponseWriter, r *http.Request) {
	messages := dbGetAllMessages()

	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	weekStart := todayStart.AddDate(0, 0, -int(now.Weekday()))

	totalMessages := len(messages)
	var sentToday, receivedToday, sentWeek, receivedWeek int
	chatSet := map[string]bool{}
	groupSet := map[string]bool{}

	// Track response times: for each incoming msg, find the next outgoing in same JID
	type msgPair struct{ received, replied time.Time }
	var responseTimes []time.Duration

	// Group messages by JID for response time calculation
	jidMessages := map[string][]StoredMessage{}
	hourlyVolume := map[int]map[string]int{} // hour -> {sent, received}
	dailyVolume := map[string]map[string]int{} // date -> {sent, received}

	for i := 0; i < 24; i++ {
		hourlyVolume[i] = map[string]int{"sent": 0, "received": 0}
	}

	for _, m := range messages {
		ts, err := time.Parse(time.RFC3339, m.Timestamp)
		if err != nil {
			continue
		}

		isGroup := len(m.JID) > 20
		if isGroup {
			groupSet[m.JID] = true
		} else {
			chatSet[m.JID] = true
		}

		jidMessages[m.JID] = append(jidMessages[m.JID], m)

		// Today stats
		if ts.After(todayStart) {
			h := ts.Hour()
			if m.FromMe {
				sentToday++
				hourlyVolume[h]["sent"]++
			} else {
				receivedToday++
				hourlyVolume[h]["received"]++
			}
		}

		// Week stats
		if ts.After(weekStart) {
			dateKey := ts.Format("2006-01-02")
			if dailyVolume[dateKey] == nil {
				dailyVolume[dateKey] = map[string]int{"sent": 0, "received": 0}
			}
			if m.FromMe {
				sentWeek++
				dailyVolume[dateKey]["sent"]++
			} else {
				receivedWeek++
				dailyVolume[dateKey]["received"]++
			}
		}
	}

	// Calculate average response time per JID
	for _, msgs := range jidMessages {
		for i := 0; i < len(msgs)-1; i++ {
			if !msgs[i].FromMe {
				// Find the next outgoing message as reply
				for j := i + 1; j < len(msgs); j++ {
					if msgs[j].FromMe {
						t1, e1 := time.Parse(time.RFC3339, msgs[i].Timestamp)
						t2, e2 := time.Parse(time.RFC3339, msgs[j].Timestamp)
						if e1 == nil && e2 == nil {
							diff := t2.Sub(t1)
							if diff > 0 && diff < 24*time.Hour {
								responseTimes = append(responseTimes, diff)
							}
						}
						break
					}
				}
			}
		}
	}

	avgResponseMs := int64(0)
	if len(responseTimes) > 0 {
		var total int64
		for _, d := range responseTimes {
			total += d.Milliseconds()
		}
		avgResponseMs = total / int64(len(responseTimes))
	}

	// Build hourly array
	hourlyArr := make([]map[string]interface{}, 24)
	for i := 0; i < 24; i++ {
		hourlyArr[i] = map[string]interface{}{
			"hour":     fmt.Sprintf("%02dh", i),
			"enviadas": hourlyVolume[i]["sent"],
			"recebidas": hourlyVolume[i]["received"],
		}
	}

	// Build daily array (last 7 days)
	dailyArr := make([]map[string]interface{}, 0)
	for d := 6; d >= 0; d-- {
		day := todayStart.AddDate(0, 0, -d)
		dateKey := day.Format("2006-01-02")
		weekday := day.Weekday().String()[:3]
		sent := 0
		received := 0
		if dv, ok := dailyVolume[dateKey]; ok {
			sent = dv["sent"]
			received = dv["received"]
		}
		dailyArr = append(dailyArr, map[string]interface{}{
			"date":      dateKey,
			"day":       weekday,
			"enviadas":  sent,
			"recebidas": received,
			"total":     sent + received,
		})
	}

	stats := map[string]interface{}{
		"totalMessages":     totalMessages,
		"sentToday":         sentToday,
		"receivedToday":     receivedToday,
		"sentWeek":          sentWeek,
		"receivedWeek":      receivedWeek,
		"totalChats":        len(chatSet),
		"totalGroups":       len(groupSet),
		"avgResponseTimeMs": avgResponseMs,
		"avgResponseTime":   formatDuration(avgResponseMs),
		"hourlyVolume":      hourlyArr,
		"dailyVolume":       dailyArr,
		"responseSamples":   len(responseTimes),
		"timestamp":         now.Format(time.RFC3339),
	}

	jsonOK(w, stats)
}

func handleSearch(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q == "" {
		jsonOK(w, []StoredMessage{})
		return
	}
	jidFilter := r.URL.Query().Get("jid")
	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 200 {
			limit = v
		}
	}

	// Escape FTS5 special chars and add prefix matching
	safeQ := q + "*"

	var rows *sql.Rows
	var err error
	if jidFilter != "" {
		rows, err = msgDB.Query(`SELECT m.id, m.jid, m.from_me, m.text, m.timestamp, m.type, m.sender_name, m.media_url
			FROM messages m JOIN messages_fts f ON m.rowid = f.rowid
			WHERE messages_fts MATCH ? AND m.jid = ?
			ORDER BY m.timestamp DESC LIMIT ?`, safeQ, jidFilter, limit)
	} else {
		rows, err = msgDB.Query(`SELECT m.id, m.jid, m.from_me, m.text, m.timestamp, m.type, m.sender_name, m.media_url
			FROM messages m JOIN messages_fts f ON m.rowid = f.rowid
			WHERE messages_fts MATCH ?
			ORDER BY m.timestamp DESC LIMIT ?`, safeQ, limit)
	}
	if err != nil {
		log.Printf("FTS search error: %v", err)
		jsonOK(w, []StoredMessage{})
		return
	}
	defer rows.Close()
	results := scanMessages(rows)
	jsonOK(w, results)
}

func formatDuration(ms int64) string {
	if ms <= 0 {
		return "—"
	}
	s := ms / 1000
	if s < 60 {
		return fmt.Sprintf("%ds", s)
	}
	m := s / 60
	s = s % 60
	if m < 60 {
		return fmt.Sprintf("%dm %ds", m, s)
	}
	h := m / 60
	m = m % 60
	return fmt.Sprintf("%dh %dm", h, m)
}
