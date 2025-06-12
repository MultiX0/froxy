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
		log.Panic(err)
		return
	}

	err = db.InitQdrant()
	if err != nil {
		log.Panic(err)
		return
	}

	err = db.InitPostgres(db.Client)
	if err != nil {
		log.Println(err)
		return
	}

	defer db.GetPostgresHandler().GracefulShutdown(time.Second * 5)

	crawler := functions.NewCrawler()

	var crawlableSites = []string{}

	crawler.Start(
		5,
		crawlableSites...,
	)

}
