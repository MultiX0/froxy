package main

import (
	"log"

	"github.com/MultiX0/froxy/api"
	"github.com/MultiX0/froxy/db"
	"github.com/joho/godotenv"
)

// I used groq.com api for (ai model)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal(err)
		return
	}

	err = db.InitQdrant()
	if err != nil {
		log.Fatal(err)
		return
	}

	server := api.NewAPIServer(":4040")
	server.Run()
}
