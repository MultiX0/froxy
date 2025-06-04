package utils

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/froxy/models"
)

func Enqueue(queue []models.Link, element models.Link) []models.Link {
	return append(queue, element)
}

func Dequeue(queue []models.Link) (models.Link, []models.Link, error) {
	if len(queue) == 0 {
		return models.Link{}, queue, errors.New("queue is empty")
	}
	element := queue[0]
	return element, queue[1:], nil
}

func CanonicalizeURL(raw string) (string, error) {
	parsed, err := url.Parse(raw)
	if err != nil {
		return "", err
	}
	parsed.Fragment = ""
	parsed.RawQuery = ""
	return parsed.String(), nil
}

func GenerateUUIDFromURL(url string) string {
	hash := sha256.Sum256([]byte(url))
	// Format as UUID v4 (8-4-4-4-12 format)
	return fmt.Sprintf("%x-%x-%x-%x-%x",
		hash[0:4],
		hash[4:6],
		hash[6:8],
		hash[8:10],
		hash[10:16])
}

func Embed(text string) (*models.EmbeddingModel, error) {

	// Create HTTP client
	httpClient := &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 10,
			IdleConnTimeout:     10 * time.Second,
			DisableKeepAlives:   false,
		},
	}

	embeddingServerUrl := os.Getenv("EMBEDDING_HOST")
	requestBody := map[string]string{"text": text}
	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request body: %v", err)
	}

	request, err := http.NewRequestWithContext(context.TODO(), "POST", embeddingServerUrl, bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Println(err)
		return nil, err
	}

	request.Header.Set("Accept", "application/json")
	resp, err := httpClient.Do(request)
	if err != nil {
		fmt.Println(err)
		return nil, err
	}

	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		fmt.Printf("Skipped, status: %d", resp.StatusCode)
		return nil, fmt.Errorf("non-200 status code: %d", resp.StatusCode)
	}

	var embedding models.EmbeddingModel
	err = json.NewDecoder(resp.Body).Decode(&embedding)
	if resp.StatusCode != http.StatusOK {
		fmt.Printf("Decoding Issue, %s", err)
		return nil, err
	}

	return &embedding, nil

}
