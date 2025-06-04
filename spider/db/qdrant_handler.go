package db

import (
	"context"
	"fmt"

	"github.com/froxy/models"
	"github.com/froxy/utils"
	"github.com/qdrant/go-client/qdrant"
)

func UpsertPageToQdrant(client *qdrant.Client, pageData models.PageData) error {
	ctx := context.Background()

	embedding, err := utils.Embed(pageData.MainContent)
	if err != nil {
		fmt.Println(err)
		return err
	}
	// Generate deterministic ID from URL
	pointID := utils.GenerateUUIDFromURL(pageData.URL)
	fmt.Println(pointID)

	// Create the point
	point := &qdrant.PointStruct{
		Id: &qdrant.PointId{
			PointIdOptions: &qdrant.PointId_Uuid{
				Uuid: pointID, // Use our deterministic ID
			},
		},
		Vectors: &qdrant.Vectors{
			VectorsOptions: &qdrant.Vectors_Vector{
				Vector: &qdrant.Vector{
					Data: embedding.Embedding,
				},
			},
		},
		Payload: map[string]*qdrant.Value{
			"url": {
				Kind: &qdrant.Value_StringValue{
					StringValue: pageData.URL,
				},
			},
			"title": {
				Kind: &qdrant.Value_StringValue{
					StringValue: pageData.Title,
				},
			},
			"content": {
				Kind: &qdrant.Value_StringValue{
					StringValue: pageData.MainContent,
				},
			},
			"description": {
				Kind: &qdrant.Value_StringValue{
					StringValue: pageData.MetaDescription,
				},
			},
			"status": {
				Kind: &qdrant.Value_IntegerValue{
					IntegerValue: int64(pageData.StatusCode),
				},
			},
			"out_links": {
				Kind: &qdrant.Value_IntegerValue{
					IntegerValue: int64(len(pageData.OutboundLinks)),
				},
			},
			"in_links": {
				Kind: &qdrant.Value_IntegerValue{
					IntegerValue: 0,
				},
			},
		},
	}

	// Upsert the point (will insert if new, update if exists)
	_, err = client.Upsert(ctx, &qdrant.UpsertPoints{
		CollectionName: "page_content_embeddings",
		Points:         []*qdrant.PointStruct{point},
	})

	return err
}
