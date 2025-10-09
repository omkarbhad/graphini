# Chatbox with OpenRouter & Mermaid Integration

This chatbox uses OpenRouter API to connect to various AI models and automatically generates Mermaid diagrams.

## Setup Instructions

### 1. Get OpenRouter API Key

1. Visit [OpenRouter](https://openrouter.ai/keys)
2. Sign up or log in
3. Create a new API key
4. Copy the API key

### 2. Configure Environment Variables

1. Open `.env.local` file in the root directory
2. Add your OpenRouter API key:

```env
OPENROUTER_API_KEY=your_actual_api_key_here
```

### 3. Start the Development Server

```bash
npm run dev
```

## Features

### Available Models

The chatbox supports multiple AI models through OpenRouter:

**Free Models:**
- Llama 3.1 8B (Default)
- Gemini 2.0 Flash
- Mistral 7B

**Paid Models:**
- GPT-4o
- GPT-3.5 Turbo
- Claude 3.5 Sonnet
- Gemini Pro 1.5

### Mermaid Diagram Support

The assistant automatically generates Mermaid diagrams when you ask for visualizations. You can request:

- **Flowcharts**: "Create a flowchart for user authentication"
- **Sequence Diagrams**: "Show me a sequence diagram for API calls"
- **Class Diagrams**: "Create a class diagram for e-commerce system"
- **State Diagrams**: "Visualize a state machine"
- **ER Diagrams**: "Design a database schema"
- **Gantt Charts**: "Generate a Gantt chart for project timeline"

### Example Prompts

- "Create a flowchart showing the login process"
- "Explain React hooks with a diagram"
- "Show me how OAuth works with a sequence diagram"
- "Design a class diagram for a blog system"
- "Create a state diagram for order processing"

## How It Works

1. **User Input**: Type your question or request in the chat input
2. **API Call**: The message is sent to OpenRouter API with the selected model
3. **Streaming Response**: The AI response streams back in real-time
4. **Mermaid Rendering**: Any Mermaid code blocks are automatically rendered as diagrams

## Technical Details

- **Frontend**: Next.js 14 with React
- **UI Components**: Vercel AI Elements
- **API**: OpenRouter (supports 100+ AI models)
- **Diagrams**: Mermaid.js
- **Styling**: Tailwind CSS

## Troubleshooting

### API Key Issues

If you see "OpenRouter API key not configured":
1. Check that `.env.local` exists
2. Verify the API key is correct
3. Restart the development server

### Diagram Not Rendering

If Mermaid diagrams don't render:
1. Check browser console for errors
2. Ensure the diagram syntax is correct
3. Try refreshing the page

## API Costs

- Free models have no cost but may have rate limits
- Paid models charge per token usage
- Check [OpenRouter pricing](https://openrouter.ai/docs#models) for details
