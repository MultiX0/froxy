package models

// I used groq.com api for (ai model)

type PrompEnhancerResponse struct {
	EnhanedQuery string `json:"enhanced"`
}

type MessageModel struct {
	ROLE    string `json:"role"`
	CONTENT string `json:"content"`
}

type ResponseFormat struct {
	TYPE string `json:"type"`
}

type ChatModel struct {
	Messages              []MessageModel `json:"messages"`
	Model                 string         `json:"model"`
	Temperature           float32        `json:"temperature"`
	MAX_COMPLETION_TOKENS int32          `json:"max_completion_tokens"`
	TopP                  int32          `json:"top_p"`
	STREAM                bool           `json:"stream"`
	RESPONSE_FORMAT       ResponseFormat `json:"response_format"`
	STOP                  *bool          `json:"stop"`
	SEED                  float32        `json:"seed"`
}

type Choice struct {
	FinishReason string       `json:"finish_reason"`
	Index        int          `json:"index"`
	Logprobs     any          `json:"logprobs"` // or *Logprobs if you define it
	Message      MessageModel `json:"message"`
}

type Usage struct {
	CompletionTime   float64 `json:"completion_time"`
	CompletionTokens int     `json:"completion_tokens"`
	PromptTime       float64 `json:"prompt_time"`
	PromptTokens     int     `json:"prompt_tokens"`
	QueueTime        float64 `json:"queue_time"`
	TotalTime        float64 `json:"total_time"`
	TotalTokens      int     `json:"total_tokens"`
}

type UsageBreakdown struct {
	Models any `json:"models"`
}

type XGroq struct {
	ID string `json:"id"`
}

type CompletionResponse struct {
	Choices           []Choice       `json:"choices"`
	Created           int64          `json:"created"`
	ID                string         `json:"id"`
	Model             string         `json:"model"`
	Object            string         `json:"object"`
	SystemFingerprint string         `json:"system_fingerprint"`
	Usage             Usage          `json:"usage"`
	UsageBreakdown    UsageBreakdown `json:"usage_breakdown"`
	XGroq             XGroq          `json:"x_groq"`
}

type PagePoint struct {
	IN_LINKS    int32  `json:"in_links"`
	Title       string `json:"title"`
	OUT_LINKS   int32  `json:"out_links"`
	Favicon     string `json:"favicon"`
	URL         string `json:"url"`
	Status      int32  `json:"status"`
	Content     string `json:"content"`
	Description string `json:"description"`
}

type EmbeddingModel struct {
	Embedding  []float32 `json:"embedding"`
	Dims       int32     `json:"dims"`
	ELAPSED_MS float32   `json:"elapsed_ms"`
}
