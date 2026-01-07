#!/bin/bash
# GeoElevate - Development Environment Setup Script
# This script sets up and starts the development environment

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "=============================================="
echo "       GeoElevate Development Setup          "
echo "=============================================="
echo -e "${NC}"

# Check Node.js version
echo -e "${YELLOW}Checking Node.js version...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 18+ and try again.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Node.js version 18+ is required. Current version: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}Node.js $(node -v) detected${NC}"

# Check npm
echo -e "${YELLOW}Checking npm...${NC}"
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed. Please install npm and try again.${NC}"
    exit 1
fi
echo -e "${GREEN}npm $(npm -v) detected${NC}"

# Function to setup backend
setup_backend() {
    echo -e "\n${CYAN}Setting up Backend...${NC}"

    if [ ! -d "backend" ]; then
        echo -e "${YELLOW}Creating backend directory...${NC}"
        mkdir -p backend
    fi

    cd backend

    if [ ! -f "package.json" ]; then
        echo -e "${YELLOW}Initializing backend package.json...${NC}"
        npm init -y

        echo -e "${YELLOW}Installing backend dependencies...${NC}"
        npm install express better-sqlite3 jsonwebtoken bcryptjs cookie-parser cors dotenv ws uuid
        npm install --save-dev nodemon

        # Update package.json scripts
        npm pkg set scripts.start="node src/index.js"
        npm pkg set scripts.dev="nodemon src/index.js"
    else
        echo -e "${YELLOW}Installing backend dependencies...${NC}"
        npm install
    fi

    # Create directory structure if it doesn't exist
    mkdir -p src/{routes,middleware,models,services,utils}
    mkdir -p data

    cd ..
    echo -e "${GREEN}Backend setup complete!${NC}"
}

# Function to setup frontend
setup_frontend() {
    echo -e "\n${CYAN}Setting up Frontend...${NC}"

    if [ ! -d "frontend" ]; then
        echo -e "${YELLOW}Creating frontend with Vite...${NC}"
        npm create vite@latest frontend -- --template react
    fi

    cd frontend

    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
    npm install react-router-dom

    cd ..
    echo -e "${GREEN}Frontend setup complete!${NC}"
}

# Function to create .env file if it doesn't exist
setup_env() {
    echo -e "\n${CYAN}Setting up environment variables...${NC}"

    if [ ! -f "backend/.env" ]; then
        echo -e "${YELLOW}Creating backend .env file...${NC}"
        cat > backend/.env << 'EOF'
# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Database
DATABASE_PATH=./data/geoelevate.db

# CORS
FRONTEND_URL=http://localhost:5173

# WebSocket
WS_PORT=3002
EOF
        echo -e "${GREEN}Backend .env created. ${RED}Remember to update secrets for production!${NC}"
    else
        echo -e "${GREEN}.env file already exists${NC}"
    fi
}

# Function to start development servers
start_dev() {
    echo -e "\n${CYAN}Starting development servers...${NC}"
    echo -e "${YELLOW}This will start both frontend and backend servers${NC}"

    # Check if concurrently is available globally or install it
    if ! command -v concurrently &> /dev/null; then
        echo -e "${YELLOW}Installing concurrently for running multiple servers...${NC}"
        npm install -g concurrently
    fi

    echo -e "\n${GREEN}=============================================="
    echo "Starting GeoElevate Development Environment"
    echo "=============================================="
    echo -e "${NC}"
    echo -e "${CYAN}Frontend:${NC} http://localhost:5173"
    echo -e "${CYAN}Backend API:${NC} http://localhost:3001"
    echo -e "${CYAN}WebSocket:${NC} ws://localhost:3002"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
    echo ""

    concurrently \
        --names "BACKEND,FRONTEND" \
        --prefix-colors "cyan,magenta" \
        "cd backend && npm run dev" \
        "cd frontend && npm run dev"
}

# Main execution
main() {
    # Check if this is a fresh setup or existing project
    if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
        echo -e "${YELLOW}First time setup detected. Setting up project...${NC}"
        setup_backend
        setup_frontend
        setup_env
    else
        echo -e "${GREEN}Existing project detected. Checking dependencies...${NC}"

        # Install dependencies if node_modules is missing
        if [ ! -d "backend/node_modules" ]; then
            cd backend && npm install && cd ..
        fi
        if [ ! -d "frontend/node_modules" ]; then
            cd frontend && npm install && cd ..
        fi
    fi

    # Start development servers
    start_dev
}

# Parse command line arguments
case "${1:-}" in
    --setup-only)
        setup_backend
        setup_frontend
        setup_env
        echo -e "\n${GREEN}Setup complete! Run './init.sh' to start the development servers.${NC}"
        ;;
    --backend-only)
        cd backend && npm run dev
        ;;
    --frontend-only)
        cd frontend && npm run dev
        ;;
    --help|-h)
        echo "GeoElevate Development Environment Setup"
        echo ""
        echo "Usage: ./init.sh [option]"
        echo ""
        echo "Options:"
        echo "  (no option)      Setup and start both servers"
        echo "  --setup-only     Only setup, don't start servers"
        echo "  --backend-only   Start only the backend server"
        echo "  --frontend-only  Start only the frontend server"
        echo "  --help, -h       Show this help message"
        ;;
    *)
        main
        ;;
esac
