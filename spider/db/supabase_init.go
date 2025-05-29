package db

import (
	"os"

	"github.com/supabase-community/supabase-go"
)

var supabaseClient *supabase.Client

func InitDB() {

	url, key := os.Getenv("SUPABASE_URL"), os.Getenv("SUPABASE_SERVICE_KEY")
	client, err := supabase.NewClient(url, key, &supabase.ClientOptions{})
	if err != nil {
		panic(err)
	}

	if client != nil {
		supabaseClient = client
		return
	}

	panic("client is null")

}

func GetClient() (*supabase.Client, error) {
	if supabaseClient == nil {
		InitDB()
		return supabaseClient, nil
	}

	return supabaseClient, nil

}
