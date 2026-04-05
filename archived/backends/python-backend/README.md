# Python Backend for Mermaid Diagram Generation

This Python backend service generates large and complex Mermaid diagrams using OpenAI models (default gpt-5-mini).

## Quick Setup

### Option 1: Automated Setup (Recommended)

```bash
cd python-backend
chmod +x setup.sh run.sh
./setup.sh
```

Then edit `.env` file and add your OpenAI API key, then run:

```bash
./run.sh
```

### Option 2: Manual Setup

1. **Install dependencies:**

   ```bash
   cd python-backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Create `.env` file:**

   ```env
   OPENAI_API_KEY=your_openai_key_here
   OPENAI_MODEL=gpt-5-mini
   HOST=0.0.0.0
   PORT=8000
   ```

3. **Run the server:**
   ```bash
   python -m uvicorn main:app --reload --port 8000
   ```

## Configuration

### Environment Variables

Create a `.env` file in the `python-backend` directory:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_key_here

# Model Configuration (Optional, defaults to gpt-5-mini)
OPENAI_MODEL=gpt-5-mini

# Server Configuration (Optional)
HOST=0.0.0.0
PORT=8000
```

### Frontend Configuration

Add to your main project `.env` file:

```env
PYTHON_BACKEND_URL=http://localhost:8000
```

## API Endpoints

### POST `/generate`

Generate a Mermaid diagram from a prompt.

**Request Body:**

```json
{
  "prompt": "Create a complex system architecture diagram",
  "diagram_type": "flowchart",
  "complexity": "large",
  "options": {}
}
```

**Response:**

```json
{
  "mermaid_code": "graph TD\n    A[Start] --> B[Process]...",
  "diagram_type": "flowchart",
  "complexity": "large",
  "generation_time": 12.5,
  "metadata": {
    "node_count": 45,
    "edge_count": 67,
    "subgraph_count": 3,
    "model_used": "gpt-5-mini"
  }
}
```

### GET `/health`

Health check endpoint.

**Response:**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "service": "mermaid-diagram-generator",
  "openai_configured": true,
  "model": "gpt-5-mini",
  "openai_connection": "ok"
}
```

## Complexity Levels

- **simple**: 5-10 nodes
- **medium**: 15-30 nodes (default)
- **complex**: 30-60 nodes with subgraphs
- **large**: 60+ nodes with extensive subgraphs

## Supported Diagram Types

- flowchart / graph
- sequenceDiagram
- classDiagram
- stateDiagram
- erDiagram
- gantt
- pie
- journey
- mindmap
- timeline
- quadrantChart
- gitGraph

## Development

### Running in Development Mode

```bash
source venv/bin/activate
python -m uvicorn main:app --reload --port 8000
```

### Testing the API

```bash
# Health check
curl http://localhost:8000/health

# Generate diagram
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a simple login flow",
    "diagram_type": "flowchart",
    "complexity": "simple"
  }'
```

## Troubleshooting

1. **OpenAI API key not working:**

   - Verify your API key is correct in `.env`
   - Check that you have credits/quota available
   - Ensure the model name is correct (default: `gpt-5-mini`)

2. **Server won't start:**

   - Make sure port 8000 is not in use
   - Check that all dependencies are installed
   - Verify virtual environment is activated

3. **Connection refused:**
   - Ensure the Python backend is running
   - Check that `PYTHON_BACKEND_URL` in frontend `.env` matches the backend URL

## Integration with Frontend

The frontend expects the Python backend to be available at the URL specified in `PYTHON_BACKEND_URL` environment variable (default: `http://localhost:8000`).

Use the client utility in your frontend:

```typescript
import { generateDiagram } from '$lib/util/diagramGenerator';

const result = await generateDiagram({
  prompt: 'Create a complex system architecture',
  diagramType: 'flowchart',
  complexity: 'large'
});

console.log(result.mermaid_code);
```
