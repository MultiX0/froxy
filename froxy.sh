#!/bin/bash

BLUE='\033[94m'
CYAN='\033[96m'
GREEN='\033[92m'
YELLOW='\033[93m'
RED='\033[91m'
WHITE='\033[97m'
GRAY='\033[90m'
RESET='\033[0m'

NEEDS_CLEANUP=false
GO_BACKUP_EXISTS=false
# Store the project root directory
PROJECT_ROOT="$(pwd)"

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
    echo -e "${CYAN}       Web Crawler & Vector Search Suite${RESET}"
    echo -e "${GRAY}       ════════════════════════════════${RESET}"
    echo -e ""
}

check_env_file_configured() {
    local env_file="$1"
    local component="$2"
    
    if [ ! -f "$env_file" ]; then
        echo -e "${RED}✗ Missing: ${component}/.env${RESET}"
        return 1
    fi
    
    # Check if file contains placeholder values
    if grep -q "your_user\|your_password\|your_database\|your_api_key\|localhost" "$env_file"; then
        # Allow localhost for some services but check if other placeholders exist
        if grep -q "your_user\|your_password\|your_database\|your_api_key" "$env_file"; then
            echo -e "${YELLOW}⚠ Unconfigured: ${component}/.env (contains placeholders)${RESET}"
            return 1
        fi
    fi
    
    # Check if file is not empty and has required variables
    if [ ! -s "$env_file" ]; then
        echo -e "${RED}✗ Empty: ${component}/.env${RESET}"
        return 1
    fi
    
    echo -e "${GREEN}✓ Configured: ${component}/.env${RESET}"
    return 0
}

create_docker_network() {
    echo -e "${CYAN}Checking Docker network...${RESET}"
    
    if ! docker network ls | grep -q "froxy-network"; then
        echo -e "${YELLOW}Creating froxy-network...${RESET}"
        if docker network create froxy-network; then
            echo -e "${GREEN}✓ Network created${RESET}"
        else
            echo -e "${RED}✗ Failed to create network${RESET}"
            return 1
        fi
    else
        echo -e "${GREEN}✓ Network exists${RESET}"
    fi
    return 0
}

validate_env_files() {
    echo -e "${CYAN}Validating environment files...${RESET}"
    echo -e ""
    
    local all_valid=true
    local missing_or_invalid=()
    
    # Check each required .env file
    if ! check_env_file_configured "${PROJECT_ROOT}/indexer-search/.env" "indexer-search"; then
        all_valid=false
        missing_or_invalid+=("indexer-search")
    fi
    
    if ! check_env_file_configured "${PROJECT_ROOT}/front-end/.env" "front-end"; then
        all_valid=false
        missing_or_invalid+=("front-end")
    fi
    
    if ! check_env_file_configured "${PROJECT_ROOT}/db/.env" "db"; then
        all_valid=false
        missing_or_invalid+=("db")
    fi
    
    if ! check_env_file_configured "${PROJECT_ROOT}/spider/.env" "spider"; then
        all_valid=false
        missing_or_invalid+=("spider")
    fi
    
    if ! check_env_file_configured "${PROJECT_ROOT}/qdrant/.env" "qdrant"; then
        all_valid=false
        missing_or_invalid+=("qdrant")
    fi
    
    echo -e ""
    
    if [ "$all_valid" = true ]; then
        echo -e "${GREEN}All environment files are properly configured!${RESET}"
        echo -e ""
        return 0
    else
        echo -e "${YELLOW}Environment files need attention:${RESET}"
        for component in "${missing_or_invalid[@]}"; do
            echo -e "${YELLOW}  - ${component}/.env${RESET}"
        done
        echo -e ""
        echo -e "${WHITE}┌─ Environment Setup Required ───────┐${RESET}"
        echo -e "${WHITE}│${RESET} Some .env files are missing or      ${WHITE}│${RESET}"
        echo -e "${WHITE}│${RESET} contain placeholder values.         ${WHITE}│${RESET}"
        echo -e "${WHITE}│${RESET}                                     ${WHITE}│${RESET}"
        echo -e "${WHITE}│${RESET} Setup environment files now?       ${WHITE}│${RESET}"
        echo -e "${WHITE}│${RESET} ${GREEN}[Y]${RESET}es / ${RED}[N]${RESET}o                      ${WHITE}│${RESET}"
        echo -e "${WHITE}└─────────────────────────────────────┘${RESET}"
        echo -ne "${CYAN}Choice: ${RESET}"
        read env_choice
        
        case $env_choice in
            [Yy]|[Yy][Ee][Ss]|"")
                echo -e ""
                setup_env_files
                return $?
                ;;
            [Nn]|[Nn][Oo])
                echo -e ""
                echo -e "${YELLOW}Continuing without setting up environment files...${RESET}"
                echo -e "${RED}Warning: Components may not work properly!${RESET}"
                sleep 3
                return 1
                ;;
            *)
                echo -e ""
                echo -e "${YELLOW}Invalid choice, continuing anyway...${RESET}"
                echo -e "${RED}Warning: Components may not work properly!${RESET}"
                sleep 3
                return 1
                ;;
        esac
    fi
}

check_service_status() {
    local service_name="$1"
    local container_pattern="$2"
    
    if docker ps --format "table {{.Names}}" | grep -q "$container_pattern"; then
        echo -e "${GREEN}✓ ${service_name} running${RESET}"
        return 0
    else
        echo -e "${YELLOW}✗ ${service_name} not running${RESET}"
        return 1
    fi
}

check_database_status() {
    echo -e "${CYAN}Checking services status...${RESET}"
    
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}Docker not running${RESET}"
        return 1
    fi
    
    local postgres_running=false
    local qdrant_running=false 
    local fastembed_running=false
    
    if check_service_status "PostgreSQL" "froxy_pgsql\|postgres"; then
        postgres_running=true
    fi
    
    if check_service_status "Qdrant" "qdrant"; then
        qdrant_running=true
    fi
    
    if check_service_status "FastEmbed" "embedding-service\|fastembed"; then
        fastembed_running=true
    fi
    
    if [ "$postgres_running" = true ] && [ "$qdrant_running" = true ] && [ "$fastembed_running" = true ]; then
        echo -e "${GREEN}✓ All services running${RESET}"
        return 0
    else
        return 1
    fi
}

setup_postgres_permissions() {
    echo -e "${CYAN}Setting up PostgreSQL permissions...${RESET}"
    
    if [ ! -d "${PROJECT_ROOT}/db/postgres_data" ]; then
        mkdir -p "${PROJECT_ROOT}/db/postgres_data"
        echo -e "${GREEN}✓ Created postgres_data directory${RESET}"
    fi
    
    # Set proper permissions for PostgreSQL data directory
    if sudo chown -R 999:999 "${PROJECT_ROOT}/db/postgres_data" 2>/dev/null; then
        echo -e "${GREEN}✓ Set PostgreSQL permissions${RESET}"
    else
        echo -e "${YELLOW}⚠ Could not set PostgreSQL permissions (may need manual setup)${RESET}"
    fi
}

start_services() {
    echo -e "${CYAN}Starting services...${RESET}"
    
    # Create network first
    create_docker_network
    
    # Setup PostgreSQL permissions
    setup_postgres_permissions
    
    # Start PostgreSQL
    echo -e "${YELLOW}Starting PostgreSQL...${RESET}"
    if [ ! -d "${PROJECT_ROOT}/db" ]; then
        echo -e "${RED}Error: 'db' directory not found${RESET}"
        return 1
    fi
    
    cd "${PROJECT_ROOT}/db"
    if docker compose up -d --build; then
        echo -e "${GREEN}✓ PostgreSQL started${RESET}"
    else
        echo -e "${RED}✗ Failed to start PostgreSQL${RESET}"
        cd "${PROJECT_ROOT}"
        return 1
    fi
    cd "${PROJECT_ROOT}"
    
    # Start Qdrant
    echo -e "${YELLOW}Starting Qdrant...${RESET}"
    if [ ! -d "${PROJECT_ROOT}/qdrant" ]; then
        echo -e "${RED}Error: 'qdrant' directory not found${RESET}"
        return 1
    fi
    
    cd "${PROJECT_ROOT}/qdrant"
    if docker compose up -d --build; then
        echo -e "${GREEN}✓ Qdrant started${RESET}"
    else
        echo -e "${RED}✗ Failed to start Qdrant${RESET}"
        cd "${PROJECT_ROOT}"
        return 1
    fi
    cd "${PROJECT_ROOT}"
    
    # Start FastEmbed
    echo -e "${YELLOW}Starting FastEmbed service...${RESET}"
    if [ ! -d "${PROJECT_ROOT}/fastembed" ]; then
        echo -e "${RED}Error: 'fastembed' directory not found${RESET}"
        return 1
    fi
    
    cd "${PROJECT_ROOT}/fastembed"
    if docker compose up -d --build; then
        echo -e "${GREEN}✓ FastEmbed started${RESET}"
    else
        echo -e "${RED}✗ Failed to start FastEmbed${RESET}"
        cd "${PROJECT_ROOT}"
        return 1
    fi
    cd "${PROJECT_ROOT}"
    
    echo -e "${CYAN}Waiting for services to be ready...${RESET}"
    sleep 10
    
    return 0
}

prompt_services_setup() {
    echo -e "${WHITE}┌─ Services Status ──────────────────┐${RESET}"
    
    if check_database_status; then
        echo -e "${WHITE}│${RESET} ${GREEN}All services ready!${RESET}             ${WHITE}│${RESET}"
        echo -e "${WHITE}└────────────────────────────────────┘${RESET}"
        echo -e ""
        return 0
    else
        echo -e "${WHITE}│${RESET} ${YELLOW}Some services not running${RESET}       ${WHITE}│${RESET}"
        echo -e "${WHITE}│${RESET}                                    ${WHITE}│${RESET}"
        echo -e "${WHITE}│${RESET} Start all services? ${GREEN}[Y]${RESET}es/${RED}[N]${RESET}o      ${WHITE}│${RESET}"
        echo -e "${WHITE}└────────────────────────────────────┘${RESET}"
        echo -ne "${CYAN}Choice: ${RESET}"
        read services_choice
        
        case $services_choice in
            [Yy]|[Yy][Ee][Ss]|"")
                echo -e ""
                if start_services; then
                    echo -e "${GREEN}Services ready!${RESET}"
                    sleep 2
                    return 0
                else
                    echo -e "${RED}Failed to start some services${RESET}"
                    echo -e "${YELLOW}Continuing anyway (external services may be available)${RESET}"
                    sleep 3
                    return 0
                fi
                ;;
            [Nn]|[Nn][Oo])
                echo -e ""
                echo -e "${CYAN}Continuing with external services...${RESET}"
                sleep 2
                return 0
                ;;
            *)
                echo -e ""
                echo -e "${YELLOW}Invalid choice, continuing anyway...${RESET}"
                sleep 2
                return 0
                ;;
        esac
    fi
}

cleanup_files() {
    if [ "$NEEDS_CLEANUP" = true ]; then
        echo -e "\n${YELLOW}Cleaning up...${RESET}"
        
        GO_FILE="${PROJECT_ROOT}/spider/main.go"
        GO_BACKUP="${PROJECT_ROOT}/spider/main_backup.go"
        if [ "$GO_BACKUP_EXISTS" = true ] && [ -f "$GO_BACKUP" ]; then
            rm -f "$GO_FILE" || echo -e "${RED}Failed to remove main.go${RESET}"
            mv "$GO_BACKUP" "$GO_FILE" || echo -e "${RED}Failed to restore main_backup.go to main.go${RESET}"
            echo -e "${GREEN}✓ Restored spider/main.go${RESET}"
            GO_BACKUP_EXISTS=false
        fi
        
        echo -e "${GREEN}✓ Cleanup completed${RESET}"
        NEEDS_CLEANUP=false
    else
        echo -e "${YELLOW}No cleanup needed${RESET}"
    fi
}

handle_interrupt() {
    echo -e "\n${YELLOW}Interrupted by user${RESET}"
    cd "${PROJECT_ROOT}"
    cleanup_files
    echo -e "${CYAN}Exiting...${RESET}"
    exit 130
}

trap 'handle_interrupt' INT TERM

show_menu() {
    echo -e "${WHITE}┌─ Main Menu ────────────────────────┐${RESET}"
    echo -e "${WHITE}│${RESET}                                    ${WHITE}│${RESET}"
    echo -e "${WHITE}│${RESET}  ${YELLOW}1${RESET} - Start Web Crawler            ${WHITE}│${RESET}"
    echo -e "${CYAN}│${RESET}  ${CYAN}2${RESET} - Check Services Status        ${WHITE}│${RESET}"
    echo -e "${GREEN}│${RESET}  ${GREEN}3${RESET} - Setup Environment Files     ${WHITE}│${RESET}"
    echo -e "${WHITE}│${RESET}  ${YELLOW}4${RESET} - Start All Services          ${WHITE}│${RESET}"
    echo -e "${RED}│${RESET}  ${RED}Q${RESET} - Quit                         ${WHITE}│${RESET}"
    echo -e "${WHITE}│${RESET}                                    ${WHITE}│${RESET}"
    echo -e "${WHITE}└────────────────────────────────────┘${RESET}"
    echo -e ""
    echo -ne "${CYAN}Select: ${RESET}"
}

setup_env_files() {
    clear
    draw_logo
    echo -e "${WHITE}┌─ Environment Setup ────────────────┐${RESET}"
    echo -e "${WHITE}│${RESET} Creating .env files...             ${WHITE}│${RESET}"
    echo -e "${WHITE}└────────────────────────────────────┘${RESET}"
    echo -e ""
    
    # Check for existing .env files
    existing_files=()
    if [ -f "${PROJECT_ROOT}/indexer-search/.env" ]; then
        existing_files+=("indexer-search/.env")
    fi
    if [ -f "${PROJECT_ROOT}/front-end/.env" ]; then
        existing_files+=("front-end/.env")
    fi
    if [ -f "${PROJECT_ROOT}/db/.env" ]; then
        existing_files+=("db/.env")
    fi
    if [ -f "${PROJECT_ROOT}/spider/.env" ]; then
        existing_files+=("spider/.env")
    fi
    if [ -f "${PROJECT_ROOT}/qdrant/.env" ]; then
        existing_files+=("qdrant/.env")
    fi
    
    # If existing files found, ask for confirmation
    if [ ${#existing_files[@]} -gt 0 ]; then
        echo -e "${YELLOW}Found existing .env files:${RESET}"
        for file in "${existing_files[@]}"; do
            echo -e "${YELLOW}  - ${file}${RESET}"
        done
        echo -e ""
        echo -e "${WHITE}This will overwrite existing .env files!${RESET}"
        echo -ne "${CYAN}Continue? [Y/n]: ${RESET}"
        read confirm
        
        case $confirm in
            [Nn]|[Nn][Oo])
                echo -e "${CYAN}Setup cancelled${RESET}"
                sleep 2
                return 1
                ;;
        esac
        echo -e ""
    fi
    
    # Default values that work together
    local DEFAULT_DB_HOST="localhost"
    local DEFAULT_DB_PORT="5432"
    local DEFAULT_DB_USER="froxy_user"
    local DEFAULT_DB_PASSWORD="froxy_password"
    local DEFAULT_DB_NAME="froxy_db"
    local DEFAULT_DB_SSLMODE="disable"
    local DEFAULT_QDRANT_API_KEY="froxy-qdrant-key-2024"
    local DEFAULT_EMBEDDING_HOST="http://localhost:5050"
    local DEFAULT_API_KEY="froxy-api-key-2024"
    local DEFAULT_QDRANT_HOST="localhost"
    
    # Create .env for indexer-search/
    echo -e "${CYAN}Creating indexer-search/.env...${RESET}"
    if [ ! -d "${PROJECT_ROOT}/indexer-search" ]; then
        echo -e "${RED}Warning: indexer-search directory not found${RESET}"
    else
        cat > "${PROJECT_ROOT}/indexer-search/.env" << EOF
DB_HOST=${DEFAULT_DB_HOST}
DB_PORT=${DEFAULT_DB_PORT}
DB_USER=${DEFAULT_DB_USER}
DB_PASSWORD=${DEFAULT_DB_PASSWORD}
DB_NAME=${DEFAULT_DB_NAME}
DB_SSLMODE=${DEFAULT_DB_SSLMODE}
QDRANT_API_KEY=${DEFAULT_QDRANT_API_KEY}
EMBEDDING_HOST=${DEFAULT_EMBEDDING_HOST}
API_KEY=${DEFAULT_API_KEY}
QDRANT_HOST=${DEFAULT_QDRANT_HOST}
PORT=8080
EOF
        echo -e "${GREEN}✓ Created indexer-search/.env${RESET}"
    fi
    
    # Create .env for front-end/
    echo -e "${CYAN}Creating front-end/.env...${RESET}"
    if [ ! -d "${PROJECT_ROOT}/front-end" ]; then
        echo -e "${RED}Warning: front-end directory not found${RESET}"
    else
        cat > "${PROJECT_ROOT}/front-end/.env" << EOF
API_URL=http://localhost:8080
API_KEY=${DEFAULT_API_KEY}
EOF
        echo -e "${GREEN}✓ Created front-end/.env${RESET}"
    fi
    
    # Create .env for db/
    echo -e "${CYAN}Creating db/.env...${RESET}"
    if [ ! -d "${PROJECT_ROOT}/db" ]; then
        echo -e "${RED}Warning: db directory not found${RESET}"
    else
        cat > "${PROJECT_ROOT}/db/.env" << EOF
POSTGRES_DB=${DEFAULT_DB_NAME}
POSTGRES_USER=${DEFAULT_DB_USER}
POSTGRES_PASSWORD=${DEFAULT_DB_PASSWORD}
DB_NAME=${DEFAULT_DB_NAME}
DB_SSLMODE=${DEFAULT_DB_SSLMODE}
EOF
        echo -e "${GREEN}✓ Created db/.env${RESET}"
    fi
    
    # Create .env for spider/
    echo -e "${CYAN}Creating spider/.env...${RESET}"
    if [ ! -d "${PROJECT_ROOT}/spider" ]; then
        echo -e "${RED}Warning: spider directory not found${RESET}"
    else
        cat > "${PROJECT_ROOT}/spider/.env" << EOF
DB_HOST=${DEFAULT_DB_HOST}
DB_PORT=${DEFAULT_DB_PORT}
DB_USER=${DEFAULT_DB_USER}
DB_PASSWORD=${DEFAULT_DB_PASSWORD}
DB_NAME=${DEFAULT_DB_NAME}
DB_SSLMODE=${DEFAULT_DB_SSLMODE}
QDRANT_API_KEY=${DEFAULT_QDRANT_API_KEY}
EMBEDDING_HOST=${DEFAULT_EMBEDDING_HOST}
QDRANT_HOST=${DEFAULT_QDRANT_HOST}
EOF
        echo -e "${GREEN}✓ Created spider/.env${RESET}"
    fi
    
    # Create .env for qdrant/
    echo -e "${CYAN}Creating qdrant/.env...${RESET}"
    if [ ! -d "${PROJECT_ROOT}/qdrant" ]; then
        echo -e "${RED}Warning: qdrant directory not found${RESET}"
    else
        cat > "${PROJECT_ROOT}/qdrant/.env" << EOF
QDRANT_API_KEY=${DEFAULT_QDRANT_API_KEY}
EOF
        echo -e "${GREEN}✓ Created qdrant/.env${RESET}"
    fi
    
    echo -e ""
    echo -e "${GREEN}Environment files created successfully!${RESET}"
    echo -e "${CYAN}All services are configured to work together with default values.${RESET}"
    echo -e ""
    echo -e "${CYAN}Press any key to continue...${RESET}"
    read -n 1
    clear
    return 0
}

start_crawling() {
    clear
    draw_logo
    
    # Validate environment files before proceeding
    if ! validate_env_files; then
        echo -e "${RED}Environment validation failed. Please configure .env files properly.${RESET}"
        echo -e "${CYAN}Press any key to return to menu...${RESET}"
        read -n 1
        clear
        return
    fi
    
    prompt_services_setup
    
    clear
    draw_logo
    echo -e "${WHITE}┌─ Web Crawler Configuration ────────┐${RESET}"
    echo -e "${WHITE}│${RESET} Enter URLs (one per line)          ${WHITE}│${RESET}"
    echo -e "${WHITE}│${RESET} Press ENTER on empty line to       ${WHITE}│${RESET}"
    echo -e "${WHITE}│${RESET} configure workers                  ${WHITE}│${RESET}"
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
    echo -e "${WHITE}┌─ Worker Configuration ─────────────┐${RESET}"
    echo -e "${WHITE}│${RESET} How many workers? (default: 5)     ${WHITE}│${RESET}"
    echo -e "${WHITE}└────────────────────────────────────┘${RESET}"
    echo -ne "${CYAN}Workers: ${RESET}"
    read workers

    # Set default workers if empty
    if [ -z "$workers" ]; then
        workers=5
    fi

    # Validate workers is a number
    if ! [[ "$workers" =~ ^[0-9]+$ ]]; then
        echo -e "${RED}Invalid number of workers, using default (5)${RESET}"
        workers=5
    fi

    echo -e ""
    echo -e "${GREEN}Starting crawler with $url_count URLs and $workers workers...${RESET}"

    cat > "${PROJECT_ROOT}/spider/main_temp.go" << EOF
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

	var crawlableSites = []string{
		$(echo -e "$url_list"),
	}

	crawler.Start(
		$workers, // the number of the worker
		crawlableSites...,
	)
}
EOF

    echo -e "${GREEN}Updating spider/main.go...${RESET}"
    GO_FILE="${PROJECT_ROOT}/spider/main.go"
    GO_BACKUP="${PROJECT_ROOT}/spider/main_backup.go"
    if [ -f "$GO_FILE" ]; then
        cp "$GO_FILE" "$GO_BACKUP" || {
            echo -e "${RED}Failed to back up main.go${RESET}"
            return 1
        }
        GO_BACKUP_EXISTS=true
        NEEDS_CLEANUP=true
        echo -e "${GREEN}✓ Backed up original main.go${RESET}"
    fi
    mv "${PROJECT_ROOT}/spider/main_temp.go" "$GO_FILE" || {
        echo -e "${RED}Failed to update main.go${RESET}"
        return 1
    }

    echo -e "${GREEN}Running crawler...${RESET}"
    echo -e "${GRAY}──────────────────────────────${RESET}"
    cd "${PROJECT_ROOT}/spider"
    go run main.go &
    CRAWLER_PID=$!
    wait $CRAWLER_PID
    CRAWLER_EXIT_CODE=$?
    cd "${PROJECT_ROOT}"

    if [ $CRAWLER_EXIT_CODE -eq 0 ]; then
        echo -e ""
        echo -e "${GREEN}Crawling completed successfully!${RESET}"
    else
        echo -e ""
        echo -e "${RED}Crawling failed (exit code $CRAWLER_EXIT_CODE)${RESET}"
    fi
    
    echo -e "${CYAN}Press any key...${RESET}"
    read -n 1
    clear
    
    cleanup_files
}

check_services_menu() {
    clear
    draw_logo
    
    echo -e "${WHITE}┌─ Services Status ──────────────────┐${RESET}"
    echo -e "${WHITE}│${RESET}                                    ${WHITE}│${RESET}"
    
    local postgres_running=false
    local qdrant_running=false 
    local fastembed_running=false
    
    if check_service_status "PostgreSQL" "froxy_pgsql\|postgres"; then
        postgres_running=true
        echo -e "${WHITE}│${RESET} PostgreSQL: ${GREEN}Running${RESET}             ${WHITE}│${RESET}"
    else
        echo -e "${WHITE}│${RESET} PostgreSQL: ${RED}Stopped${RESET}             ${WHITE}│${RESET}"
    fi
    
    if check_service_status "Qdrant" "qdrant"; then
        qdrant_running=true
        echo -e "${WHITE}│${RESET} Qdrant: ${GREEN}Running${RESET}                 ${WHITE}│${RESET}"
    else
        echo -e "${WHITE}│${RESET} Qdrant: ${RED}Stopped${RESET}                 ${WHITE}│${RESET}"
    fi
    
    if check_service_status "FastEmbed" "embedding-service\|fastembed"; then
        fastembed_running=true
        echo -e "${WHITE}│${RESET} FastEmbed: ${GREEN}Running${RESET}              ${WHITE}│${RESET}"
    else
        echo -e "${WHITE}│${RESET} FastEmbed: ${RED}Stopped${RESET}              ${WHITE}│${RESET}"
    fi
    
    echo -e "${WHITE}│${RESET}                                    ${WHITE}│${RESET}"
    
    if [ "$postgres_running" = true ] && [ "$qdrant_running" = true ] && [ "$fastembed_running" = true ]; then
        echo -e "${WHITE}│${RESET} ${GREEN}All services are running!${RESET}       ${WHITE}│${RESET}"
    else
        echo -e "${WHITE}│${RESET} ${YELLOW}Some services need attention${RESET}    ${WHITE}│${RESET}"
        echo -e "${WHITE}│${RESET}                                    ${WHITE}│${RESET}"
        echo -e "${WHITE}│${RESET} Start missing services? ${GREEN}[Y]${RESET}/${RED}[N]${RESET}      ${WHITE}│${RESET}"
    fi
    
    echo -e "${WHITE}└────────────────────────────────────┘${RESET}"
    echo -e ""
    
    if [ "$postgres_running" != true ] || [ "$qdrant_running" != true ] || [ "$fastembed_running" != true ]; then
        echo -ne "${CYAN}Choice: ${RESET}"
        read services_choice
        
        case $services_choice in
            [Yy]|[Yy][Ee][Ss]|"")
                echo -e ""
                start_services
                ;;
            [Nn]|[Nn][Oo])
                echo -e ""
                echo -e "${CYAN}Services remain as they are${RESET}"
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

start_all_services_menu() {
    clear
    draw_logo
    
    echo -e "${WHITE}┌─ Start All Services ───────────────┐${RESET}"
    echo -e "${WHITE}│${RESET} This will start:                   ${WHITE}│${RESET}"
    echo -e "${WHITE}│${RESET}  - PostgreSQL Database             ${WHITE}│${RESET}"
    echo -e "${WHITE}│${RESET}  - Qdrant Vector Database          ${WHITE}│${RESET}"
    echo -e "${WHITE}│${RESET}  - FastEmbed Service                ${WHITE}│${RESET}"
    echo -e "${WHITE}│${RESET}                                    ${WHITE}│${RESET}"
    echo -e "${WHITE}│${RESET} Continue? ${GREEN}[Y]${RESET}es / ${RED}[N]${RESET}o              ${WHITE}│${RESET}"
    echo -e "${WHITE}└────────────────────────────────────┘${RESET}"
    echo -ne "${CYAN}Choice: ${RESET}"
    read start_choice
    
    case $start_choice in
        [Yy]|[Yy][Ee][Ss]|"")
            echo -e ""
            if start_services; then
                echo -e "${GREEN}All services started successfully!${RESET}"
            else
                echo -e "${RED}Some services failed to start${RESET}"
            fi
            ;;
        [Nn]|[Nn][Oo])
            echo -e ""
            echo -e "${CYAN}Operation cancelled${RESET}"
            ;;
        *)
            echo -e ""
            echo -e "${YELLOW}Invalid choice${RESET}"
            ;;
    esac
    
    echo -e "${CYAN}Press any key...${RESET}"
    read -n 1
    clear
}

main() {
    clear
    
    # Check if running from correct directory
    if [ ! -f "froxy.sh" ]; then
        echo -e "${RED}Error: Please run this script from the project root directory${RESET}"
        echo -e "${CYAN}The directory should contain: db/, spider/, qdrant/, fastembed/, etc.${RESET}"
        exit 1
    fi
    
    while true; do
        draw_logo
        show_menu
        read choice
        
        case $choice in
            1)
                start_crawling
                ;;
            2)
                check_services_menu
                ;;
            3)
                setup_env_files
                ;;
            4)
                start_all_services_menu
                ;;
            [Qq]|[Qq][Uu][Ii][Tt])
                clear
                echo -e "${CYAN}Thanks for using FROXY!${RESET}"
                cleanup_files
                exit 0
                ;;
            *)
                echo -e ""
                echo -e "${RED}Invalid choice. Please try again.${RESET}"
                sleep 2
                clear
                ;;
        esac
    done
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed or not in PATH${RESET}"
    echo -e "${CYAN}Please install Docker first${RESET}"
    exit 1
fi

# Check if Docker is running, if not try to start it
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}Docker is not running, attempting to start...${RESET}"
    
    # Try different methods to start Docker based on the system
    if command -v systemctl &> /dev/null; then
        # SystemD systems (most Linux distributions)
        sudo systemctl start docker
        sleep 3
    elif command -v service &> /dev/null; then
        # SysV init systems
        sudo service docker start
        sleep 3
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open -a Docker
        echo -e "${CYAN}Starting Docker Desktop on macOS...${RESET}"
        echo -e "${CYAN}Please wait for Docker Desktop to start, then run the script again${RESET}"
        exit 1
    else
        echo -e "${RED}Could not start Docker automatically${RESET}"
        echo -e "${CYAN}Please start Docker manually and run the script again${RESET}"
        exit 1
    fi
    
    # Check again after attempting to start
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}Failed to start Docker${RESET}"
        echo -e "${CYAN}Please start Docker manually and run the script again${RESET}"
        exit 1
    else
        echo -e "${GREEN}✓ Docker started successfully${RESET}"
        sleep 2
    fi
fi

# Start main function
main