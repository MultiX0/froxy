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
		"https://mawdoo3.com/",
		"https://anime3rb.com/",
		"https://azoramoon.com/",
		"https://lekmanga.net/",
		"https://mangaplus.shueisha.co.jp/",
		"https://witanime.cyou/",
		"https://tappytoon.com/",
		"https://tapas.io/",
		"https://inkr.com/",
		"https://mangadex.org/",
		"https://global.bookwalker.jp/",
		"https://www.crunchyroll.com/",
		"https://www.retrocrush.tv/",
		"https://www.anime-planet.com/anime/watch-online",
		"https://www.fatafeat.com/",
		"https://kitchen.sayidaty.net/",
		"https://www.layalina.com/",
		"https://www.cookpad.com/sa",
		"https://chefaa.com/eg-ar",
		"https://openai.com/",
		"https://www.aljazeera.net/",
		"https://www.alarabiya.net/",
		"https://www.skynewsarabia.com/",
		"https://www.annahar.com/",
		"https://www.addustour.com/",
		"https://www.albayan.ae/",
		"https://www.aleqt.com/",
		"https://www.almayadeen.net/",

		"https://chefindisguise.com/",
		"https://fufuskitchen.com/",
		"https://www.hungrypaprikas.com/",
		"https://www.omayahcooks.com/",
		"https://www.feastingathome.com/category/ethnic-cuisine/middle-eastern-recipes/",

		"https://www.arabacademy.com/",
		"https://www.madinaharabic.com/",
		"https://learning.aljazeera.net/en",
		"https://azoramoon.com/series/one-day-i-became-a-princess/",
		"https://www.kotobati.com/section/%D8%B1%D9%88%D8%A7%D9%8A%D8%A7%D8%AA",
		"https://www.abjjad.com/books/220759001/%D8%B1%D9%88%D8%A7%D9%8A%D8%A7%D8%AA-%D9%88%D9%82%D8%B5%D8%B5",
		"https://www.noor-book.com/tag/%D8%A7%D9%84%D8%B1%D9%88%D8%A7%D9%8A%D8%A7%D8%AA-%D9%88%D8%A7%D9%84%D9%82%D8%B5%D8%B5-%D8%A7%D9%84%D8%A3%D8%AF%D8%A8%D9%8A%D8%A9",
		"https://www.aseeralkotb.com/ar/categories/%D8%B1%D9%88%D8%A7%D9%8A%D8%A7%D8%AA?srsltid=AfmBOor6G-XiGMcaJzFcIIyVO-QLEq7LhbPK5OrPsdCHhyWAP-VIL_Kv",
		"https://www.alarabimag.com/213/%D8%B1%D9%88%D8%A7%D9%8A%D8%A7%D8%AA-%D8%B9%D8%B1%D8%A8%D9%8A%D8%A9/",
		"https://kolnovel.com/",
		"https://www.wikipedia.org/",
		"https://froxy.atlasapp.app/",
		"https://www.atlasapp.app/",
		"https://www.animewitcher.com/",
		"https://www.google.com/",
		"https://ar.uptodown.com/",
		"https://www.lumar.io/learn/seo/search-engines/how-do-search-engines-work/",
		"https://www.geeksforgeeks.org/what-are-search-engines-and-how-do-they-work/",
		"https://www.akamai.com/glossary/what-is-a-web-crawler",
		"https://www.akamai.com/",
		"https://www.coursera.org/",
		"https://www.coursera.org/",
		"https://islamqa.info/ar",
		"https://sunnah.com/",
		"https://www.asu.edu/",
		"https://www.stanford.edu/",
		"https://www.anthropic.com/claude",
		"https://dorar.net/",
		"https://traidnt.com/",
		"https://thaqafnafsak.com/",
		"https://arabic.rt.com/",
	}

	crawler.Start(
		5,
		crawlableSites...,
	)

}
