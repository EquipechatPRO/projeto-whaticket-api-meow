package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/gorilla/mux"
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

// ─── Global State ───────────────────────────────────────────
var (
	client    *whatsmeow.Client
	qrChan    <-chan whatsmeow.QRChannelItem
	qrCode    string
	qrMu      sync.RWMutex
	connected bool
	connMu    sync.RWMutex
	messages  []StoredMessage
	msgMu     sync.RWMutex
)

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

// ─── Main ───────────────────────────────────────────────────
func main() {
	port := os.Getenv("API_PORT")
	if port == "" {
		port = "3000"
	}

	// Setup database
	dbLog := waLog.Stdout("Database", "WARN", true)
	container, err := sqlstore.New("sqlite3", "file:whatsmeow.db?_foreign_keys=on", dbLog)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	deviceStore, err := container.GetFirstDevice()
	if err != nil {
		log.Fatalf("Failed to get device: %v", err)
	}

	clientLog := waLog.Stdout("Client", "WARN", true)
	client = whatsmeow.NewClient(deviceStore, clientLog)

	// Event handler
	client.AddEventHandler(eventHandler)

	// Auto-connect if already logged in
	if client.Store.ID != nil {
		err = client.Connect()
		if err != nil {
			log.Printf("Failed to connect: %v", err)
		} else {
			connMu.Lock()
			connected = true
			connMu.Unlock()
			log.Println("✅ Connected to WhatsApp")
		}
	}

	// Router
	r := mux.NewRouter()
	r.HandleFunc("/api/qrcode", handleQRCode).Methods("GET")
	r.HandleFunc("/api/status", handleStatus).Methods("GET")
	r.HandleFunc("/api/disconnect", handleDisconnect).Methods("POST")
	r.HandleFunc("/api/reconnect", handleReconnect).Methods("POST")
	r.HandleFunc("/api/send/text", handleSendText).Methods("POST")
	r.HandleFunc("/api/send/image", handleSendImage).Methods("POST")
	r.HandleFunc("/api/send/document", handleSendDocument).Methods("POST")
	r.HandleFunc("/api/send/audio", handleSendAudio).Methods("POST")
	r.HandleFunc("/api/send/video", handleSendVideo).Methods("POST")
	r.HandleFunc("/api/send/location", handleSendLocation).Methods("POST")
	r.HandleFunc("/api/send/reaction", handleSendReaction).Methods("POST")
	r.HandleFunc("/api/send/contact", handleSendContact).Methods("POST")
	r.HandleFunc("/api/chats", handleGetChats).Methods("GET")
	r.HandleFunc("/api/messages/{jid}", handleGetMessages).Methods("GET")
	r.HandleFunc("/api/contacts", handleGetContacts).Methods("GET")
	r.HandleFunc("/api/contacts/{jid}", handleGetContactInfo).Methods("GET")
	r.HandleFunc("/api/groups", handleGetGroups).Methods("GET")
	r.HandleFunc("/api/groups/{jid}", handleGetGroupInfo).Methods("GET")
	r.HandleFunc("/api/check-number", handleCheckNumber).Methods("POST")
	r.HandleFunc("/api/mark-read", handleMarkRead).Methods("POST")
	r.HandleFunc("/api/messages/delete", handleDeleteMessage).Methods("POST")
	r.HandleFunc("/api/profile-pic/{jid}", handleGetProfilePic).Methods("GET")
	r.HandleFunc("/api/presence", handleSetPresence).Methods("POST")
	r.HandleFunc("/api/webhook", handleWebhook).Methods("GET", "POST")

	// CORS
	handler := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	}).Handler(r)

	// Start server
	srv := &http.Server{Addr: ":" + port, Handler: handler}
	go func() {
		log.Printf("🚀 WhatsApp API running on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop
	log.Println("Shutting down...")
	if client != nil {
		client.Disconnect()
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	srv.Shutdown(ctx)
}

// ─── Event Handler ──────────────────────────────────────────
func eventHandler(evt interface{}) {
	switch v := evt.(type) {
	case *events.Connected:
		connMu.Lock()
		connected = true
		connMu.Unlock()
		log.Println("✅ WhatsApp connected")

	case *events.Disconnected:
		connMu.Lock()
		connected = false
		connMu.Unlock()
		log.Println("❌ WhatsApp disconnected")

	case *events.Message:
		msg := StoredMessage{
			ID:        v.Info.ID,
			JID:       v.Info.Chat.String(),
			FromMe:    v.Info.IsFromMe,
			Timestamp: v.Info.Timestamp.Format(time.RFC3339),
			Type:      "text",
		}
		if v.Info.PushName != "" {
			msg.SenderName = v.Info.PushName
		}
		if v.Message.GetConversation() != "" {
			msg.Text = v.Message.GetConversation()
		} else if v.Message.GetExtendedTextMessage() != nil {
			msg.Text = v.Message.GetExtendedTextMessage().GetText()
		} else if v.Message.GetImageMessage() != nil {
			msg.Type = "image"
			msg.Text = v.Message.GetImageMessage().GetCaption()
		} else if v.Message.GetDocumentMessage() != nil {
			msg.Type = "document"
			msg.Text = v.Message.GetDocumentMessage().GetFileName()
		} else if v.Message.GetAudioMessage() != nil {
			msg.Type = "audio"
		} else if v.Message.GetVideoMessage() != nil {
			msg.Type = "video"
			msg.Text = v.Message.GetVideoMessage().GetCaption()
		}

		msgMu.Lock()
		messages = append(messages, msg)
		// Keep last 10000 messages in memory
		if len(messages) > 10000 {
			messages = messages[len(messages)-10000:]
		}
		msgMu.Unlock()
	}
}

// ─── Helpers ────────────────────────────────────────────────
func jsonResponse(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func jsonError(w http.ResponseWriter, msg string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func parseJID(s string) (types.JID, error) {
	jid, err := types.ParseJID(s)
	if err != nil {
		return jid, fmt.Errorf("invalid JID: %s", s)
	}
	return jid, nil
}

// ─── Handlers ───────────────────────────────────────────────

func handleQRCode(w http.ResponseWriter, r *http.Request) {
	if client.Store.ID != nil {
		connMu.RLock()
		isConn := connected
		connMu.RUnlock()
		if isConn {
			jsonResponse(w, map[string]string{"status": "connected", "qrcode": ""})
			return
		}
	}

	// Generate QR
	qrChan, _ = client.GetQRChannel(r.Context())
	err := client.Connect()
	if err != nil {
		jsonError(w, "Failed to connect: "+err.Error(), 500)
		return
	}

	// Wait for QR code
	select {
	case evt := <-qrChan:
		if evt.Event == "code" {
			png, _ := qrcode.Encode(evt.Code, qrcode.Medium, 256)
			b64 := base64.StdEncoding.EncodeToString(png)
			qrMu.Lock()
			qrCode = b64
			qrMu.Unlock()
			jsonResponse(w, map[string]string{
				"status": "waiting_scan",
				"qrcode": "data:image/png;base64," + b64,
			})
		} else {
			jsonResponse(w, map[string]string{"status": evt.Event, "qrcode": ""})
		}
	case <-time.After(30 * time.Second):
		jsonResponse(w, map[string]string{"status": "timeout", "qrcode": ""})
	}
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	connMu.RLock()
	isConn := connected
	connMu.RUnlock()

	phone := ""
	name := ""
	if client.Store.ID != nil {
		phone = client.Store.ID.User
		if client.Store.PushName != "" {
			name = client.Store.PushName
		}
	}

	jsonResponse(w, map[string]interface{}{
		"connected": isConn,
		"phone":     phone,
		"name":      name,
	})
}

func handleDisconnect(w http.ResponseWriter, r *http.Request) {
	client.Disconnect()
	connMu.Lock()
	connected = false
	connMu.Unlock()
	jsonResponse(w, map[string]bool{"success": true})
}

func handleReconnect(w http.ResponseWriter, r *http.Request) {
	err := client.Connect()
	if err != nil {
		jsonError(w, "Failed to reconnect: "+err.Error(), 500)
		return
	}
	jsonResponse(w, map[string]bool{"success": true})
}

func handleSendText(w http.ResponseWriter, r *http.Request) {
	var body struct {
		JID  string `json:"jid"`
		Text string `json:"text"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	jid, err := parseJID(body.JID)
	if err != nil {
		jsonError(w, err.Error(), 400)
		return
	}

	resp, err := client.SendMessage(r.Context(), jid, &waProto.Message{
		Conversation: proto.String(body.Text),
	})
	if err != nil {
		jsonError(w, "Failed to send: "+err.Error(), 500)
		return
	}
	jsonResponse(w, map[string]string{"id": resp.ID})
}

func handleSendImage(w http.ResponseWriter, r *http.Request) {
	var body struct {
		JID      string `json:"jid"`
		ImageURL string `json:"image_url"`
		Caption  string `json:"caption"`
	}
	json.NewDecoder(r.Body).Decode(&body)
	// TODO: Download image from URL, upload to WhatsApp, then send
	jsonResponse(w, map[string]string{"id": "not_implemented_yet"})
}

func handleSendDocument(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, map[string]string{"id": "not_implemented_yet"})
}

func handleSendAudio(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, map[string]string{"id": "not_implemented_yet"})
}

func handleSendVideo(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, map[string]string{"id": "not_implemented_yet"})
}

func handleSendLocation(w http.ResponseWriter, r *http.Request) {
	var body struct {
		JID  string  `json:"jid"`
		Lat  float64 `json:"latitude"`
		Lng  float64 `json:"longitude"`
		Name string  `json:"name"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	jid, err := parseJID(body.JID)
	if err != nil {
		jsonError(w, err.Error(), 400)
		return
	}

	resp, err := client.SendMessage(r.Context(), jid, &waProto.Message{
		LocationMessage: &waProto.LocationMessage{
			DegreesLatitude:  proto.Float64(body.Lat),
			DegreesLongitude: proto.Float64(body.Lng),
			Name:             proto.String(body.Name),
		},
	})
	if err != nil {
		jsonError(w, "Failed to send: "+err.Error(), 500)
		return
	}
	jsonResponse(w, map[string]string{"id": resp.ID})
}

func handleSendReaction(w http.ResponseWriter, r *http.Request) {
	var body struct {
		JID       string `json:"jid"`
		MessageID string `json:"message_id"`
		Emoji     string `json:"emoji"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	jid, err := parseJID(body.JID)
	if err != nil {
		jsonError(w, err.Error(), 400)
		return
	}

	resp, err := client.SendMessage(r.Context(), jid, &waProto.Message{
		ReactionMessage: &waProto.ReactionMessage{
			Key: &waProto.MessageKey{
				RemoteJid: proto.String(body.JID),
				Id:        proto.String(body.MessageID),
			},
			Text: proto.String(body.Emoji),
		},
	})
	if err != nil {
		jsonError(w, err.Error(), 500)
		return
	}
	jsonResponse(w, map[string]bool{"success": resp.ID != ""})
}

func handleSendContact(w http.ResponseWriter, r *http.Request) {
	jsonResponse(w, map[string]string{"id": "not_implemented_yet"})
}

func handleGetChats(w http.ResponseWriter, r *http.Request) {
	// whatsmeow doesn't have a "list chats" method directly
	// We build chat list from stored messages
	msgMu.RLock()
	defer msgMu.RUnlock()

	chatMap := make(map[string]*map[string]interface{})
	for _, msg := range messages {
		if _, exists := chatMap[msg.JID]; !exists {
			isGroup := len(msg.JID) > 20 // group JIDs are longer
			chat := map[string]interface{}{
				"jid":             msg.JID,
				"name":            msg.SenderName,
				"lastMessage":     msg.Text,
				"lastMessageTime": msg.Timestamp,
				"unreadCount":     0,
				"isGroup":         isGroup,
				"status":          "attending",
			}
			chatMap[msg.JID] = &chat
		} else {
			c := *chatMap[msg.JID]
			c["lastMessage"] = msg.Text
			c["lastMessageTime"] = msg.Timestamp
		}
	}

	chats := make([]map[string]interface{}, 0, len(chatMap))
	for _, c := range chatMap {
		chats = append(chats, *c)
	}
	jsonResponse(w, chats)
}

func handleGetMessages(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	jid := vars["jid"]

	msgMu.RLock()
	defer msgMu.RUnlock()

	var result []StoredMessage
	for _, msg := range messages {
		if msg.JID == jid {
			result = append(result, msg)
		}
	}
	if result == nil {
		result = []StoredMessage{}
	}
	jsonResponse(w, result)
}

func handleGetContacts(w http.ResponseWriter, r *http.Request) {
	contacts, err := client.Store.Contacts.GetAllContacts()
	if err != nil {
		jsonResponse(w, []interface{}{})
		return
	}

	result := make([]map[string]string, 0)
	for jid, info := range contacts {
		result = append(result, map[string]string{
			"jid":      jid.String(),
			"name":     info.FullName,
			"pushName": info.PushName,
			"phone":    jid.User,
		})
	}
	jsonResponse(w, result)
}

func handleGetContactInfo(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	jid, err := parseJID(vars["jid"])
	if err != nil {
		jsonError(w, err.Error(), 400)
		return
	}

	info, err := client.Store.Contacts.GetContact(jid)
	if err != nil {
		jsonError(w, "Contact not found", 404)
		return
	}
	jsonResponse(w, map[string]string{
		"jid":      jid.String(),
		"name":     info.FullName,
		"pushName": info.PushName,
		"phone":    jid.User,
	})
}

func handleGetGroups(w http.ResponseWriter, r *http.Request) {
	groups, err := client.GetJoinedGroups()
	if err != nil {
		jsonError(w, err.Error(), 500)
		return
	}

	result := make([]map[string]interface{}, 0)
	for _, g := range groups {
		participants := make([]map[string]interface{}, 0)
		for _, p := range g.Participants {
			participants = append(participants, map[string]interface{}{
				"jid":     p.JID.String(),
				"isAdmin": p.IsAdmin || p.IsSuperAdmin,
			})
		}
		result = append(result, map[string]interface{}{
			"jid":          g.JID.String(),
			"name":         g.Name,
			"description":  g.Topic,
			"participants": participants,
		})
	}
	jsonResponse(w, result)
}

func handleGetGroupInfo(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	jid, err := parseJID(vars["jid"])
	if err != nil {
		jsonError(w, err.Error(), 400)
		return
	}

	info, err := client.GetGroupInfo(jid)
	if err != nil {
		jsonError(w, err.Error(), 500)
		return
	}

	participants := make([]map[string]interface{}, 0)
	for _, p := range info.Participants {
		participants = append(participants, map[string]interface{}{
			"jid":     p.JID.String(),
			"isAdmin": p.IsAdmin || p.IsSuperAdmin,
		})
	}

	jsonResponse(w, map[string]interface{}{
		"jid":          info.JID.String(),
		"name":         info.Name,
		"description":  info.Topic,
		"participants": participants,
	})
}

func handleCheckNumber(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Phone string `json:"phone"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	resp, err := client.IsOnWhatsApp([]string{"+" + body.Phone})
	if err != nil || len(resp) == 0 {
		jsonResponse(w, map[string]interface{}{"exists": false, "jid": ""})
		return
	}
	jsonResponse(w, map[string]interface{}{
		"exists": resp[0].IsIn,
		"jid":    resp[0].JID.String(),
	})
}

func handleMarkRead(w http.ResponseWriter, r *http.Request) {
	var body struct {
		JID        string   `json:"jid"`
		MessageIDs []string `json:"message_ids"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	jid, err := parseJID(body.JID)
	if err != nil {
		jsonError(w, err.Error(), 400)
		return
	}

	ids := make([]types.MessageID, len(body.MessageIDs))
	for i, id := range body.MessageIDs {
		ids[i] = types.MessageID(id)
	}

	err = client.MarkRead(ids, time.Now(), jid, jid)
	if err != nil {
		jsonError(w, err.Error(), 500)
		return
	}
	jsonResponse(w, map[string]bool{"success": true})
}

func handleDeleteMessage(w http.ResponseWriter, r *http.Request) {
	var body struct {
		JID       string `json:"jid"`
		MessageID string `json:"message_id"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	jid, err := parseJID(body.JID)
	if err != nil {
		jsonError(w, err.Error(), 400)
		return
	}

	_, err = client.SendMessage(r.Context(), jid, client.BuildRevoke(jid, types.EmptyJID, body.MessageID))
	if err != nil {
		jsonError(w, err.Error(), 500)
		return
	}
	jsonResponse(w, map[string]bool{"success": true})
}

func handleGetProfilePic(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	jid, err := parseJID(vars["jid"])
	if err != nil {
		jsonError(w, err.Error(), 400)
		return
	}

	pic, err := client.GetProfilePictureInfo(jid, nil)
	if err != nil || pic == nil {
		jsonResponse(w, map[string]string{"url": ""})
		return
	}
	jsonResponse(w, map[string]string{"url": pic.URL})
}

func handleSetPresence(w http.ResponseWriter, r *http.Request) {
	var body struct {
		JID      string `json:"jid"`
		Presence string `json:"presence"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	jid, err := parseJID(body.JID)
	if err != nil {
		jsonError(w, err.Error(), 400)
		return
	}

	switch body.Presence {
	case "composing":
		err = client.SendChatPresence(jid, types.ChatPresenceComposing, types.ChatPresenceMediaText)
	case "paused":
		err = client.SendChatPresence(jid, types.ChatPresencePaused, types.ChatPresenceMediaText)
	case "available":
		err = client.SendPresence(types.PresenceAvailable)
	case "unavailable":
		err = client.SendPresence(types.PresenceUnavailable)
	}

	if err != nil {
		jsonError(w, err.Error(), 500)
		return
	}
	jsonResponse(w, map[string]bool{"success": true})
}

// Webhook storage
var (
	webhookURL    string
	webhookEvents []string
	webhookMu     sync.RWMutex
)

func handleWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method == "GET" {
		webhookMu.RLock()
		defer webhookMu.RUnlock()
		jsonResponse(w, map[string]interface{}{
			"url":    webhookURL,
			"events": webhookEvents,
		})
		return
	}

	var body struct {
		URL    string   `json:"url"`
		Events []string `json:"events"`
	}
	json.NewDecoder(r.Body).Decode(&body)

	webhookMu.Lock()
	webhookURL = body.URL
	webhookEvents = body.Events
	webhookMu.Unlock()

	jsonResponse(w, map[string]bool{"success": true})
}
