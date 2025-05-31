#!/bin/bash

# Colors
BLUE='\033[94m'
CYAN='\033[96m'
GREEN='\033[92m'
YELLOW='\033[93m'
RED='\033[91m'
WHITE='\033[97m'
GRAY='\033[90m'
RESET='\033[0m'

# Global variables to track what needs cleanup
NEEDS_CLEANUP=false
INDEXER_BACKUP_EXISTS=false
GO_BACKUP_EXISTS=false

draw_logo() {
    echo -e ""
    echo -e "${BLUE}"
    echo "  ███████╗██████╗  ██████╗ ██╗  ██╗██╗   ██╗"
    echo "  ██╔════╝██╔══██╗██╔═══██╗╚██╗██╔╝╚██╗ ██╔╝"
    echo "  █████╗  ██████╔╝██║   ██║ ╚███╔╝  ╚████╔╝ "
    echo "  ██╔══╝  ██╔══██╗██║   ██║ ██╔██╗   ╚██╔╝  "
    echo "  ██║     ██║  ██║╚██████╔╝██╔╝ ██╗   ██║   "
    echo "  ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   "
    echo -e "${RESET}"
    echo -e ""
    echo -e "${CYAN}       Web Crawler & Indexer Suite${RESET}"
    echo -e "${GRAY}       ═══════════════════════════${RESET}"
    echo -e ""
}

# Function to check if database is running
check_database_status() {
    echo -e "${CYAN}Checking database...${RESET}"
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}Docker not running${RESET}"
        return 1
    fi
    
    # Check if PostgreSQL container is running
    if docker ps --format "table {{.Names}}" | grep -q "postgres\|db"; then
        echo -e "${GREEN}✓ Database running${RESET}"
        return 0
    else
        echo -e "${YELLOW}✗ Local database not running${RESET}"
        return 1
    fi
}

# Function to start local database
start_local_database() {
    echo -e "${YELLOW}Starting local database...${RESET}"
    
    if [ ! -d "db" ]; then
        echo -e "${RED}Error: 'db' directory not found${RESET}"
        echo -e "${YELLOW}Run from froxy project root${RESET}"
        return 1
    fi
    
    echo -e "${CYAN}Starting Docker Compose...${RESET}"
    cd db
    
    # Start Docker Compose
    if docker compose up -d --build; then
        echo -e "${GREEN}✓ Database started${RESET}"
        echo -e "${CYAN}Waiting for ready...${RESET}"
        sleep 5
        cd ..
        return 0
    else
        echo -e "${RED}✗ Failed to start database${RESET}"
        cd ..
        return 1
    fi
}

# Function to prompt user about database
prompt_database_setup() {
    echo -e "${WHITE}┌─ Database Status ──────────────────┐${RESET}"
    
    if check_database_status; then
        echo -e "${WHITE}│${RESET} ${GREEN}Database ready!${RESET}                 ${WHITE}│${RESET}"
        echo -e "${WHITE}└────────────────────────────────────┘${RESET}"
        echo -e ""
        return 0
    else
        echo -e "${WHITE}│${RESET} ${YELLOW}Local database not running${RESET}      ${WHITE}│${RESET}"
        echo -e "${WHITE}│${RESET}                                    ${WHITE}│${RESET}"
        echo -e "${WHITE}│${RESET} Start local database? ${GREEN}[Y]${RESET}es/${RED}[N]${RESET}o     ${WHITE}│${RESET}"
        echo -e "${WHITE}└────────────────────────────────────┘${RESET}"
        echo -ne "${CYAN}Choice: ${RESET}"
        read db_choice
        
        case $db_choice in
            [Yy]|[Yy][Ee][Ss]|"")
                echo -e ""
                if start_local_database; then
                    echo -e "${GREEN}Database ready!${RESET}"
                    sleep 1
                    return 0
                else
                    echo -e "${RED}Failed to start local database${RESET}"
                    echo -e "${YELLOW}Continuing anyway (external DB may be available)${RESET}"
                    sleep 2
                    return 0
                fi
                ;;
            [Nn]|[Nn][Oo])
                echo -e ""
                echo -e "${CYAN}Continuing with external database...${RESET}"
                sleep 1
                return 0
                ;;
            *)
                echo -e ""
                echo -e "${YELLOW}Invalid choice, continuing anyway...${RESET}"
                sleep 1
                return 0
                ;;
        esac
    fi
}

# Comprehensive cleanup function
cleanup_files() {
    if [ "$NEEDS_CLEANUP" = true ]; then
        echo -e "\n${YELLOW}Cleaning up...${RESET}"
        
        # Restore indexer file
        INDEXER_FILE="indexer-search/lib/services/indexer.js"
        if [ "$INDEXER_BACKUP_EXISTS" = true ] && [ -f "${INDEXER_FILE}.backup" ]; then
            mv "${INDEXER_FILE}.backup" "$INDEXER_FILE"
            echo -e "${GREEN}✓ Restored indexer.js${RESET}"
            INDEXER_BACKUP_EXISTS=false # Reset flag after cleanup
        fi
        
        # Restore Go file
        if [ "$GO_BACKUP_EXISTS" = true ] && [ -f "spider/main_backup.go" ]; then
            mv "spider/main_backup.go" "spider/main.go"
            echo -e "${GREEN}✓ Restored spider/main.go${RESET}"
            GO_BACKUP_EXISTS=false # Reset flag after cleanup
        fi
        
        echo -e "${GREEN}✓ Cleanup completed${RESET}"
        NEEDS_CLEANUP=false # Reset global cleanup flag
    fi
}

# Signal handler for interrupts
handle_interrupt() {
    echo -e "\n${YELLOW}Interrupted by user${RESET}"
    cleanup_files
    exit 130
}

# Set the global trap once at the beginning of the script's execution
trap 'handle_interrupt' INT TERM

show_menu() {
    echo -e "${WHITE}┌─ Main Menu ────────────────────────┐${RESET}"
    echo -e "${WHITE}│${RESET}                                    ${WHITE}│${RESET}"
    echo -e "${WHITE}│${RESET}  ${YELLOW}1${RESET} - Start Crawler                ${WHITE}│${RESET}"
    echo -e "${WHITE}│${RESET}  ${YELLOW}2${RESET} - Start Indexer                ${WHITE}│${RESET}"
    echo -e "${CYAN}│${RESET}  ${CYAN}3${RESET} - Check Database               ${WHITE}│${RESET}"
    echo -e "${RED}│${RESET}  ${RED}Q${RESET} - Quit                         ${WHITE}│${RESET}"
    echo -e "${WHITE}│${RESET}                                    ${WHITE}│${RESET}"
    echo -e "${WHITE}└────────────────────────────────────┘${RESET}"
    echo -e ""
    echo -ne "${CYAN}Select: ${RESET}"
}

start_crawling() {
    clear
    draw_logo
    
    # Check database before starting crawler
    prompt_database_setup
    
    clear
    draw_logo
    echo -e "${WHITE}┌─ Web Crawler ──────────────────────┐${RESET}"
    echo -e "${WHITE}│${RESET} Enter URLs (one per line)          ${WHITE}│${RESET}"
    echo -e "${WHITE}│${RESET} Press ENTER on empty line to start ${WHITE}│${RESET}"
    echo -e "${WHITE}└────────────────────────────────────┘${RESET}"
    echo -e ""

    url_count=0
    url_list=""

    while true; do
        echo -ne "${CYAN}URL ${url_count}: ${RESET}"
        read url
        
        if [ -z "$url" ]; then
            break
        fi

        if [ $url_count -eq 0 ]; then
            url_list="\"$url\""
        else
            url_list="$url_list,\n\t\t\"$url\""
        fi
        
        ((url_count++))
    done

    if [ $url_count -eq 0 ]; then
        echo -e "${RED}No URLs provided${RESET}"
        sleep 2
        clear
        return
    fi

    echo -e ""
    echo -e "${GREEN}Starting crawler with $url_count URLs...${RESET}"

    # Create a temporary Go file with the provided URLs
    cat > spider/main_temp.go << EOF
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
        $(echo -e "$url_list"),
    }

    crawler.Start(
        5,
        crawlableSites...,
    )

}
EOF

    echo -e "${GREEN}Updating spider/main.go...${RESET}"
    if [ -f spider/main.go ]; then
        cp spider/main.go spider/main_backup.go
        GO_BACKUP_EXISTS=true # Set this global flag
        NEEDS_CLEANUP=true # Set this global flag
        echo -e "${GREEN}✓ Backed up original main.go${RESET}"
    fi
    mv spider/main_temp.go spider/main.go

    echo -e "${GREEN}Running crawler...${RESET}"
    echo -e "${GRAY}──────────────────────────────${RESET}"
    cd spider
    go run main.go
    CRAWLER_EXIT_CODE=$?
    cd ..

    # Instead of restoring here, let cleanup_files handle it.
    # This block is now removed:
    # if [ "$GO_BACKUP_EXISTS" = true ] && [ -f "spider/main_backup.go" ]; then
    #     mv "spider/main_backup.go" "spider/main.go"
    #     echo -e "${GREEN}✓ Restored original main.go${RESET}"
    #     GO_BACKUP_EXISTS=false
    # fi

    if [ $CRAWLER_EXIT_CODE -eq 0 ]; then
        echo -e ""
        echo -e "${GREEN}Crawling completed!${RESET}"
    else
        echo -e ""
        echo -e "${RED}Crawling failed (exit code $CRAWLER_EXIT_CODE)${RESET}"
    fi
    
    echo -e "${CYAN}Press any key...${RESET}"
    read -n 1
    clear
    
    # After the task is done, trigger cleanup.
    # This ensures cleanup happens even if not interrupted.
    cleanup_files
}

start_indexer() {
    clear
    draw_logo
    
    # Check database before starting indexer
    prompt_database_setup
    
    clear
    draw_logo
    echo -e "${WHITE}┌─ Search Indexer ───────────────────┐${RESET}"
    echo -e "${WHITE}│${RESET} Starting TF-IDF indexer...         ${WHITE}│${RESET}"
    echo -e "${WHITE}└────────────────────────────────────┘${RESET}"
    echo -e ""

    echo -e "${GREEN}Preparing indexer...${RESET}"
    
    # Backup and modify the indexer file
    INDEXER_FILE="indexer-search/lib/services/indexer.js"
    
    if [ ! -f "$INDEXER_FILE" ]; then
        echo -e "${RED}Error: Indexer file not found${RESET}"
        echo -e "${CYAN}Press any key...${RESET}"
        read -n 1
        clear
        return
    fi
    
    # Create backup
    cp "$INDEXER_FILE" "${INDEXER_FILE}.backup"
    INDEXER_BACKUP_EXISTS=true # Set this global flag
    NEEDS_CLEANUP=true # Set this global flag
    echo -e "${GREEN}✓ Backed up indexer.js${RESET}"
    
    # Uncomment the execution block
    sed -i 's|^// Run if called directly|// Run if called directly|g' "$INDEXER_FILE"
    sed -i 's|^// if (require\.main === module) {|if (require.main === module) {|g' "$INDEXER_FILE"
    sed -i 's|^//   calculateTfIdfInBatches()|  calculateTfIdfInBatches()|g' "$INDEXER_FILE"
    sed -i 's|^//     \.then(() => {|    .then(() => {|g' "$INDEXER_FILE"
    sed -i 's|^//       console\.log("TF-IDF calculation completed successfully");|      console.log("TF-IDF calculation completed successfully");|g' "$INDEXER_FILE"
    sed -i 's|^//       process\.exit(0);|      process.exit(0);|g' "$INDEXER_FILE"
    sed -i 's|^//     })|    })|g' "$INDEXER_FILE"
    sed -i 's|^//     \.catch((error) => {|    .catch((error) => {|g' "$INDEXER_FILE"
    sed -i 's|^//       console\.error("TF-IDF calculation failed:", error);|      console.error("TF-IDF calculation failed:", error);|g' "$INDEXER_FILE"
    sed -i 's|^//       process\.exit(1);|      process.exit(1);|g' "$INDEXER_FILE"
    sed -i 's|^//     });|    });|g' "$INDEXER_FILE"
    sed -i 's|^// }|} |g' "$INDEXER_FILE"
    
    echo -e "${GREEN}✓ Modified indexer for execution${RESET}"
    echo -e "${GRAY}──────────────────────────────${RESET}"

    # Execute indexer
    cd indexer-search/lib/services
    echo -e "${GREEN}Running indexer...${RESET}"
    node indexer.js
    INDEXER_EXIT_CODE=$?
    cd ../../..

    # Instead of restoring here, let cleanup_files handle it.
    # This block is now removed:
    # if [ "$INDEXER_BACKUP_EXISTS" = true ] && [ -f "${INDEXER_FILE}.backup" ]; then
    #     mv "${INDEXER_FILE}.backup" "$INDEXER_FILE"
    #     echo -e "${GREEN}✓ Restored original indexer.js${RESET}"
    #     INDEXER_BACKUP_EXISTS=false
    # fi

    if [ $INDEXER_EXIT_CODE -eq 0 ]; then
        echo -e ""
        echo -e "${GREEN}Indexing completed!${RESET}"
    else
        echo -e ""
        echo -e "${RED}Indexing failed (exit code $INDEXER_EXIT_CODE)${RESET}"
    fi
    
    echo -e "${CYAN}Press any key...${RESET}"
    read -n 1
    clear
    
    # After the task is done, trigger cleanup.
    cleanup_files
}

check_database_menu() {
    clear
    draw_logo
    echo -e "${WHITE}┌─ Database Status ──────────────────┐${RESET}"
    
    if check_database_status; then
        echo -e "${WHITE}│${RESET} ${GREEN}✓ Database running${RESET}              ${WHITE}│${RESET}"
        echo -e "${WHITE}│${RESET} Connection: ${GREEN}Active${RESET}              ${WHITE}│${RESET}"
    else
        echo -e "${WHITE}│${RESET} ${RED}✗ Local database not running${RESET}    ${WHITE}│${RESET}"
        echo -e "${WHITE}│${RESET} Connection: ${RED}Inactive${RESET}            ${WHITE}│${RESET}"
        echo -e "${WHITE}│${RESET}                                    ${WHITE}│${RESET}"
        echo -e "${WHITE}│${RESET} Start local database? ${GREEN}[Y]${RESET}/${RED}[N]${RESET}      ${WHITE}│${RESET}"
    fi
    
    echo -e "${WHITE}└────────────────────────────────────┘${RESET}"
    echo -e ""
    
    if ! check_database_status; then
        echo -ne "${CYAN}Choice: ${RESET}"
        read db_choice
        
        case $db_choice in
            [Yy]|[Yy][Ee][Ss]|"")
                echo -e ""
                start_local_database
                ;;
            [Nn]|[Nn][Oo])
                echo -e ""
                echo -e "${CYAN}Database remains stopped${RESET}"
                ;;
            *)
                echo -e ""
                echo -e "${YELLOW}Invalid choice${RESET}"
                ;;
        esac
    fi
    
    echo -e "${CYAN}Press any key...${RESET}"
    read -n 1
    clear
}

quit_app() {
    clear
    draw_logo
    echo -e "${GREEN}Thank you for using Froxy!${RESET}"
    echo -e ""
    cleanup_files  # Clean up before exiting
    sleep 1
    exit 0
}

# Main loop
main() {
    while true; do
        clear
        draw_logo
        show_menu
        read choice

        case $choice in
            1)
                start_crawling
                ;;
            2)
                start_indexer
                ;;
            3)
                check_database_menu
                ;;
            [Qq]|quit|QUIT)
                quit_app
                ;;
            *)
                echo -e "${RED}Invalid choice${RESET}"
                sleep 1
                ;;
        esac
    done
}

# Start the application
main