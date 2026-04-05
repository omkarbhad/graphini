#pragma once

#include <string>
#include <functional>
#include <memory>
#include <map>

namespace ai_client {

struct Config {
    std::string api_key;
    std::string model;
    std::string base_url;
    bool use_openrouter;
    std::map<std::string, std::string> headers;
    int model_token_limit;
};

class AIClient {
public:
    AIClient(const Config& config);
    
    // Generate Mermaid code (non-streaming)
    std::string generate_mermaid_code(
        const std::string& prompt,
        const std::string& diagram_type,
        const std::string& complexity
    );
    
    // Generate Mermaid code with streaming
    // Callback function is called for each chunk: (chunk, is_complete)
    void generate_mermaid_code_stream(
        const std::string& prompt,
        const std::string& diagram_type,
        const std::string& complexity,
        std::function<void(const std::string&, bool)> callback
    );
    
    // Analyze error and extract problematic line
    struct ErrorAnalysis {
        int line_number;
        std::string problematic_line;
        std::string simplified_message;
    };
    
    ErrorAnalysis analyze_error(const std::string& error_message, const std::string& code);
    
    // Repair line only
    struct RepairResult {
        std::string repaired_code;
        int repaired_line_number;
        bool success;
    };
    
    RepairResult repair_line_only(const std::string& code, const std::string& error_message = "");
    
    bool is_configured() const { return !config_.api_key.empty(); }
    
private:
    Config config_;
    
    // Make HTTP request to AI API
    std::string make_chat_request(
        const std::string& system_prompt,
        const std::string& user_prompt,
        int max_tokens,
        bool stream = false
    );
    
    // Stream HTTP request to AI API
    void stream_chat_request(
        const std::string& system_prompt,
        const std::string& user_prompt,
        int max_tokens,
        std::function<void(const std::string&, bool)> callback
    );
};

} // namespace ai_client

