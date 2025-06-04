package main

import (
	"fmt"
	"log"
	"time"

	"github.com/froxy/db"
	"github.com/froxy/functions"
	"github.com/joho/godotenv"
)

func main() {

	fmt.Println("starting spider bot")
	err := godotenv.Load()
	if err != nil {
		log.Fatal(err)
	}

	err = db.InitQdrant()
	if err != nil {
		log.Panic(err)
	}

	err = db.InitPostgres(db.Client)
	if err != nil {
		log.Println(err)
	}

	defer db.GetPostgresHandler().GracefulShutdown(time.Second * 5)

	crawler := functions.NewCrawler()

	var crawlableSites = []string{
		"https://myanimelist.net/manga/121496/Solo_Leveling",
		"https://en.wikipedia.org/wiki/Main_Page",
		"https://animelek.vip/",
		"https://lekmanga.net/",
		"https://azoramoon.com/",
		"https://kitchen.sayidaty.net/%D9%88%D8%B5%D9%81%D8%A7%D8%AA-%D8%B7%D8%A8%D8%AE",
		"https://cookpad.com/jo/search/%D9%88%D8%B5%D9%81%D8%A7%D8%AA%20%D8%B7%D8%A8%D8%AE",
	}

	crawler.Start(
		5,
		crawlableSites...,
	)

}
