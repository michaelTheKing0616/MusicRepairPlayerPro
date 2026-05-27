#!/bin/bash
# Setup script for backend development environment

set -e

echo "🚀 Setting up MusicRepairApp Backend..."

# Check Python version
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "📦 Python version: $python_version"

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "📦 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Copy environment file
if [ ! -f ".env" ]; then
    echo "📝 Copying .env.example to .env..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your configuration!"
fi

# Initialize Alembic
if [ ! -d "alembic/versions" ]; then
    echo "📦 Initializing Alembic migrations..."
    alembic init alembic || echo "Alembic already initialized"
fi

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your database and storage configuration"
echo "2. Start PostgreSQL, Redis, and MinIO"
echo "3. Run: alembic upgrade head  (to create database tables)"
echo "4. Run: uvicorn app.main:app --reload  (to start API server)"
echo "5. Run: celery -A app.tasks.celery_app worker --loglevel=info  (in another terminal)"


