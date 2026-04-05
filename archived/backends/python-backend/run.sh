#!/bin/bash

# Run script for Python Backend
echo "🚀 Starting Mermaid Diagram Generator Backend..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run ./setup.sh first"
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please run ./setup.sh first"
    exit 1
fi

# Check if API key is set
if grep -q "your_openai_key_here" .env; then
    echo "⚠️  Warning: No OpenAI API key configured in .env file"
    echo "   Please edit .env and add your OPENAI_API_KEY"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Run the server with performance optimizations
echo "✅ Starting server on http://${HOST:-0.0.0.0}:${PORT:-8000}"
echo "   Press Ctrl+C to stop"
echo ""
echo "📊 Performance mode: Using optimized settings"
echo "   - Async workers for better concurrency"
echo "   - Streaming enabled for real-time responses"
echo ""

# Use multiple workers for production, single worker for development
if [ "${PRODUCTION:-false}" = "true" ]; then
    WORKERS=${WORKERS:-4}
    echo "🚀 Production mode: Starting with ${WORKERS} workers"
    python -m uvicorn main:app --workers ${WORKERS} --host ${HOST:-0.0.0.0} --port ${PORT:-8000} --access-log
else
    echo "🔧 Development mode: Single worker with auto-reload"
    python -m uvicorn main:app --reload --host ${HOST:-0.0.0.0} --port ${PORT:-8000}
fi

