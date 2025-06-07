package db

import (
	"context"
	"fmt"
	"os"

	"github.com/MultiX0/froxy/models"
	"github.com/qdrant/go-client/qdrant"
	"google.golang.org/grpc"
)

var (
	Client                 *qdrant.Client
	QDRANT_COLLECTION_NAME = "page_content_embeddings"
)

func InitQdrant() error {
	host := os.Getenv("QDRANT_HOST") // example: "yourdomain.com"
	port := 6334                     // default qdrant port
	apiKey := os.Getenv("QDRANT_API_KEY")
	useTLS := false // no https , switch it to true if you want to use https,

	var err error
	Client, err = qdrant.NewClient(&qdrant.Config{
		Host:                   host,
		Port:                   port,
		APIKey:                 apiKey,
		UseTLS:                 useTLS,
		SkipCompatibilityCheck: true,
		GrpcOptions:            []grpc.DialOption{},
	})

	if err != nil {
		return err
	}
	err = CreatePageEmbeddingsCollection()
	return err
}

// CheckCollectionExists checks if a collection exists
func CheckCollectionExists(ctx context.Context, collectionName string) (bool, error) {
	info, err := Client.GetCollectionInfo(ctx, collectionName)
	if err != nil || info == nil {

		return false, nil
	}
	return true, nil
}

// create the page embeddings collection
func CreatePageEmbeddingsCollection() error {
	exists, err := CheckCollectionExists(context.Background(), QDRANT_COLLECTION_NAME)
	if err != nil {
		return fmt.Errorf("failed to check if page_content_embeddings collection exists: %w", err)
	}
	if exists {
		return nil // Collection already exists
	}

	err = Client.CreateCollection(context.Background(), &qdrant.CreateCollection{
		CollectionName: QDRANT_COLLECTION_NAME,
		VectorsConfig: qdrant.NewVectorsConfig(&qdrant.VectorParams{
			Size:     384,
			Distance: qdrant.Distance_Cosine,
		}),
	})
	if err != nil {
		return fmt.Errorf("failed to create dashs_embedding collection: %w", err)
	}

	return nil
}

func SearchPoints(ctx context.Context, vector models.EmbeddingModel) (*[]models.PagePoint, error) {

	points, err := Client.GetPointsClient().Search(ctx, &qdrant.SearchPoints{
		CollectionName: QDRANT_COLLECTION_NAME,
		Vector:         vector.Embedding,
		WithPayload:    qdrant.NewWithPayload(true),
		Limit:          15,
	})

	if err != nil {
		fmt.Println("Error with getting the points")
		return nil, err
	}

	var pages []models.PagePoint
	for _, v := range points.Result {
		payload := v.Payload
		pages = append(pages, models.PagePoint{
			IN_LINKS:    int32(payload["in_links"].GetIntegerValue()),
			Title:       payload["title"].GetStringValue(),
			OUT_LINKS:   int32(payload["out_links"].GetIntegerValue()),
			Favicon:     payload["favicon"].GetStringValue(),
			URL:         payload["url"].GetStringValue(),
			Status:      int32(payload["status"].GetIntegerValue()),
			Content:     payload["content"].GetStringValue(),
			Description: payload["description"].GetStringValue(),
		})
	}

	return &pages, nil

}
