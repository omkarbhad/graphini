# C++ Backend for Mermaid Diagram Generation

This is a C++ implementation of the Python FastAPI backend for generating Mermaid diagrams using AI models.

## Features

- ✅ Diagram generation (non-streaming and streaming)
- ✅ Error analysis
- ✅ Code repair
- ✅ Health check endpoint
- ✅ Chat/conversation endpoints (with database support)
- ✅ Rate limiting
- ✅ OpenAI and OpenRouter support

## Dependencies

This backend requires:

- **C++17** or later
- **CMake 3.15+**
- **libcurl** - For HTTP client requests
- **OpenSSL** - For HTTPS support
- **Threads** - For multi-threading support

Optional (for production):

- **httplib** or similar - For HTTP server (currently using a template)
- **nlohmann/json** - For proper JSON parsing (currently using simplified parsing)

## Building

### Prerequisites

Install dependencies:

```bash
# Ubuntu/Debian
sudo apt-get install build-essential cmake libcurl4-openssl-dev libssl-dev

# macOS
brew install cmake curl openssl

# Or use vcpkg
vcpkg install curl openssl
```

### Build Steps

```bash
cd cpp-backend
mkdir build
cd build
cmake ..
make
```

## Configuration

Create a `.env` file in the `cpp-backend` directory:

```env
# OpenRouter Configuration (Recommended for free models)
OPEN_ROUTER_KEY=your_openrouter_key_here
OPEN_ROUTER_MODEL=z-ai/glm-4.5-air:free
OPEN_ROUTER_HTTP_REFERER=https://mermaid.live
OPEN_ROUTER_TITLE=Mermaid Live Editor

# Or OpenAI Direct
OPENAI_API_KEY=your_openai_key_here
OPENAI_MODEL=gpt-5-mini

# Database Configuration (Optional)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Server Configuration
HOST=0.0.0.0
PORT=8000

# Model Configuration
MODEL_MAX_TOKENS=32000
```

## Running

```bash
./build/mermaid_backend
```

## API Endpoints

All endpoints match the Python backend:

### Diagram Endpoints

- `GET /health` - Health check
- `POST /generate` - Generate diagram (non-streaming)
- `POST /generate/stream` - Generate diagram with streaming
- `POST /analyze-error` - Analyze error
- `POST /repair` - Repair code

### Chat Endpoints

- `GET /chat/conversations` - List conversations
- `POST /chat/conversations` - Create conversation
- `GET /chat/conversations/{id}` - Get conversation
- `PATCH /chat/conversations/{id}` - Update conversation
- `DELETE /chat/conversations/{id}` - Delete conversation
- `GET /chat/conversations/{id}/messages` - List messages
- `POST /chat/conversations/{id}/messages` - Create message
- `GET /chat/snapshots` - List snapshots
- `POST /chat/snapshots` - Create snapshot
- `GET /chat/snapshots/{id}` - Get snapshot
- `DELETE /chat/snapshots/{id}` - Delete snapshot

## Current Status

⚠️ **Note**: This is a template implementation. The main server uses a simplified structure. To use in production:

1. **Integrate HTTP Server Library**: Replace the template with httplib or Drogon:

   ```cpp
   #include <httplib.h>
   httplib::Server svr;
   svr.Get("/health", [&server](const httplib::Request& req, httplib::Response& res) {
       res.set_content(server.handle_health(), "application/json");
   });
   svr.listen("0.0.0.0", 8000);
   ```

2. **Use Proper JSON Library**: Replace simplified JSON parsing with nlohmann/json:

   ```cpp
   #include <nlohmann/json.hpp>
   auto json = nlohmann::json::parse(request_body);
   std::string prompt = json["prompt"];
   ```

3. **Implement Streaming**: Add proper Server-Sent Events (SSE) support for `/generate/stream`

4. **Add CORS Support**: Configure CORS headers for cross-origin requests

5. **Add Logging**: Integrate a logging library (spdlog, etc.)

6. **Error Handling**: Enhance error handling and validation

## Architecture

```
cpp-backend/
├── CMakeLists.txt          # Build configuration
├── README.md               # This file
├── include/
│   ├── ai_client.h         # AI client interface
│   ├── db_client.h         # Database client interface
│   ├── utils.h            # Utility functions
│   └── rate_limiter.h      # Rate limiting
├── src/
│   ├── main.cpp            # Main server (HTTP server integration needed)
│   ├── ai_client.cpp       # AI client implementation
│   ├── db_client.cpp       # Database client implementation
│   ├── utils.cpp           # Utility implementations
│   └── rate_limiter.cpp     # Rate limiter implementation
└── third_party/            # Third-party dependencies (optional)
```

## Performance

C++ backend advantages:

- Lower memory footprint
- Faster execution for CPU-bound tasks
- Better for high-concurrency scenarios

However, for this use case (AI API proxy), the bottleneck is network latency to AI APIs, so performance gains may be minimal compared to Python.

## Comparison with Python Backend

| Feature           | Python     | C++        |
| ----------------- | ---------- | ---------- |
| Development Speed | ⭐⭐⭐⭐⭐ | ⭐⭐⭐     |
| AI SDK Support    | ⭐⭐⭐⭐⭐ | ⭐⭐⭐     |
| Performance       | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ |
| Memory Usage      | ⭐⭐⭐     | ⭐⭐⭐⭐⭐ |
| Ecosystem         | ⭐⭐⭐⭐⭐ | ⭐⭐⭐     |

## License

Same as the main project.
