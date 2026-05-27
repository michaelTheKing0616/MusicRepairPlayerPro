#!/bin/bash
# Development startup script for Linux/Mac

set -e

echo "========================================"
echo "MusicRepairApp Backend - Development Mode"
echo "========================================"
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Check if dependencies are installed
if [ ! -d "venv/lib/python*/site-packages/fastapi" ]; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo ""
    echo "WARNING: Please edit .env with your configuration!"
    read -p "Press enter to continue..."
fi

# Check if database needs migration
echo ""
echo "Checking database migrations..."
alembic upgrade head

# Seed database
echo ""
echo "Seeding test users..."
python scripts/seed_db.py

echo ""
echo "========================================"
echo "Starting API server..."
echo "========================================"
echo ""
echo "API will be available at: http://localhost:8000"
echo "API docs at: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
echo "Test credentials:"
echo "  Admin: admin@test.com / admin123"
echo "  User: user@test.com / user123"
echo "  Premium: premium@test.com / premium123"
echo ""
echo "========================================"
echo ""

# Start the server
uvicorn app.main:app --reload

