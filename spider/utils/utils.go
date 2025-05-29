package utils

import (
	"errors"
	"net/url"

	"github.com/froxy/models"
)

func Enqueue(queue []models.Link, element models.Link) []models.Link {
	return append(queue, element)
}

func Dequeue(queue []models.Link) (models.Link, []models.Link, error) {
	if len(queue) == 0 {
		return models.Link{}, queue, errors.New("queue is empty")
	}
	element := queue[0]
	return element, queue[1:], nil
}

func CanonicalizeURL(raw string) (string, error) {
	parsed, err := url.Parse(raw)
	if err != nil {
		return "", err
	}
	parsed.Fragment = ""
	parsed.RawQuery = ""
	return parsed.String(), nil
}
