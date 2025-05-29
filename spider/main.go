package main

import (
	"log"

	"github.com/froxy/db"
	"github.com/froxy/functions"
	"github.com/froxy/models"
	"github.com/joho/godotenv"
)

func main() {

	err := godotenv.Load()
	if err != nil {
		log.Fatal(err)
	}

	db.InitDB()

	crawler := functions.Crawler{
		LinksQueue:  &[]models.Link{},
		VisitedUrls: map[string]struct{}{},
		QueuedUrls:  map[string]bool{},
	}

	crawler.Start("https://en.wikipedia.org/wiki/Atlas")

}
