package main

import (
	"context"
	"fmt"
	"log"
	"sync"

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

	defer db.GetPostgresHandler().Close()

	crawler := functions.Crawler{
		LinksQueue:  &[]models.Link{},
		VisitedUrls: map[string]struct{}{},
		QueuedUrls:  map[string]bool{},
		Mu:          &sync.Mutex{},
		Ctx:         context.Background(),
	}

	var crawlableSites = []string{
		// "https://en.wikipedia.org",
		// "https://www.bbc.com",
		// "https://www.nytimes.com",
		// "https://www.cnn.com",
		// "https://www.theguardian.com",
		// "https://www.reddit.com",
		// "https://stackoverflow.com",
		// "https://github.com",
		// "https://medium.com",
		// "https://www.quora.com",
		// "https://www.wired.com",
		// "https://www.techcrunch.com",
		// "https://www.cnet.com",
		// "https://www.bloomberg.com",
		// "https://arstechnica.com",
		// "https://www.sciencedaily.com",
		// "https://www.nationalgeographic.com",
		// "https://www.nasa.gov",
		// "https://www.ted.com",
		// "https://www.khanacademy.org",
		// "https://www.imdb.com",
		// "https://www.allrecipes.com",
		// "https://www.healthline.com",
		// "https://www.mayoclinic.org",
		// "https://www.fda.gov",
		// "https://www.noaa.gov",
		// "https://edition.cnn.com",
		// "https://www.aljazeera.com",
		// "https://www.npr.org",
		// "https://www.vox.com",
		// "https://www.businessinsider.com",
		// "https://www.marketwatch.com",
		// "https://www.economist.com",
		// "https://www.forbes.com",
		// "https://www.inc.com",
		// "https://www.zdnet.com",
		// "https://www.digitaltrends.com",
		// "https://www.engadget.com",
		// "https://www.pcworld.com",
		// "https://www.tomshardware.com",
		// "https://www.gamespot.com",
		// "https://www.ign.com",
		// "https://www.metacritic.com",
		// "https://www.animenewsnetwork.com",
		// "https://www.goodreads.com",
		// "https://www.stackexchange.com",
		// "https://www.mozilla.org",
		// "https://stackoverflow.com",
		// "https://superuser.com",
		// "https://serverfault.com",
		// "https://askubuntu.com",
		// "https://stackexchange.com",
		// "https://github.com",
		// "https://gitlab.com",
		// "https://bitbucket.org",
		// "https://gitee.com",
		// "https://sourceforge.net",
		// "https://docs.github.com",
		// "https://docs.gitlab.com",
		// "https://dev.to",
		// "https://medium.com",
		// "https://hashnode.com",
		// "https://www.freecodecamp.org",
		// "https://www.geeksforgeeks.org",
		// "https://www.w3schools.com",
		// "https://developer.mozilla.org",
		// "https://www.tutorialspoint.com",
		// "https://www.javatpoint.com",
		// "https://www.programiz.com",
		// "https://www.digitalocean.com/community",
		// "https://www.linode.com/docs",
		// "https://www.scaleway.com/en/docs/",
		// "https://www.jetbrains.com/help/",
		// "https://learn.microsoft.com",
		// "https://docs.python.org",
		// "https://nodejs.org/en/docs/",
		// "https://pkg.go.dev",
		// "https://golang.org/doc/",
		// "https://devdocs.io",
		// "https://developer.apple.com",
		// "https://developer.android.com",
		// "https://flutter.dev/docs",
		// "https://reactjs.org/docs",
		// "https://vuejs.org/guide/",
		// "https://svelte.dev/docs",
		// "https://angular.io/docs",
		// "https://kotlinlang.org/docs/home.html",
		// "https://dart.dev/guides",
		// "https://nextjs.org/docs",
		// "https://tailwindcss.com/docs",
		// "https://graphql.org/learn/",
		// "https://www.mongodb.com/docs/",
		// "https://www.postgresql.org/docs/",
		// "https://dev.mysql.com/doc/",
		// "https://firebase.google.com/docs",
		// "https://supabase.com/docs",
		// "https://redis.io/docs",
		// "https://docs.docker.com",
		// "https://kubernetes.io/docs/",
		// "https://docs.ansible.com/",
		// "https://terraform.io/docs",
		// "https://docs.aws.amazon.com",
		// "https://cloud.google.com/docs",
		// "https://learn.microsoft.com/en-us/azure",
		// "https://www.cloudflare.com/learning/",
		// "https://www.nginx.com/resources/wiki/",
		// "https://httpd.apache.org/docs/",
		// "https://spring.io/projects/spring-boot",
		// "https://quarkus.io/guides/",
		// "https://micronaut.io/documentation.html",
		"https://blog.archive.org/",
	}

	crawler.Start(
		5,
		crawlableSites...,
	)

}
