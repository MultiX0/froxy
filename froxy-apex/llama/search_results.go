package llama

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"runtime"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/MultiX0/froxy/constants"
	"github.com/MultiX0/froxy/db"
	"github.com/MultiX0/froxy/functions"
	"github.com/MultiX0/froxy/models"
	"github.com/MultiX0/froxy/utils"
	"github.com/gorilla/websocket"
)

// WebSocket message types
type MessageType string

const (
	MSG_ANALYZING_QUERY   MessageType = "analyzing_query"
	MSG_QUERY_ENHANCED    MessageType = "query_enhanced"
	MSG_SEARCHING_DB      MessageType = "searching_db"
	MSG_DB_RESULTS_FOUND  MessageType = "db_results_found"
	MSG_PROCESSING_CHUNKS MessageType = "processing_chunks"
	MSG_ANALYZING_RESULTS MessageType = "analyzing_results"
	MSG_FINAL_RESPONSE    MessageType = "final_response"
	MSG_ERROR             MessageType = "error"
	MSG_KEEP_ALIVE        MessageType = "keep_alive"
	MSG_SEARCH_COMPLETE   MessageType = "search_complete"
)

// WebSocket message structure
type WSMessage struct {
	Type      MessageType `json:"type"`
	Message   string      `json:"message"`
	Data      interface{} `json:"data,omitempty"`
	Progress  int         `json:"progress,omitempty"` // 0-100
	Timestamp time.Time   `json:"timestamp"`
}

// Progress tracking data structures
type QueryAnalysisData struct {
	OriginalQuery string `json:"original_query"`
	Status        string `json:"status"`
}

type QueryEnhancedData struct {
	OriginalQuery string `json:"original_query"`
	EnhancedQuery string `json:"enhanced_query"`
}

type SearchResultsData struct {
	PointsFound int    `json:"points_found"`
	TimeTaken   string `json:"time_taken"`
}

type ChunkProcessingData struct {
	TotalChunks     int `json:"total_chunks"`
	ProcessedChunks int `json:"processed_chunks"`
	FilteredChunks  int `json:"filtered_chunks"`
}

type AnalysisData struct {
	TopChunks int    `json:"top_chunks"`
	Status    string `json:"status"`
}

type ScoredChunk struct {
	Text    string
	URL     string
	Score   float32
	Favicon string
}

type ChunkJob struct {
	chunk   string
	url     string
	index   int
	favicon string
}

type ChunkResult struct {
	chunk ScoredChunk
	err   error
	index int
}

// Global embedding cache
var embeddingCache = struct {
	sync.RWMutex
	data map[string][]float32
}{data: make(map[string][]float32)}

// Pre-configured HTTP client with longer timeouts
var httpClient = &http.Client{
	Timeout: 30 * time.Second,
	Transport: &http.Transport{
		MaxIdleConns:        50,
		MaxIdleConnsPerHost: 10,
		IdleConnTimeout:     60 * time.Second,
		DisableKeepAlives:   false,
	},
}

// WebSocket upgrader with optimized settings
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
	ReadBufferSize:    4096,
	WriteBufferSize:   4096,
	EnableCompression: true,
	HandshakeTimeout:  45 * time.Second,
}

type WSConnection struct {
	conn       *websocket.Conn
	mutex      sync.Mutex
	closed     bool
	lastPing   time.Time
	keepAlive  context.CancelFunc
	processing bool
}

func (ws *WSConnection) SendMessage(msgType MessageType, message string, data interface{}, progress int) error {
	ws.mutex.Lock()
	defer ws.mutex.Unlock()

	if ws.closed {
		return fmt.Errorf("connection closed")
	}

	msg := WSMessage{
		Type:      msgType,
		Message:   message,
		Data:      data,
		Progress:  progress,
		Timestamp: time.Now(),
	}

	// Set write deadline with more generous timeout
	ws.conn.SetWriteDeadline(time.Now().Add(60 * time.Second))

	// Retry logic for critical messages
	maxRetries := 3
	if msgType == MSG_FINAL_RESPONSE {
		maxRetries = 5
	}

	var lastErr error
	for attempt := 1; attempt <= maxRetries; attempt++ {
		err := ws.conn.WriteJSON(msg)
		if err == nil {
			log.Printf("Sent WebSocket message: %s (progress: %d%%) - attempt %d", msgType, progress, attempt)
			return nil
		}

		lastErr = err
		log.Printf("WebSocket write error (attempt %d/%d): %v", attempt, maxRetries, err)

		if attempt < maxRetries {
			// Brief delay before retry
			ws.mutex.Unlock()
			time.Sleep(time.Duration(attempt) * 100 * time.Millisecond)
			ws.mutex.Lock()

			// Check if connection is still valid
			if ws.closed {
				return fmt.Errorf("connection closed during retry")
			}
		}
	}

	// All retries failed
	ws.closed = true
	return fmt.Errorf("failed after %d attempts: %v", maxRetries, lastErr)
}
func (ws *WSConnection) Close() {
	ws.mutex.Lock()
	defer ws.mutex.Unlock()

	if !ws.closed {
		ws.closed = true

		// Cancel keep-alive if it exists
		if ws.keepAlive != nil {
			ws.keepAlive()
		}

		// Send close message with normal closure code
		ws.conn.WriteMessage(websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
		ws.conn.Close()
		log.Printf("WebSocket connection closed gracefully")
	}
}

func (ws *WSConnection) StartKeepAlive(ctx context.Context) {
	keepAliveCtx, cancel := context.WithCancel(ctx)
	ws.keepAlive = cancel

	go func() {
		ticker := time.NewTicker(25 * time.Second)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				ws.mutex.Lock()

				// Don't send ping if connection is closed or actively processing
				if ws.closed || ws.processing {
					ws.mutex.Unlock()
					continue
				}

				ws.conn.SetWriteDeadline(time.Now().Add(15 * time.Second))
				err := ws.conn.WriteMessage(websocket.PingMessage, []byte("keepalive"))

				if err != nil {
					log.Printf("Keep-alive ping failed: %v", err)
					ws.closed = true
					ws.mutex.Unlock()
					return
				}

				ws.lastPing = time.Now()
				ws.mutex.Unlock()

			case <-keepAliveCtx.Done():
				return
			}
		}
	}()
}

// Main WebSocket handler
func SearchWebSocketHandler(w http.ResponseWriter, r *http.Request) {
	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	wsConn := &WSConnection{
		conn:       conn,
		closed:     false,
		lastPing:   time.Now(),
		processing: false,
	}
	defer wsConn.Close()

	// Set more generous timeouts for AI processing
	conn.SetReadDeadline(time.Now().Add(10 * time.Minute))
	conn.SetWriteDeadline(time.Now().Add(60 * time.Second))

	// Set up ping/pong handlers
	conn.SetPingHandler(func(appData string) error {
		log.Printf("Received ping: %s", string(appData))
		conn.SetReadDeadline(time.Now().Add(10 * time.Minute))
		return conn.WriteControl(websocket.PongMessage, []byte(appData), time.Now().Add(30*time.Second))
	})

	conn.SetPongHandler(func(appData string) error {
		log.Printf("Received pong: %s", string(appData))
		conn.SetReadDeadline(time.Now().Add(10 * time.Minute))
		return nil
	})

	// Start keep-alive mechanism
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	wsConn.StartKeepAlive(ctx)

	log.Printf("WebSocket connection established from %s", r.RemoteAddr)

	// Handle WebSocket messages
	for {
		var request struct {
			Query string `json:"query"`
			Type  string `json:"type,omitempty"` // Allow different message types
		}

		// Reset read deadline for each message
		conn.SetReadDeadline(time.Now().Add(10 * time.Minute))

		err := conn.ReadJSON(&request)
		if err != nil {
			if websocket.IsCloseError(err,
				websocket.CloseNormalClosure,
				websocket.CloseGoingAway,
				websocket.CloseNoStatusReceived,
				websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket closed normally: %v", err)
			} else {
				log.Printf("WebSocket read error: %v", err)
			}
			break
		}

		// Handle ping/keepalive messages from client
		if request.Type == "ping" || request.Query == "ping" {
			wsConn.SendMessage(MSG_KEEP_ALIVE, "pong", nil, 0)
			continue
		}

		if request.Query == "" {
			if err := wsConn.SendMessage(MSG_ERROR, "Query cannot be empty", nil, 0); err != nil {
				log.Printf("Failed to send error message: %v", err)
				break
			}
			continue
		}

		log.Printf("Received search query: %s", request.Query)

		// Set processing flag
		wsConn.mutex.Lock()
		wsConn.processing = true
		wsConn.mutex.Unlock()

		// Process search request
		processSearchRequest(wsConn, request.Query)

		// Clear processing flag
		wsConn.mutex.Lock()
		wsConn.processing = false
		wsConn.mutex.Unlock()

		// Do not send search_complete here, it's included in the final response
		log.Printf("Ready for next query...")
	}
}

func processSearchRequest(wsConn *WSConnection, query string) {
	start := time.Now()

	// Create context for entire process
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	// Step 1: Analyzing query (0-100%)
	if err := wsConn.SendMessage(MSG_ANALYZING_QUERY, "Analyzing your query...", QueryAnalysisData{
		OriginalQuery: query,
		Status:        "processing",
	}, 0); err != nil {
		log.Printf("Failed to send analyzing message: %v", err)
		return
	}

	// Simulate progress for query analysis
	for i := 10; i <= 100; i += 10 {
		time.Sleep(50 * time.Millisecond) // Small delay to show progress
		if err := wsConn.SendMessage(MSG_ANALYZING_QUERY, "Analyzing your query...", QueryAnalysisData{
			OriginalQuery: query,
			Status:        "processing",
		}, i); err != nil {
			log.Printf("Failed to send analyzing progress: %v", err)
			return
		}
	}

	// Enhance query with timeout
	enhancedQuery, err := PromptEnhancerWithTimeout(ctx, query)
	if err != nil {
		wsConn.SendMessage(MSG_ERROR, fmt.Sprintf("Error enhancing query: %v", err), nil, 0)
		return
	}

	// Step 2: Query enhanced (0-100%)
	if err := wsConn.SendMessage(MSG_QUERY_ENHANCED, "Enhancing query for better search results...", QueryEnhancedData{
		OriginalQuery: query,
		EnhancedQuery: enhancedQuery.EnhanedQuery,
	}, 0); err != nil {
		log.Printf("Failed to send query enhanced message: %v", err)
		return
	}

	// Progress for query enhancement
	for i := 20; i <= 100; i += 20 {
		time.Sleep(30 * time.Millisecond)
		if err := wsConn.SendMessage(MSG_QUERY_ENHANCED, "Enhancing query for better search results...", QueryEnhancedData{
			OriginalQuery: query,
			EnhancedQuery: enhancedQuery.EnhanedQuery,
		}, i); err != nil {
			log.Printf("Failed to send query enhanced progress: %v", err)
			return
		}
	}

	// Generate query embedding with timeout
	queryEmbedding, err := embedWithTimeout(ctx, enhancedQuery.EnhanedQuery)
	if err != nil {
		wsConn.SendMessage(MSG_ERROR, fmt.Sprintf("Error generating embedding: %v", err), nil, 0)
		return
	}

	// Step 3: Searching database (0-100%)
	if err := wsConn.SendMessage(MSG_SEARCHING_DB, "Searching database for relevant content...", nil, 0); err != nil {
		log.Printf("Failed to send searching DB message: %v", err)
		return
	}

	// Progress for database search
	searchStart := time.Now()

	// Start search in goroutine and track progress
	searchDone := make(chan struct {
		points *[]models.PagePoint
		err    error
	}, 1)

	go func() {
		points, err := db.SearchPoints(ctx, *queryEmbedding)
		searchDone <- struct {
			points *[]models.PagePoint
			err    error
		}{points, err}
	}()

	// Show search progress
	searchProgress := 0
	searchTicker := time.NewTicker(100 * time.Millisecond)
	defer searchTicker.Stop()

	var points *[]models.PagePoint
	var searchErr error

	for {
		select {
		case result := <-searchDone:
			points = result.points
			searchErr = result.err
			// Complete the search progress
			if err := wsConn.SendMessage(MSG_SEARCHING_DB, "Searching database for relevant content...", nil, 100); err != nil {
				log.Printf("Failed to send searching DB completion: %v", err)
				return
			}
			goto searchComplete
		case <-searchTicker.C:
			searchProgress += 5
			if searchProgress > 95 {
				searchProgress = 95 // Don't reach 100% until actually done
			}
			if err := wsConn.SendMessage(MSG_SEARCHING_DB, "Searching database for relevant content...", nil, searchProgress); err != nil {
				log.Printf("Failed to send searching DB progress: %v", err)
				return
			}
		}
	}

searchComplete:
	if searchErr != nil {
		wsConn.SendMessage(MSG_ERROR, fmt.Sprintf("Database search error: %v", searchErr), nil, 0)
		return
	}

	// Step 4: Database results found (0-100%)
	for i := 0; i <= 100; i += 25 {
		time.Sleep(20 * time.Millisecond)
		if err := wsConn.SendMessage(MSG_DB_RESULTS_FOUND, "Found relevant content in database", SearchResultsData{
			PointsFound: len(*points),
			TimeTaken:   time.Since(searchStart).String(),
		}, i); err != nil {
			log.Printf("Failed to send DB results message: %v", err)
			return
		}
	}

	// Step 5: Processing chunks (0-100%)
	if err := wsConn.SendMessage(MSG_PROCESSING_CHUNKS, "Processing and analyzing content chunks...", nil, 0); err != nil {
		log.Printf("Failed to send processing chunks message: %v", err)
		return
	}

	chunks := processChunksWithProgress(wsConn, ctx, *points, queryEmbedding.Embedding)

	// Ensure processing reaches 100%
	if err := wsConn.SendMessage(MSG_PROCESSING_CHUNKS, "Content chunks processed successfully", ChunkProcessingData{
		TotalChunks:     len(*points),
		ProcessedChunks: len(chunks),
		FilteredChunks:  len(chunks),
	}, 100); err != nil {
		log.Printf("Failed to send processing chunks completion: %v", err)
		return
	}

	// Sort by relevance
	sort.Slice(chunks, func(i, j int) bool {
		return chunks[i].Score > chunks[j].Score
	})

	// Pick top chunks
	const topK = 5
	if len(chunks) > topK {
		chunks = chunks[:topK]
	}

	// Step 6: Analyzing results (0-100%)
	if err := wsConn.SendMessage(MSG_ANALYZING_RESULTS, "Generating comprehensive response...", AnalysisData{
		TopChunks: len(chunks),
		Status:    "generating_response",
	}, 0); err != nil {
		log.Printf("Failed to send analyzing results message: %v", err)
		return
	}

	// Progress for analysis
	for i := 10; i <= 90; i += 10 {
		time.Sleep(100 * time.Millisecond)
		if err := wsConn.SendMessage(MSG_ANALYZING_RESULTS, "Generating comprehensive response...", AnalysisData{
			TopChunks: len(chunks),
			Status:    "generating_response",
		}, i); err != nil {
			log.Printf("Failed to send analyzing results progress: %v", err)
			return
		}
	}

	// Build response
	var chunkTexts []string
	for _, c := range chunks {
		chunkTexts = append(chunkTexts, fmt.Sprintf("From %s, Favicon %s, :\n%s", c.URL, c.Favicon, c.Text))
	}
	dataSummary := strings.Join(chunkTexts, "\n\n")

	// Generate final response with timeout
	response := callLLMAPIWithTimeout(ctx, enhancedQuery.EnhanedQuery, dataSummary)

	// Complete analysis progress
	if err := wsConn.SendMessage(MSG_ANALYZING_RESULTS, "Response generated successfully", AnalysisData{
		TopChunks: len(chunks),
		Status:    "complete",
	}, 100); err != nil {
		log.Printf("Failed to send analyzing results completion: %v", err)
		return
	}

	// Step 7: Final response
	finalData := struct {
		Response       interface{} `json:"response"`
		TotalTime      string      `json:"total_time"`
		ChunksUsed     int         `json:"chunks_used"`
		SourcesCount   int         `json:"sources_count"`
		SearchComplete bool        `json:"search_complete"`
	}{
		Response:       response,
		TotalTime:      time.Since(start).String(),
		ChunksUsed:     len(chunks),
		SourcesCount:   len(getUniqueURLs(chunks)),
		SearchComplete: true,
	}

	// Send final response with retry logic
	maxRetries := 5
	for attempt := 1; attempt <= maxRetries; attempt++ {
		wsConn.mutex.Lock()
		if wsConn.closed {
			wsConn.mutex.Unlock()
			log.Printf("Connection closed before sending final response")
			return
		}
		wsConn.mutex.Unlock()

		if err := wsConn.SendMessage(MSG_FINAL_RESPONSE, "Search completed successfully", finalData, 100); err != nil {
			log.Printf("Attempt %d: Failed to send final response: %v", attempt, err)
			if attempt == maxRetries {
				wsConn.SendMessage(MSG_ERROR, "Failed to deliver final response after multiple attempts", nil, 0)
				return
			}
			time.Sleep(time.Duration(attempt*attempt) * 200 * time.Millisecond)
			continue
		}

		log.Printf("Final response sent successfully for query: %s (attempt %d)", query, attempt)
		break
	}

	time.Sleep(1 * time.Second)
	log.Printf("Search request completed for query: %s in %v", query, time.Since(start))
}

func processChunksWithProgress(wsConn *WSConnection, ctx context.Context, points []models.PagePoint, queryEmbedding []float32) []ScoredChunk {
	// Pre filter content
	var filteredChunks []ChunkJob
	totalInitialChunks := 0

	for _, point := range points {
		if len(point.Content) < 200 {
			continue
		}

		chunked := chunkTextAggressive(point.Content, 1500, 100)
		totalInitialChunks += len(chunked)

		for i, chunk := range chunked {
			if isHighQualityChunk(chunk) {
				filteredChunks = append(filteredChunks, ChunkJob{
					chunk:   chunk,
					url:     point.URL,
					index:   i,
					favicon: point.Favicon,
				})
			}
		}
	}

	// Initial progress update
	if err := wsConn.SendMessage(MSG_PROCESSING_CHUNKS, "Filtered chunks for processing", ChunkProcessingData{
		TotalChunks:     totalInitialChunks,
		ProcessedChunks: 0,
		FilteredChunks:  len(filteredChunks),
	}, 10); err != nil {
		log.Printf("Failed to send chunk processing progress: %v", err)
	}

	maxChunks := 50
	if len(filteredChunks) > maxChunks {
		filteredChunks = filteredChunks[:maxChunks]
	}

	numWorkers := runtime.NumCPU() * 2
	if numWorkers > 16 {
		numWorkers = 16
	}

	jobs := make(chan ChunkJob, len(filteredChunks))
	results := make(chan ChunkResult, len(filteredChunks))

	chunkCtx, chunkCancel := context.WithTimeout(ctx, 120*time.Second)
	defer chunkCancel()

	var wg sync.WaitGroup
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go fastChunkWorker(chunkCtx, jobs, results, queryEmbedding, &wg)
	}

	// Send jobs
	go func() {
		defer close(jobs)
		for _, job := range filteredChunks {
			select {
			case jobs <- job:
			case <-chunkCtx.Done():
				return
			}
		}
	}()

	// Close results when done
	go func() {
		wg.Wait()
		close(results)
	}()

	// Collect results with progress tracking
	var chunks []ScoredChunk
	processed := 0
	timeout := time.After(140 * time.Second)

	for {
		select {
		case result, ok := <-results:
			if !ok {
				// All processing complete - ensure 100% progress
				if err := wsConn.SendMessage(MSG_PROCESSING_CHUNKS, "All chunks processed", ChunkProcessingData{
					TotalChunks:     totalInitialChunks,
					ProcessedChunks: processed,
					FilteredChunks:  len(filteredChunks),
				}, 95); err != nil {
					log.Printf("Failed to send final chunk progress: %v", err)
				}
				return chunks
			}

			processed++
			if result.err == nil {
				chunks = append(chunks, result.chunk)
			}

			// Send progress updates
			if processed%5 == 0 || processed == len(filteredChunks) {
				progress := int(float64(processed)/float64(len(filteredChunks))*85) + 10 // 10-95%
				if err := wsConn.SendMessage(MSG_PROCESSING_CHUNKS, "Processing content chunks...", ChunkProcessingData{
					TotalChunks:     totalInitialChunks,
					ProcessedChunks: processed,
					FilteredChunks:  len(filteredChunks),
				}, progress); err != nil {
					log.Printf("Failed to send chunk progress: %v", err)
				}
			}

		case <-timeout:
			log.Printf("Chunk processing timeout reached")
			return chunks
		case <-chunkCtx.Done():
			log.Printf("Context cancelled during chunk processing")
			return chunks
		}
	}
}

func fastChunkWorker(ctx context.Context, jobs <-chan ChunkJob, results chan<- ChunkResult, queryEmbedding []float32, wg *sync.WaitGroup) {
	defer wg.Done()

	for {
		select {
		case job, ok := <-jobs:
			if !ok {
				return
			}

			embedding := getCachedEmbedding(job.chunk)
			if embedding == nil {
				embeddingResp, err := embedWithTimeout(ctx, job.chunk)
				if err != nil {
					results <- ChunkResult{err: err, index: job.index}
					continue
				}
				embedding = embeddingResp.Embedding
				setCachedEmbedding(job.chunk, embedding)
			}

			score := utils.CosineSimilarity(embedding, queryEmbedding)
			results <- ChunkResult{
				chunk: ScoredChunk{
					Text:    job.chunk,
					URL:     job.url,
					Score:   score,
					Favicon: job.favicon,
				},
				index: job.index,
			}

		case <-ctx.Done():
			return
		}
	}
}

func callLLMAPIWithTimeout(ctx context.Context, enhancedQuery, dataSummary string) interface{} {
	chat := models.ChatModel{
		Model: constants.MODEL_NAME,
		Messages: []models.MessageModel{
			{
				ROLE:    "system",
				CONTENT: constants.BuildSearchResponseSystemPrompt(),
			},
			{
				ROLE:    "user",
				CONTENT: "Here is the data retrieved from the web:\n\n" + dataSummary,
			},
			{
				ROLE:    "user",
				CONTENT: enhancedQuery,
			},
		},
		Temperature:           0,
		TopP:                  1,
		RESPONSE_FORMAT:       models.ResponseFormat{TYPE: "json_object"},
		SEED:                  42,
		MAX_COMPLETION_TOKENS: 5000,
	}

	bodyData, _ := json.Marshal(chat)

	request, err := http.NewRequestWithContext(ctx, "POST", constants.LLAMA_API_URL, bytes.NewBuffer(bodyData))
	if err != nil {
		return fmt.Sprintf("Error: %v", err)
	}

	API_KEY := os.Getenv("LLM_API_KEY")
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Bearer "+API_KEY)

	resp, err := httpClient.Do(request)
	if err != nil {
		return fmt.Sprintf("Error: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Sprintf("HTTP %d", resp.StatusCode)
	}

	var result models.CompletionResponse
	json.NewDecoder(resp.Body).Decode(&result)

	return result
}

// Helper functions with timeout support
func PromptEnhancerWithTimeout(ctx context.Context, query string) (*models.PrompEnhancerResponse, error) {
	done := make(chan struct {
		resp *models.PrompEnhancerResponse
		err  error
	}, 1)

	go func() {
		resp, err := PromptEnhancer(query)
		done <- struct {
			resp *models.PrompEnhancerResponse
			err  error
		}{resp, err}
	}()

	select {
	case result := <-done:
		return result.resp, result.err
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

func embedWithTimeout(ctx context.Context, text string) (*models.EmbeddingModel, error) {
	done := make(chan struct {
		resp *models.EmbeddingModel
		err  error
	}, 1)

	go func() {
		resp, err := functions.Embed(text)
		done <- struct {
			resp *models.EmbeddingModel
			err  error
		}{resp, err}
	}()

	select {
	case result := <-done:
		return result.resp, result.err
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

func getCachedEmbedding(text string) []float32 {
	embeddingCache.RLock()
	defer embeddingCache.RUnlock()
	return embeddingCache.data[text]
}

func setCachedEmbedding(text string, embedding []float32) {
	embeddingCache.Lock()
	defer embeddingCache.Unlock()
	embeddingCache.data[text] = embedding
}

func chunkTextAggressive(text string, maxLen int, overlap int) []string {
	if len(text) <= maxLen {
		return []string{text}
	}

	var chunks []string
	for start := 0; start < len(text); start += maxLen - overlap {
		end := start + maxLen
		if end > len(text) {
			end = len(text)
		}
		chunks = append(chunks, text[start:end])
		if end == len(text) {
			break
		}
	}
	return chunks
}

func isHighQualityChunk(chunk string) bool {
	trimmed := strings.TrimSpace(chunk)

	if len(trimmed) < 100 {
		return false
	}

	letters := 0
	for _, r := range trimmed {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') {
			letters++
		}
	}

	return float64(letters)/float64(len(trimmed)) > 0.4
}

func getUniqueURLs(chunks []ScoredChunk) []string {
	urlMap := make(map[string]bool)
	for _, chunk := range chunks {
		urlMap[chunk.URL] = true
	}

	var urls []string
	for url := range urlMap {
		urls = append(urls, url)
	}
	return urls
}
