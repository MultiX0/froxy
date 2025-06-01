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
		"https://www.amazon.com",
		"https://www.ebay.com",
		"https://www.walmart.com",
		"https://www.etsy.com",
		"https://www.aliexpress.com",
		"https://www.bestbuy.com",
		"https://www.target.com",
		"https://www.shopify.com",
		"https://www.zappos.com",
		"https://www.newegg.com",
		"https://www.indeed.com",
		"https://www.linkedin.com",
		"https://www.glassdoor.com",
		"https://www.monster.com",
		"https://www.careerbuilder.com",
		"https://www.simplyhired.com",
		"https://www.ziprecruiter.com",
		"https://www.flexjobs.com",
		"https://www.angel.co",
		"https://www.dice.com",
		"https://www.twitter.com",
		"https://www.reddit.com",
		"https://www.facebook.com",
		"https://www.instagram.com",
		"https://www.quora.com",
		"https://www.stackoverflow.com",
		"https://www.github.com",
		"https://www.medium.com",
		"https://www.tumblr.com",
		"https://www.discord.com",
		"https://www.theguardian.com",
		"https://www.reuters.com",
		"https://www.apnews.com",
		"https://www.npr.org",
		"https://www.forbes.com",
		"https://www.bloomberg.com",
		"https://www.wsj.com",
		"https://www.jstor.org",
		"https://scholar.google.com",
		"https://www.researchgate.net",
		"https://www.arxiv.org",
		"https://www.semanticscholar.org",
		"https://www.doaj.org",
		"https://www.plos.org",
		"https://www.springer.com",
		"https://www.wiley.com",
		"https://www.crunchbase.com",
		"https://www.angel.co",
		"https://www.pitchbook.com",
		"https://www.owler.com",
		"https://www.zoominfo.com",
		"https://www.hoovers.com",
		"https://www.builtin.com",
		"https://www.cbinsights.com",
		"https://www.businesswire.com",
		"https://www.prnewswire.com",
		"https://www.zillow.com",
		"https://www.realtor.com",
		"https://www.trulia.com",
		"https://www.redfin.com",
		"https://www.loopnet.com",
		"https://www.rightmove.co.uk",
		"https://www.reviews.io",
		"https://www.trustpilot.com",
		"https://www.g2.com",
		"https://www.capterra.com",
		"https://www.producthunt.com",
		"https://www.yelp.com",
		"https://www.tripadvisor.com",
		"https://www.trustpilot.com",
		"https://www.bbb.org",
		"https://www.trustradius.com",
	}

	crawler.Start(
		5,
		crawlableSites...,
	)

}
