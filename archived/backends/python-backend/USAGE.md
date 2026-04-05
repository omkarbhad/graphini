# How to Use the Python Backend

## Step 1: Start the Backend Server

### Option A: Using the run script (Recommended)

```bash
cd python-backend
./run.sh
```

### Option B: Manual start

```bash
cd python-backend
source venv/bin/activate
python -m uvicorn main:app --reload --port 8000
```

The server will start at `http://localhost:8000`

## Step 2: Configure Frontend (Optional)

Add to your main project `.env` file:

```env
PYTHON_BACKEND_URL=http://localhost:8000
```

## Step 3: Use in Frontend Code

### Basic Usage Example

```typescript
import { generateDiagram } from '$lib/util/diagramGenerator';
import { updateCode } from '$lib/util/state';

// Generate a simple diagram
async function createSimpleDiagram() {
  try {
    const result = await generateDiagram({
      prompt: 'Create a login flow with validation',
      diagramType: 'flowchart',
      complexity: 'simple'
    });

    // Update the editor with generated code
    updateCode(result.mermaid_code, { updateDiagram: true });

    console.log('Generation time:', result.generation_time);
    console.log('Metadata:', result.metadata);
  } catch (error) {
    console.error('Failed to generate diagram:', error);
  }
}

// Generate a large, complex diagram
async function createComplexDiagram() {
  try {
    const result = await generateDiagram({
      prompt:
        'Create a comprehensive system architecture with microservices, databases, and API gateways',
      diagramType: 'flowchart',
      complexity: 'large'
    });

    updateCode(result.mermaid_code, { updateDiagram: true });
  } catch (error) {
    console.error('Failed to generate diagram:', error);
  }
}
```

### Check Backend Health

```typescript
import { checkBackendHealth } from '$lib/util/diagramGenerator';

async function checkHealth() {
  const isAvailable = await checkBackendHealth();
  if (isAvailable) {
    console.log('Python backend is available!');
  } else {
    console.log('Python backend is not available');
  }
}
```

## Step 4: Direct API Usage

### Using curl

```bash
# Health check
curl http://localhost:8000/health

# Generate a diagram
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create a simple login flow",
    "diagram_type": "flowchart",
    "complexity": "simple"
  }'
```

### Using JavaScript fetch

```javascript
const response = await fetch('/api/diagram/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'Create a user registration flow',
    diagramType: 'flowchart',
    complexity: 'medium'
  })
});

const result = await response.json();
console.log(result.mermaid_code);
```

## Complexity Levels

- **simple**: 5-10 nodes - Quick diagrams
- **medium**: 15-30 nodes - Standard diagrams (default)
- **complex**: 30-60 nodes - Detailed diagrams with subgraphs
- **large**: 60+ nodes - Very large diagrams with extensive subgraphs

## Supported Diagram Types

- `flowchart` / `graph` - Flowcharts and graphs
- `sequence` - Sequence diagrams
- `class` - Class diagrams
- `state` - State diagrams
- `er` - Entity relationship diagrams
- `gantt` - Gantt charts
- `pie` - Pie charts
- `journey` - User journey diagrams
- `mindmap` - Mind maps

## Example Prompts

### Simple Flowchart

```typescript
await generateDiagram({
  prompt: 'Create a login flow with username, password, and validation',
  diagramType: 'flowchart',
  complexity: 'simple'
});
```

### Complex System Architecture

```typescript
await generateDiagram({
  prompt:
    'Create a microservices architecture with API gateway, authentication service, user service, and database layers',
  diagramType: 'flowchart',
  complexity: 'large'
});
```

### Sequence Diagram

```typescript
await generateDiagram({
  prompt: 'Show a user registration sequence with frontend, backend, database, and email service',
  diagramType: 'sequence',
  complexity: 'medium'
});
```

## Troubleshooting

1. **Backend not responding**:

   - Check if server is running: `curl http://localhost:8000/health`
   - Verify `.env` file has correct `OPENAI_API_KEY`

2. **Frontend can't connect**:

   - Check `PYTHON_BACKEND_URL` in frontend `.env`
   - Ensure backend is running on the correct port

3. **API errors**:
   - Check OpenAI API key is valid
   - Verify you have credits/quota available
   - Check model name is correct (default: `gpt-5-mini`)
