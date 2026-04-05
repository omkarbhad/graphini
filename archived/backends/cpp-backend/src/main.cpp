#include <iostream>
#include <string>
#include <map>
#include <cstdlib>
#include <memory>
#include <sstream>
#include <fstream>
#include "ai_client.h"
#include "db_client.h"
#include "rate_limiter.h"
#include "utils.h"
#include "../third_party/httplib.h"

// Note: This is a simplified example. In production:
// 1. Use httplib or Drogon for HTTP server
// 2. Use nlohmann/json for proper JSON parsing
// 3. Use proper error handling and logging
// 4. Implement proper streaming for /generate/stream endpoint

class Server {
public:
    Server() : rate_limiter_(60000, 10) {
        // Load environment variables
        load_env();
        
        // Initialize AI client
        ai_client::Config ai_config;
        ai_config.api_key = get_env("OPEN_ROUTER_KEY", get_env("OPENAI_API_KEY", ""));
        ai_config.model = get_env("OPEN_ROUTER_MODEL", get_env("OPENAI_MODEL", "gpt-5-mini"));
        ai_config.use_openrouter = !get_env("OPEN_ROUTER_KEY", "").empty();
        ai_config.base_url = ai_config.use_openrouter 
            ? "https://openrouter.ai/api/v1" 
            : "https://api.openai.com/v1";
        ai_config.model_token_limit = std::stoi(get_env("MODEL_MAX_TOKENS", 
            ai_config.use_openrouter ? "8000" : "32000"));
        
        if (ai_config.use_openrouter) {
            ai_config.headers["HTTP-Referer"] = get_env("OPEN_ROUTER_HTTP_REFERER", "https://mermaid.live");
            ai_config.headers["X-Title"] = get_env("OPEN_ROUTER_TITLE", "Mermaid Live Editor");
        }
        
        ai_config_ = ai_config;
        ai_client_ = std::make_unique<ai_client::AIClient>(ai_config);
        
        // Initialize DB client
        std::string supabase_url = get_env("SUPABASE_URL", "");
        std::string supabase_key = get_env("SUPABASE_SERVICE_ROLE_KEY", "");
        if (!supabase_url.empty() && !supabase_key.empty()) {
            db_client_ = std::make_unique<db_client::DBClient>(supabase_url, supabase_key);
        }
    }
    
    // Health check endpoint
    std::string handle_health() {
        std::ostringstream response;
        response << R"({"status":"healthy","version":"1.0.0","service":"mermaid-diagram-generator")";
        
        if (ai_client_) {
            response << R"(,"provider":)" << (ai_config_.use_openrouter ? R"("OpenRouter")" : R"("OpenAI")");
            response << R"(,"api_configured":true,"model":")" << ai_config_.model << R"(")";
        } else {
            response << R"(,"api_configured":false)";
        }
        response << "}";
        return response.str();
    }
    
    // Generate diagram endpoint (non-streaming)
    std::string handle_generate(const std::string& request_body) {
        // Parse request body (simplified - use proper JSON library)
        // Expected: {"prompt": "...", "diagram_type": "...", "complexity": "..."}
        
        try {
            // Extract prompt, diagram_type, complexity from request_body
            // This is simplified - use nlohmann/json in production
            std::string prompt = extract_json_field(request_body, "prompt");
            std::string diagram_type = extract_json_field(request_body, "diagram_type");
            std::string complexity = extract_json_field(request_body, "complexity");
            
            if (complexity.empty()) complexity = "medium";
            
            // Validate complexity
            if (complexity != "simple" && complexity != "medium" && 
                complexity != "complex" && complexity != "large") {
                complexity = "medium";
            }
            
            if (!ai_client_) {
                return R"({"error":"API key not configured"})";
            }
            
            std::string mermaid_code = ai_client_->generate_mermaid_code(prompt, diagram_type, complexity);
            
            // Check if mermaid_code contains an error
            if (mermaid_code.find("\"error\"") != std::string::npos || 
                mermaid_code.find("Internal Server Error") != std::string::npos) {
                std::ostringstream error;
                error << R"({"error":"AI API returned an error: )" << escape_json(mermaid_code) << R"("})";
                return error.str();
            }
            
            // Build response
            std::ostringstream response;
            response << R"({"mermaid_code":")" << escape_json(mermaid_code) 
                     << R"(","diagram_type":")" << (diagram_type.empty() ? "flowchart" : diagram_type)
                     << R"(","complexity":")" << complexity << R"("})";
            return response.str();
            
        } catch (const std::exception& e) {
            std::ostringstream error;
            error << R"({"error":")" << escape_json(e.what()) << R"("})";
            return error.str();
        }
    }
    
    // Generate diagram stream endpoint
    std::string handle_generate_stream(const std::string& request_body) {
        // This would implement Server-Sent Events (SSE) streaming
        // For now, return a simplified version
        // In production, use proper SSE implementation
        return handle_generate(request_body);
    }
    
    // Analyze error endpoint
    std::string handle_analyze_error(const std::string& request_body) {
        try {
            std::string error_message = extract_json_field(request_body, "error_message");
            std::string code = extract_json_field(request_body, "code");
            
            if (!ai_client_) {
                // Fallback to simple parsing
                ai_client::AIClient::ErrorAnalysis result;
                result.line_number = 1;
                result.problematic_line = "";
                result.simplified_message = error_message;
                
                std::ostringstream response;
                response << R"({"line_number":)" << result.line_number
                         << R"(,"problematic_line":")" << escape_json(result.problematic_line)
                         << R"(,"simplified_message":")" << escape_json(result.simplified_message) << R"("})";
                return response.str();
            }
            
            auto result = ai_client_->analyze_error(error_message, code);
            
            std::ostringstream response;
            response << R"({"line_number":)" << result.line_number
                     << R"(,"problematic_line":")" << escape_json(result.problematic_line)
                     << R"(,"simplified_message":")" << escape_json(result.simplified_message) << R"("})";
            return response.str();
            
        } catch (const std::exception& e) {
            std::ostringstream error;
            error << R"({"error":")" << escape_json(e.what()) << R"("})";
            return error.str();
        }
    }
    
    // Repair endpoint
    std::string handle_repair(const std::string& request_body) {
        try {
            std::string code = extract_json_field(request_body, "code");
            std::string error_message = extract_json_field(request_body, "error_message");
            
            if (!ai_client_) {
                return R"({"error":"API key not configured"})";
            }
            
            auto result = ai_client_->repair_line_only(code, error_message);
            
            std::ostringstream response;
            response << R"({"repaired_code":")" << escape_json(result.repaired_code)
                     << R"(,"repaired_line_number":)" << result.repaired_line_number
                     << R"(,"success":)" << (result.success ? "true" : "false") << "}";
            return response.str();
            
        } catch (const std::exception& e) {
            std::ostringstream error;
            error << R"({"error":")" << escape_json(e.what()) << R"("})";
            return error.str();
        }
    }
    
private:
    std::unique_ptr<ai_client::AIClient> ai_client_;
    std::unique_ptr<db_client::DBClient> db_client_;
    RateLimiter rate_limiter_;
    ai_client::Config ai_config_;
    
    void load_env() {
        // Load .env file
        std::ifstream env_file(".env");
        if (env_file.is_open()) {
            std::string line;
            while (std::getline(env_file, line)) {
                // Skip empty lines and comments
                if (line.empty() || line[0] == '#') continue;
                
                // Parse KEY=VALUE format
                size_t pos = line.find('=');
                if (pos != std::string::npos) {
                    std::string key = line.substr(0, pos);
                    std::string value = line.substr(pos + 1);
                    
                    // Trim whitespace
                    key.erase(0, key.find_first_not_of(" \t"));
                    key.erase(key.find_last_not_of(" \t") + 1);
                    value.erase(0, value.find_first_not_of(" \t"));
                    value.erase(value.find_last_not_of(" \t") + 1);
                    
                    // Remove quotes if present
                    if (!value.empty() && (value[0] == '"' || value[0] == '\'')) {
                        value = value.substr(1, value.length() - 2);
                    }
                    
                    // Set environment variable if not already set
                    if (std::getenv(key.c_str()) == nullptr) {
                        setenv(key.c_str(), value.c_str(), 0);
                    }
                }
            }
            env_file.close();
        }
    }
    
    std::string get_env(const std::string& key, const std::string& default_value = "") {
        const char* value = std::getenv(key.c_str());
        return value ? std::string(value) : default_value;
    }
    
    std::string extract_json_field(const std::string& json, const std::string& field) {
        // Simplified JSON field extraction
        // In production, use nlohmann/json
        std::string pattern = "\"" + field + "\":\"";
        size_t pos = json.find(pattern);
        if (pos == std::string::npos) return "";
        
        pos += pattern.length();
        size_t end = json.find("\"", pos);
        if (end == std::string::npos) return "";
        
        return json.substr(pos, end - pos);
    }
    
    std::string escape_json(const std::string& str) {
        std::ostringstream escaped;
        for (char c : str) {
            if (c == '"') escaped << "\\\"";
            else if (c == '\\') escaped << "\\\\";
            else if (c == '\n') escaped << "\\n";
            else if (c == '\r') escaped << "\\r";
            else if (c == '\t') escaped << "\\t";
            else escaped << c;
        }
        return escaped.str();
    }
};

int main(int argc, char* argv[]) {
    std::cout << "Mermaid Backend C++ Server" << std::endl;
    std::cout << "Starting HTTP server on port 8000..." << std::endl;
    
    Server server;
    
    httplib::Server svr;
    
    // CORS headers
    svr.set_default_headers({
        {"Access-Control-Allow-Origin", "*"},
        {"Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS"},
        {"Access-Control-Allow-Headers", "Content-Type, Authorization"}
    });
    
    // Health check endpoint
    svr.Get("/health", [&server](const httplib::Request& req, httplib::Response& res) {
        res.set_content(server.handle_health(), "application/json");
    });
    
    // Generate diagram endpoint (non-streaming)
    svr.Post("/generate", [&server](const httplib::Request& req, httplib::Response& res) {
        res.set_content(server.handle_generate(req.body), "application/json");
    });
    
    // Generate diagram stream endpoint
    svr.Post("/generate/stream", [&server](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Content-Type", "text/event-stream");
        res.set_header("Cache-Control", "no-cache");
        res.set_header("Connection", "keep-alive");
        res.set_content(server.handle_generate_stream(req.body), "text/event-stream");
    });
    
    // Analyze error endpoint
    svr.Post("/analyze-error", [&server](const httplib::Request& req, httplib::Response& res) {
        res.set_content(server.handle_analyze_error(req.body), "application/json");
    });
    
    // Repair endpoint
    svr.Post("/repair", [&server](const httplib::Request& req, httplib::Response& res) {
        res.set_content(server.handle_repair(req.body), "application/json");
    });
    
    // OPTIONS handler for CORS
    svr.Options(".*", [](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    });
    
    std::string host = "0.0.0.0";
    int port = 8000;
    
    if (argc > 1) {
        port = std::stoi(argv[1]);
    }
    
    std::cout << "Server listening on http://" << host << ":" << port << std::endl;
    std::cout << "Health check: http://" << host << ":" << port << "/health" << std::endl;
    
    if (!svr.listen(host, port)) {
        std::cerr << "Failed to start server on port " << port << std::endl;
        return 1;
    }
    
    return 0;
}

