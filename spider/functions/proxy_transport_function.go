package functions

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"sync"
	"time"

	"golang.org/x/net/proxy"
)

var (
	proxyList = []string{} // list of the proxy addresses
	// example:
	// "198.23.239.144:1240"
	currentIndex = 0
	mu           sync.Mutex
)

func ProxyTransport() *http.Transport {
	if len(proxyList) == 0 {
		return &http.Transport{
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 10,
			IdleConnTimeout:     30 * time.Second,
			DisableKeepAlives:   false,
		}
	}

	mu.Lock()
	defer mu.Unlock()

	currentIndex++
	if currentIndex >= len(proxyList) {
		currentIndex = 0
	}

	socks5Addr := proxyList[currentIndex]
	username := "" // proxy username
	password := "" // proxy password

	auth := &proxy.Auth{
		User:     username,
		Password: password,
	}
	dialer, err := proxy.SOCKS5("tcp", socks5Addr, auth, proxy.Direct)
	if err != nil {
		fmt.Println("Failed to create SOCKS5 dialer:", err)
		return &http.Transport{
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 10,
			IdleConnTimeout:     30 * time.Second,
			DisableKeepAlives:   false,
		}
	}

	return &http.Transport{
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			return dialer.Dial(network, addr)
		},
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 10,
		IdleConnTimeout:     30 * time.Second,
		DisableKeepAlives:   false,
	}
}
