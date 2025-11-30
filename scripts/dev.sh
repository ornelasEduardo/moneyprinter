#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Starting Docker services...${NC}"
docker-compose up -d

echo -e "${BLUE}⏳ Waiting for database to initialize...${NC}"
sleep 3

echo -e "${BLUE}🔄 Running database migrations...${NC}"
node scripts/init-db.js

echo -e "${GREEN}🚀 Starting Next.js development server...${NC}"
npm run dev
