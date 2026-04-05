# OpenRouter Chat Server Setup

This chat server provides integration with OpenRouter models for the `chat.simple.svelte` component.

## Setup Instructions

### 1. Environment Configuration

Add your OpenRouter API key to your `.env` file:

```bash
# OpenRouter API Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

To get an API key:

1. Sign up at [OpenRouter.ai](https://openrouter.ai)
2. Navigate to your API keys section
3. Create a new API key
4. Copy the key to your `.env` file

### 2. Available Models

The server includes these popular OpenRouter models:

- **Claude 3.5 Sonnet** (`openrouter:anthropic/claude-3.5-sonnet`) - Advanced reasoning and analysis
- **GPT-4o** (`openrouter:openai/gpt-4o`) - Multimodal model with vision capabilities
- **GPT-4o Mini** (`openrouter:openai/gpt-4o-mini`) - Fast and efficient for simple tasks
- **Llama 3.1 405B** (`openrouter:meta-llama/llama-3.1-405b-instruct`) - Open source with strong performance
- **Gemini Pro 1.5** (`openrouter:google/gemini-pro-1.5`) - Large context window for complex tasks

### 3. Usage

The chat server provides two endpoints:

#### GET `/api/chat` - List Available Models

Returns a list of all configured OpenRouter models with their metadata.

#### POST `/api/chat` - Send Chat Message

Send a message to the selected model and receive a streaming response.

**Request Body:**

```json
{
  "message": "Your message here",
  "model": "openrouter:anthropic/claude-3.5-sonnet"
}
```

**Response Format:**
The server uses Server-Sent Events (SSE) for streaming responses:

```javascript
// Content chunk
data: {"type":"content","content":"Hello","delta":{"content":"Hello"}}

// Final message
data: {"type":"done","message":"Hello! How can I help you?","content":"Hello! How can I help you?"}
```

### 4. Features

- **Streaming Responses**: Real-time message streaming using SSE
- **Model Selection**: Choose from various OpenRouter models
- **Error Handling**: Graceful error handling with user-friendly messages
- **CORS Support**: Cross-origin requests enabled
- **Type Safety**: Full TypeScript support

### 5. Integration with Chat.simple.svelte

The `chat.simple.svelte` component automatically integrates with this server:

1. **Model Loading**: Fetches available models from the GET endpoint
2. **Message Sending**: Sends messages to the POST endpoint
3. **Stream Processing**: Processes SSE responses for real-time chat
4. **Error Display**: Shows error messages when API calls fail

### 6. Development

To run the development server:

```bash
pnpm dev
```

The chat server will be available at `http://localhost:5173/api/chat`.

### 7. Troubleshooting

#### Common Issues:

1. **"Invalid model selected" error**

   - Check that the model ID matches one of the available models
   - Verify the model ID format: `openrouter:provider/model-name`

2. **"Message and model are required" error**

   - Ensure both `message` and `model` fields are in the request body

3. **API key errors**

   - Verify your OpenRouter API key is correctly set in `.env`
   - Check that the API key has sufficient credits

4. **Streaming issues**
   - Ensure the client handles SSE events correctly
   - Check network connectivity to OpenRouter

#### Debug Mode:

Add logging to see detailed API interactions:

```javascript
console.log('Sending message:', message);
console.log('Using model:', model);
```

### 8. Cost Management

OpenRouter charges per token. Monitor your usage:

- Each model has different pricing (see model descriptions)
- Set up usage alerts in your OpenRouter dashboard
- Consider using cheaper models (like GPT-4o Mini) for simple tasks

### 9. Security Notes

- Keep your API key secure and never commit it to version control
- The server includes CORS headers for web usage
- Consider implementing rate limiting for production use
- Monitor your OpenRouter usage for unusual activity
