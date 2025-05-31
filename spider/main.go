package main

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/froxy/db"
	"github.com/froxy/functions"
	"github.com/froxy/models"
	"github.com/joho/godotenv"
)

func main() {

	fmt.Println("starting spider bot")
	err := godotenv.Load()
	if err != nil {
		log.Fatal(err)
	}

	err = db.InitPostgres()
	if err != nil {
		log.Println(err)
	}

	defer db.GetPostgresHandler().GracefulShutdown(time.Second * 5)

	crawler := functions.Crawler{
		LinksQueue:  &[]models.Link{},
		VisitedUrls: map[string]struct{}{},
		QueuedUrls:  map[string]bool{},
		Mu:          &sync.Mutex{},
		Ctx:         context.Background(),
	}

	var crawlableSites = []string{
		"https://en.wikipedia.org/wiki/Main_Page",
	}

	crawler.Start(
		5,
		crawlableSites...,
	)

}
