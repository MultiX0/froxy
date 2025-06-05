@echo off
setlocal enabledelayedexpansion
color 0f
cls

:main
call :draw_logo
call :show_menu
goto :eof

:draw_logo
echo.
echo [94m
echo  ███████╗██████╗  ██████╗ ██╗  ██╗██╗   ██╗
echo  ██╔════╝██╔══██╗██╔═══██╗╚██╗██╔╝╚██╗ ██╔╝
echo  █████╗  ██████╔╝██║   ██║ ╚███╔╝  ╚████╔╝ 
echo  ██╔══╝  ██╔══██╗██║   ██║ ██╔██╗   ╚██╔╝  
echo  ██║     ██║  ██║╚██████╔╝██╔╝ ██╗   ██║   
echo  ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   
echo [0m
echo.
echo [96m          Web Crawler ^& Indexer Suite[0m
echo [90m          ════════════════════════════[0m
echo.
goto :eof

:show_menu
echo [97m┌─ Main Menu ──────────────────────────────────┐[0m
echo [97m│[0m                                              [97m│[0m
echo [97m│[0m  [93m1[0m - Start Crawling                        [97m│[0m
echo [97m│[0m  [93m2[0m - Start the Indexer                     [97m│[0m
echo [97m│[0m  [91mQ[0m - Quit                                  [97m│[0m
echo [97m│[0m                                              [97m│[0m
echo [97m└──────────────────────────────────────────────┘[0m
echo.
set /p choice="[96mSelect an option: [0m"

if /i "%choice%"=="1" goto :start_crawling
if /i "%choice%"=="2" goto :start_indexer
if /i "%choice%"=="q" goto :quit
if /i "%choice%"=="quit" goto :quit

echo [91mInvalid choice. Please try again.[0m
timeout /t 2 /nobreak >nul
cls
goto :main

:start_crawling
cls
call :draw_logo
echo [97m┌─ Web Crawler Setup ──────────────────────────┐[0m
echo [97m│[0m                                              [97m│[0m
echo [97m│[0m  Enter URLs to crawl (one per line)          [97m│[0m
echo [97m│[0m  Press ENTER on empty line when done         [97m│[0m
echo [97m│[0m                                              [97m│[0m
echo [97m└──────────────────────────────────────────────┘[0m
echo.

set url_count=0
set url_list=

:input_loop
set /p url="[96mURL %url_count%: [0m"
if "%url%"=="" goto :execute_crawler

set /a url_count+=1
if !url_count! equ 1 (
    set url_list="!url!"
) else (
    set url_list=!url_list!, "!url!"
)
goto :input_loop

:execute_crawler
if %url_count% equ 0 (
    echo [91mNo URLs provided. Returning to main menu.[0m
    timeout /t 2 /nobreak >nul
    cls
    goto :main
)

echo.
echo [92mStarting crawler with %url_count% URLs...[0m
echo [90mGenerating crawlableSites list...[0m

rem Create a temporary Go file with the provided URLs
(
echo package main
echo.
echo import ^(
echo 	"context"
echo 	"fmt"
echo 	"log"
echo 	"sync"
echo 	"time"
echo.
echo 	"github.com/froxy/db"
echo 	"github.com/froxy/functions"
echo 	"github.com/froxy/models"
echo 	"github.com/joho/godotenv"
echo ^)
echo.
echo func main^(^) {
echo.
echo 	fmt.Println^("starting spider bot"^)
echo 	err := godotenv.Load^(^)
echo 	if err != nil {
echo 		log.Fatal^(err^)
echo 	}
echo.
echo 	err = db.InitPostgres^(^)
echo 	if err != nil {
echo 		log.Println^(err^)
echo 	}
echo.
echo 	defer db.GetPostgresHandler^(^).GracefulShutdown^(time.Second * 5^)
echo.
echo 	crawler := functions.Crawler{
echo 		LinksQueue:  ^^^&[]models.Link{},
echo 		VisitedUrls: map[string]struct{}{},
echo 		QueuedUrls:  map[string]bool{},
echo 		Mu:          ^^^&sync.Mutex{},
echo 		Ctx:         context.Background^(^),
echo 	}
echo.
echo 	var crawlableSites = []string{
echo 		!url_list!,
echo 	}
echo.
echo 	crawler.Start^(
echo 		5,
echo 		crawlableSites...^,
echo 	^)
echo.
echo }
) > spider\main_temp.go

echo [92mBacking up original main.go...[0m
if exist spider\main.go (
    copy spider\main.go spider\main_backup.go >nul
)

echo [92mUpdating spider/main.go with new URLs...[0m
copy spider\main_temp.go spider\main.go >nul
del spider\main_temp.go >nul

echo [92mExecuting crawler...[0m
echo [90m────────────────────────────────────────────────[0m
cd spider
go run main.go
cd ..

echo.
echo [92mCrawling completed![0m
echo [96mPress any key to return to main menu...[0m
pause >nul
cls
goto :main

:start_indexer
cls
call :draw_logo
echo [97m┌─ Search Indexer ─────────────────────────────┐[0m
echo [97m│[0m                                              [97m│[0m
echo [97m│[0m  Starting the search indexer...              [97m│[0m
echo [97m│[0m                                              [97m│[0m
echo [97m└──────────────────────────────────────────────┘[0m
echo.

echo [92mInitializing indexer...[0m
echo [90m────────────────────────────────────────────────[0m

rem Execute indexer (assuming it's in indexer-search directory)
cd indexer-search
echo [92mRunning indexer...[0m
go run main.go
cd ..

echo.
echo [92mIndexing completed![0m
echo [96mPress any key to return to main menu...[0m
pause >nul
cls
goto :main

:quit
cls
call :draw_logo
echo [92mThank you for using Froxy![0m
echo [90mShutting down...[0m
echo.
timeout /t 2 /nobreak >nul
exit /b 0