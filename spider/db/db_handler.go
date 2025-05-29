package db

import (
	"fmt"
	"sync"

	"github.com/froxy/models"
)

var (
	handlerInstance *SupabaseHandler
	handlerOnce     sync.Once
)

var wg = &sync.WaitGroup{}

type SupabaseHandler struct {
	mu         sync.RWMutex
	maxWorkers int
}

func (h *SupabaseHandler) InsertLinksSimple(links []models.Link) error {
	if len(links) == 0 {
		return nil
	}

	// Semaphore to limit concurrent goroutines
	sem := make(chan struct{}, h.maxWorkers)
	var wg sync.WaitGroup
	errChan := make(chan error, len(links))

	for _, link := range links {
		wg.Add(1)
		go func(link models.Link) {
			defer wg.Done()

			// Acquire semaphore
			sem <- struct{}{}
			defer func() { <-sem }()

			if err := h.InsertSingleLink(link); err != nil {
				errChan <- fmt.Errorf("failed to insert link %s: %w", link.URL[0], err)
			}
		}(link)
	}

	wg.Wait()
	close(errChan)

	// Collect errors
	var errors []error
	for err := range errChan {
		errors = append(errors, err)
	}

	if len(errors) > 0 {
		return fmt.Errorf("insertion errors: %v", errors)
	}

	return nil
}

func (h *SupabaseHandler) InsertSingleLink(link models.Link) error {
	// Replace with your actual Supabase client call
	supabaseClient.From("links").Insert(link, true, "", "", "exact").Execute()

	fmt.Printf("Link: %s inserted.\n", link.URL)
	return nil
}

func NewSupabaseHandler(maxWorkers int) *SupabaseHandler {
	if maxWorkers <= 0 {
		maxWorkers = 10 // default
	}
	return &SupabaseHandler{
		maxWorkers: maxWorkers,
	}
}

func GetSupabaseHandler() *SupabaseHandler {
	handlerOnce.Do(func() {
		handlerInstance = NewSupabaseHandler(10) // 10 concurrent workers
	})
	return handlerInstance
}
