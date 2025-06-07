package api

import (
	"bufio"
	"errors"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/MultiX0/froxy/llama"
	"github.com/gorilla/mux"
)

var Reset = "\033[0m"
var Red = "\033[31m"
var Green = "\033[32m"
var Yellow = "\033[33m"
var Blue = "\033[34m"
var Magenta = "\033[35m"
var Cyan = "\033[36m"
var Gray = "\033[37m"
var White = "\033[97m"

type APIServer struct {
	addr string
}

func NewAPIServer(addr string) *APIServer {
	return &APIServer{
		addr: addr,
	}
}

type wrappedWriter struct {
	http.ResponseWriter
	statusCode    int
	headerWritten bool
}

func (w *wrappedWriter) WriteHeader(statusCode int) {
	if w.headerWritten {
		return
	}

	w.ResponseWriter.WriteHeader(statusCode)
	w.statusCode = statusCode
	w.headerWritten = true
}

// Unwrap returns the underlying ResponseWriter
func (w *wrappedWriter) Unwrap() http.ResponseWriter {
	return w.ResponseWriter
}

// Hijack implements the http.Hijacker interface
func (w *wrappedWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	h, ok := w.ResponseWriter.(http.Hijacker)
	if !ok {
		return nil, nil, errors.New("hijack not supported")
	}
	return h.Hijack()
}

func (s *APIServer) Run() error {
	router := mux.NewRouter()

	// WebSocket endpoint
	router.HandleFunc("/ws/search", func(w http.ResponseWriter, r *http.Request) {
		// Handle CORS preflight for WebSocket
		if r.Method == "OPTIONS" {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Upgrade, Connection, Sec-WebSocket-Key, Sec-WebSocket-Version, Sec-WebSocket-Protocol")
			w.WriteHeader(http.StatusOK)
			return
		}

		// WebSocket upgrade should work for GET requests
		if r.Method == "GET" {
			log.Printf("WebSocket upgrade requested from %s", r.RemoteAddr)
			llama.SearchWebSocketHandler(w, r)
			return
		}

		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	})

	// HTTP fallback endpoint for environments that don't support WebSockets
	router.HandleFunc("/api/search", func(w http.ResponseWriter, r *http.Request) {
		// Handle CORS preflight
		if r.Method == "OPTIONS" {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.WriteHeader(http.StatusOK)
			return
		}

		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	})

	// Health check endpoint
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"healthy","websocket_support":true}`))
	}).Methods("GET")

	// Update middleware to not interfere with WebSocket upgrades
	middlewareChain := MiddlwareChain(
		RequestLoggerMiddleware,
		HMACAuthMiddleware,
	)

	server := http.Server{
		Addr:         s.addr,
		Handler:      middlewareChain(router),
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("Server has started %s", s.addr)
	log.Printf("WebSocket endpoint: ws://localhost%s/ws/search", s.addr)
	log.Printf("HTTP fallback endpoint: http://localhost%s/api/search", s.addr)

	return server.ListenAndServe()
}

func RequestLoggerMiddleware(next http.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Check if this is a WebSocket upgrade request
		isWebSocketUpgrade := r.Header.Get("Upgrade") == "websocket"

		// Don't set CORS headers for WebSocket upgrade requests
		// The WebSocket handler will manage its own headers
		if !isWebSocketUpgrade {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Upgrade, Connection, Sec-WebSocket-Key, Sec-WebSocket-Version, Sec-WebSocket-Protocol")
			w.Header().Set("Access-Control-Expose-Headers", "Content-Length, Content-Type")
		}

		// For WebSocket upgrades, don't wrap the ResponseWriter
		// as it interferes with the upgrade process
		if isWebSocketUpgrade {
			// Get client IP for logging
			var ip string
			xForwardedFor := r.Header.Get("X-Forwarded-For")
			if xForwardedFor != "" {
				ips := strings.Split(xForwardedFor, ",")
				if len(ips) > 0 {
					ip = strings.TrimSpace(ips[0])
				}
			}
			if ip == "" {
				ip = r.Header.Get("X-Real-IP")
			}
			if ip == "" {
				ip = r.RemoteAddr
			}

			log.Printf("%s %s %s %s %s %s %s %s", Green, "[WebSocket]", Reset, ip, r.URL.Path, "upgrade", "requested", time.Since(start))

			// Call next handler directly for WebSocket upgrades
			next.ServeHTTP(w, r)
			return
		}

		// For non-WebSocket requests, use the wrapped writer
		wrapped := &wrappedWriter{
			ResponseWriter: w,
			statusCode:     http.StatusOK,
		}

		// Get client IP
		var ip string
		xForwardedFor := r.Header.Get("X-Forwarded-For")
		if xForwardedFor != "" {
			ips := strings.Split(xForwardedFor, ",")
			if len(ips) > 0 {
				ip = strings.TrimSpace(ips[0])
			}
		}
		if ip == "" {
			ip = r.Header.Get("X-Real-IP")
		}
		if ip == "" {
			ip = r.RemoteAddr
		}

		next.ServeHTTP(wrapped, r)

		var color string
		if wrapped.statusCode >= 200 && wrapped.statusCode < 300 {
			color = Green
		} else {
			color = Red
		}

		log.Printf("%s %s %d %s %s %s %s %s %v", color, "[", wrapped.statusCode, r.Method, "]", Reset, ip, r.URL.Path, time.Since(start))
	}
}

type Middleware func(http.Handler) http.HandlerFunc

func MiddlwareChain(middlewares ...Middleware) Middleware {
	return func(next http.Handler) http.HandlerFunc {
		for i := len(middlewares) - 1; i >= 0; i-- {
			next = middlewares[i](next)
		}

		return next.ServeHTTP
	}
}

func HMACAuthMiddleware(next http.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Skip auth for WebSocket upgrade requests
		if r.Header.Get("Upgrade") == "websocket" {
			next.ServeHTTP(w, r)
			return
		}

		// Get the Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Missing Authorization header", http.StatusUnauthorized)
			return
		}

		// Expect header format: "Bearer <api_key>"
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, "Invalid Authorization header format", http.StatusUnauthorized)
			return
		}

		apiKey := parts[1]
		if apiKey == "" {
			http.Error(w, "Missing API key", http.StatusUnauthorized)
			return
		}

		// In a real implementation, you would validate the API key against
		// a stored set of valid keys (e.g., in a database or config)
		// For this example, we'll use a simple hardcoded check
		validAPIKey := os.Getenv("API_KEY") // Replace with actual key or lookup mechanism
		if apiKey != validAPIKey {
			http.Error(w, "Invalid API key", http.StatusUnauthorized)
			return
		}

		// API key is valid, proceed to next handler
		next.ServeHTTP(w, r)
	}
}
