package functions

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/MultiX0/froxy/models"
)

func Embed(text string) (*models.EmbeddingModel, error) {

	// Create HTTP client
	httpClient := &http.Client{
		Timeout: time.Minute,
		Transport: &http.Transport{
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 10,
			IdleConnTimeout:     time.Minute,
			DisableKeepAlives:   false,
		},
	}

	embeddingServerUrl := os.Getenv("EMBEDDING_HOST")
	if len(embeddingServerUrl) == 0 {
		embeddingServerUrl = "http://localhost:5050/embed"
	}
	requestBody := map[string]string{"text": text}
	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		fmt.Println("===================================================")
		fmt.Println(err)
		fmt.Println("===================================================")

		return nil, fmt.Errorf("failed to marshal request body: %v", err)
	}

	request, err := http.NewRequestWithContext(context.TODO(), "POST", embeddingServerUrl, bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Println("===================================================")
		fmt.Println(err)
		fmt.Println("===================================================")
		return nil, err
	}

	request.Header.Set("Accept", "application/json")
	resp, err := httpClient.Do(request)
	if err != nil {
		fmt.Println("===================================================")
		fmt.Println(err)
		fmt.Println("===================================================")
		return nil, err
	}

	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		fmt.Println("===================================================")
		fmt.Printf("Skipped, status: %d", resp.StatusCode)
		fmt.Println("===================================================")

		return nil, fmt.Errorf("non-200 status code: %d", resp.StatusCode)
	}

	var embedding models.EmbeddingModel
	err = json.NewDecoder(resp.Body).Decode(&embedding)
	if resp.StatusCode != http.StatusOK {
		fmt.Println("===================================================")
		fmt.Println(err)
		fmt.Println("===================================================")

		fmt.Printf("Decoding Issue, %s", err)
		return nil, err
	}

	return &embedding, nil

}
