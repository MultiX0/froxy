package llama

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/MultiX0/froxy/constants"
	"github.com/MultiX0/froxy/models"
)

func PromptEnhancer(quey string) (*models.PrompEnhancerResponse, error) {

	httpClient := &http.Client{
		Timeout: time.Minute,
		Transport: &http.Transport{
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 10,
			IdleConnTimeout:     time.Minute,
		},
	}

	chat := constants.GetPromptEnhancerChat(quey)
	bodyData, err := json.Marshal(chat)
	if err != nil {
		fmt.Println(err)
		return nil, err
	}
	request, err := http.NewRequest("POST", constants.LLAMA_API_URL, bytes.NewBuffer(bodyData))
	if err != nil {
		fmt.Println(err)
		return nil, err
	}

	API_KEY := os.Getenv("LLM_API_KEY")
	if len(API_KEY) == 0 {
		return nil, fmt.Errorf("api key is not valid")
	}

	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Bearer "+API_KEY)

	resp, err := httpClient.Do(request)
	if err != nil {
		fmt.Println(err)
		return nil, err
	}

	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("prompt enhancer request faild with status code: %d", resp.StatusCode)
	}

	var result models.CompletionResponse
	var ehnanced models.PrompEnhancerResponse

	err = json.NewDecoder(resp.Body).Decode(&result)

	if err != nil {
		fmt.Println(err)
		return nil, err
	}

	jsonString := result.Choices[0].Message.CONTENT

	err = json.Unmarshal([]byte(jsonString), &ehnanced)
	if err != nil {
		fmt.Println(err)
		return nil, err
	}

	return &ehnanced, nil

}
