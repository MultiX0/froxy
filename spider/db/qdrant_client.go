package db

import (
	"context"
	"fmt"
	"os"

	"github.com/qdrant/go-client/qdrant"
	"google.golang.org/grpc"
)

var (
	Client *qdrant.Client
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
	exists, err := CheckCollectionExists(context.Background(), "page_content_embeddings")
	if err != nil {
		return fmt.Errorf("failed to check if page_content_embeddings collection exists: %w", err)
	}
	if exists {
		return nil // Collection already exists
	}

	err = Client.CreateCollection(context.Background(), &qdrant.CreateCollection{
		CollectionName: "page_content_embeddings",
		VectorsConfig: qdrant.NewVectorsConfig(&qdrant.VectorParams{
			Size:     768,
			Distance: qdrant.Distance_Cosine,
		}),
	})
	if err != nil {
		return fmt.Errorf("failed to create dashs_embedding collection: %w", err)
	}

	return nil
}
