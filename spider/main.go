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

	crawler.Start(
		"https://en.wikipedia.org",
		"https://news.ycombinator.com",
		"https://www.gnu.org",
		"https://www.w3.org",
		"https://developer.mozilla.org",
		"https://xkcd.com",
		"https://www.nytimes.com",
		"https://www.bbc.com/news",
		"https://www.imdb.com",
		"https://archive.org",
	)

}
