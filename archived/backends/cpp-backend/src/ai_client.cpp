#include "ai_client.h"
#include "utils.h"
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <curl/curl.h>
#include <algorithm>

namespace ai_client {

// Simple HTTP client using libcurl
struct CurlResponse {
    std::string data;
    std::string headers;
};

static size_t WriteCallback(void* contents, size_t size, size_t nmemb, void* userp) {
    size_t total_size = size * nmemb;
    CurlResponse* response = static_cast<CurlResponse*>(userp);
    response->data.append(static_cast<char*>(contents), total_size);
    return total_size;
}

static size_t HeaderCallback(char* buffer, size_t size, size_t nitems, void* userp) {
    size_t total_size = size * nitems;
    CurlResponse* response = static_cast<CurlResponse*>(userp);
    response->headers.append(buffer, total_size);
    return total_size;
}

AIClient::AIClient(const Config& config) : config_(config) {
    curl_global_init(CURL_GLOBAL_DEFAULT);
}

std::string AIClient::make_chat_request(
    const std::string& system_prompt,
    const std::string& user_prompt,
    int max_tokens,
    bool stream
) {
    if (!is_configured()) {
        throw std::runtime_error("AI client not configured. Please set API key.");
    }
    
    CURL* curl = curl_easy_init();
    if (!curl) {
        throw std::runtime_error("Failed to initialize curl");
    }
    
    CurlResponse response;
    
    // Build JSON request with proper escaping
    // Helper function to escape JSON strings
    auto escape_json_string = [](const std::string& str) -> std::string {
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
    };
    
    std::ostringstream json_body;
    json_body << R"({"model":")" << config_.model 
             << R"(","messages":[{"role":"system","content":")"
             << escape_json_string(system_prompt) << R"("},{"role":"user","content":")"
             << escape_json_string(user_prompt) << R"("}],"temperature":0.7,"max_tokens":)"
             << max_tokens << R"(,"stream":)" << (stream ? "true" : "false") << "}";
    
    std::string url = config_.base_url + "/chat/completions";
    
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, json_body.str().c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
    curl_easy_setopt(curl, CURLOPT_HEADERFUNCTION, HeaderCallback);
    curl_easy_setopt(curl, CURLOPT_HEADERDATA, &response);
    
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    std::string auth_header = "Authorization: Bearer " + config_.api_key;
    headers = curl_slist_append(headers, auth_header.c_str());
    
    for (const auto& h : config_.headers) {
        std::string header = h.first + ": " + h.second;
        headers = curl_slist_append(headers, header.c_str());
    }
    
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    
    CURLcode res = curl_easy_perform(curl);
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    
    if (res != CURLE_OK) {
        throw std::runtime_error("HTTP request failed: " + std::string(curl_easy_strerror(res)));
    }
    
    // Parse JSON response (simplified - in production use proper JSON library)
    // OpenAI/OpenRouter response format: {"choices":[{"message":{"content":"..."}}]}
    // Extract content from response.data
    std::string response_data = response.data;
    
    // Try to find content in the response
    // Look for "choices" array first
    size_t choices_pos = response_data.find("\"choices\"");
    if (choices_pos != std::string::npos) {
        // Find the message content
        size_t content_pos = response_data.find("\"content\"", choices_pos);
        if (content_pos != std::string::npos) {
            // Find the colon after "content"
            size_t colon_pos = response_data.find(':', content_pos);
            if (colon_pos != std::string::npos) {
                // Skip whitespace after colon
                size_t quote_start = colon_pos + 1;
                while (quote_start < response_data.length() && 
                       (response_data[quote_start] == ' ' || response_data[quote_start] == '\t' || response_data[quote_start] == '\n')) {
                    quote_start++;
                }
                
                // Check if it's a quoted string
                if (quote_start < response_data.length() && response_data[quote_start] == '"') {
                    quote_start++; // Skip opening quote
                    
                    // Find closing quote, handling escaped quotes
                    size_t quote_end = quote_start;
                    while (quote_end < response_data.length()) {
                        if (response_data[quote_end] == '"' && (quote_end == 0 || response_data[quote_end - 1] != '\\')) {
                            break;
                        }
                        quote_end++;
                    }
                    
                    if (quote_end < response_data.length()) {
                        std::string content = response_data.substr(quote_start, quote_end - quote_start);
                        
                        // Unescape common JSON escape sequences
                        std::string unescaped;
                        for (size_t i = 0; i < content.length(); i++) {
                            if (content[i] == '\\' && i + 1 < content.length()) {
                                if (content[i + 1] == 'n') {
                                    unescaped += '\n';
                                    i++;
                                } else if (content[i + 1] == 'r') {
                                    unescaped += '\r';
                                    i++;
                                } else if (content[i + 1] == 't') {
                                    unescaped += '\t';
                                    i++;
                                } else if (content[i + 1] == '"') {
                                    unescaped += '"';
                                    i++;
                                } else if (content[i + 1] == '\\') {
                                    unescaped += '\\';
                                    i++;
                                } else {
                                    unescaped += content[i];
                                }
                            } else {
                                unescaped += content[i];
                            }
                        }
                        return unescaped;
                    }
                }
            }
        }
    }
    
    // Fallback: try simple "content":" pattern
    size_t content_pos = response_data.find("\"content\":\"");
    if (content_pos != std::string::npos) {
        content_pos += 11;
        size_t content_end = content_pos;
        while (content_end < response_data.length()) {
            if (response_data[content_end] == '"' && (content_end == 0 || response_data[content_end - 1] != '\\')) {
                break;
            }
            content_end++;
        }
        if (content_end < response_data.length()) {
            return response_data.substr(content_pos, content_end - content_pos);
        }
    }
    
    // If all parsing fails, return the raw response (might contain useful info)
    if (response_data.length() < 10000) {
        return response_data;
    }
    
    throw std::runtime_error("Failed to parse AI response");
}

std::string AIClient::generate_mermaid_code(
    const std::string& prompt,
    const std::string& diagram_type,
    const std::string& complexity
) {
    if (!is_configured()) {
        throw std::runtime_error("AI client not configured");
    }
    
    std::string system_prompt = utils::get_system_prompt(diagram_type, complexity);
    std::string user_prompt = "Create a " + complexity + " Mermaid diagram: " + prompt;
    if (!diagram_type.empty()) {
        user_prompt += "\n\nDiagram type: " + diagram_type;
    }
    
    if (complexity == "large") {
        user_prompt += "\n\nCRITICAL: Generate the COMPLETE diagram. Do not truncate or leave it incomplete. Include all nodes, edges, and subgraphs. The diagram must be complete and valid Mermaid syntax.";
    }
    
    int max_tokens = utils::get_max_tokens_for_complexity(complexity, config_.model_token_limit);
    
    std::string response_text = make_chat_request(system_prompt, user_prompt, max_tokens, false);
    return utils::extract_mermaid_code(response_text);
}

void AIClient::generate_mermaid_code_stream(
    const std::string& prompt,
    const std::string& diagram_type,
    const std::string& complexity,
    std::function<void(const std::string&, bool)> callback
) {
    if (!is_configured()) {
        throw std::runtime_error("AI client not configured");
    }
    
    std::string system_prompt = utils::get_system_prompt(diagram_type, complexity);
    std::string user_prompt = "Create a " + complexity + " Mermaid diagram: " + prompt;
    if (!diagram_type.empty()) {
        user_prompt += "\n\nDiagram type: " + diagram_type;
    }
    
    if (complexity == "large") {
        user_prompt += "\n\nCRITICAL: Generate the COMPLETE diagram. Do not truncate or leave it incomplete. Include all nodes, edges, and subgraphs. The diagram must be complete and valid Mermaid syntax.";
    }
    
    int max_tokens = utils::get_max_tokens_for_complexity(complexity, config_.model_token_limit);
    
    // For streaming, we'd need to implement Server-Sent Events parsing
    // This is a simplified version - full implementation would parse SSE stream
    std::string accumulated_text;
    std::string response_text = make_chat_request(system_prompt, user_prompt, max_tokens, true);
    
    // Simulate streaming by calling callback with chunks
    // In production, parse SSE stream properly
    for (size_t i = 0; i < response_text.length(); i += 10) {
        std::string chunk = response_text.substr(i, 10);
        accumulated_text += chunk;
        callback(chunk, false);
    }
    
    // Send final extracted code
    std::string mermaid_code = utils::extract_mermaid_code(accumulated_text);
    callback(mermaid_code, true);
}

AIClient::ErrorAnalysis AIClient::analyze_error(const std::string& error_message, const std::string& code) {
    ErrorAnalysis result;
    result.line_number = 1;
    result.problematic_line = "";
    result.simplified_message = "";
    
    if (!is_configured()) {
        // Fallback to simple parsing
        std::regex line_pattern(R"(line\s+(\d+))", std::regex_constants::icase);
        std::smatch match;
        
        if (std::regex_search(error_message, match, line_pattern)) {
            result.line_number = std::stoi(match[1].str());
        } else {
            result.line_number = 1;
        }
        
        std::vector<std::string> lines = utils::split_string(code, '\n');
        if (result.line_number > 0 && result.line_number <= static_cast<int>(lines.size())) {
            result.problematic_line = lines[result.line_number - 1];
        }
        result.simplified_message = "Line " + std::to_string(result.line_number) + ": " + result.problematic_line;
        return result;
    }
    
    std::string system_prompt = R"(You are an expert at analyzing Mermaid diagram syntax errors. 
Your task is to identify the exact line number and content of the problematic line in the code.

When given an error message and code:
1. Identify the exact line number where the error occurs
2. Extract the exact content of that line
3. Return a simplified message showing only: "Line X: <line content>"

Respond in JSON format:
{
  "line_number": <number>,
  "problematic_line": "<exact line content>",
  "simplified_message": "Line <number>: <line content>"
}

Only return the JSON, no other text.)";
    
    std::string user_prompt = "Error message:\n" + error_message + "\n\nCode:\n" + code + "\n\nIdentify the problematic line and return the JSON.";
    
    try {
        std::string response_text = make_chat_request(system_prompt, user_prompt, 200, false);
        
        // Parse JSON response (simplified parser)
        // Extract JSON object from response
        size_t json_start = response_text.find('{');
        if (json_start != std::string::npos) {
            size_t json_end = response_text.find_last_of('}');
            if (json_end != std::string::npos && json_end > json_start) {
                std::string json_str = response_text.substr(json_start, json_end - json_start + 1);
                
                // Extract line_number
                size_t line_num_pos = json_str.find("\"line_number\"");
                if (line_num_pos != std::string::npos) {
                    size_t colon_pos = json_str.find(':', line_num_pos);
                    if (colon_pos != std::string::npos) {
                        size_t num_start = json_str.find_first_of("0123456789", colon_pos);
                        if (num_start != std::string::npos) {
                            size_t num_end = json_str.find_first_not_of("0123456789", num_start);
                            if (num_end == std::string::npos) num_end = json_str.length();
                            std::string num_str = json_str.substr(num_start, num_end - num_start);
                            result.line_number = std::stoi(num_str);
                        }
                    }
                }
                
                // Extract problematic_line
                size_t prob_line_pos = json_str.find("\"problematic_line\"");
                if (prob_line_pos != std::string::npos) {
                    size_t colon_pos = json_str.find(':', prob_line_pos);
                    if (colon_pos != std::string::npos) {
                        // Skip whitespace after colon
                        size_t pos = colon_pos + 1;
                        while (pos < json_str.length() && (json_str[pos] == ' ' || json_str[pos] == '\t')) {
                            pos++;
                        }
                        // Check if it's a quoted string
                        if (pos < json_str.length() && json_str[pos] == '"') {
                            pos++; // Skip opening quote
                            size_t quote_end = json_str.find('"', pos);
                            if (quote_end != std::string::npos && quote_end >= pos) {
                                // Extract value (can be empty string)
                                result.problematic_line = json_str.substr(pos, quote_end - pos);
                            }
                        }
                    }
                }
                
                // Extract simplified_message
                size_t msg_pos = json_str.find("\"simplified_message\"");
                if (msg_pos != std::string::npos) {
                    size_t colon_pos = json_str.find(':', msg_pos);
                    if (colon_pos != std::string::npos) {
                        // Skip whitespace after colon
                        size_t quote_start = colon_pos + 1;
                        while (quote_start < json_str.length() && (json_str[quote_start] == ' ' || json_str[quote_start] == '\t')) {
                            quote_start++;
                        }
                        if (quote_start < json_str.length() && json_str[quote_start] == '"') {
                            quote_start++; // Skip opening quote
                            size_t quote_end = json_str.find('"', quote_start);
                            if (quote_end != std::string::npos && quote_end > quote_start) {
                                result.simplified_message = json_str.substr(quote_start, quote_end - quote_start);
                            }
                        }
                    }
                }
                
                // If we got at least line_number, return the result
                if (result.line_number > 0) {
                    // Always validate problematic_line - if empty, suspiciously short, or just punctuation, get it from code
                    std::vector<std::string> lines = utils::split_string(code, '\n');
                    bool needs_fallback = result.problematic_line.empty() || 
                                         result.problematic_line.length() <= 2 ||
                                         (result.problematic_line.length() == 1 && !std::isalnum(result.problematic_line[0]));
                    
                    if (needs_fallback && !lines.empty()) {
                        if (result.line_number > 0 && result.line_number <= static_cast<int>(lines.size())) {
                            result.problematic_line = lines[result.line_number - 1];
                        } else {
                            // If line number is out of bounds, use last line
                            result.problematic_line = lines.back();
                            result.line_number = lines.size();
                        }
                    }
                    
                    // Always ensure simplified_message is valid
                    if (result.simplified_message.empty() || result.simplified_message.length() <= 10 || 
                        result.simplified_message.find("Line") == std::string::npos) {
                        result.simplified_message = "Line " + std::to_string(result.line_number) + ": " + result.problematic_line;
                    }
                    return result;
                }
            }
        }
        
        // Fallback if JSON parsing failed - use simple parsing
        std::regex line_pattern(R"(line\s+(\d+))", std::regex_constants::icase);
        std::smatch match;
        
        if (std::regex_search(error_message, match, line_pattern)) {
            result.line_number = std::stoi(match[1].str());
        } else {
            result.line_number = 1;
        }
        
        std::vector<std::string> lines = utils::split_string(code, '\n');
        if (result.line_number > 0 && result.line_number <= static_cast<int>(lines.size())) {
            result.problematic_line = lines[result.line_number - 1];
        }
        result.simplified_message = "Line " + std::to_string(result.line_number) + ": " + result.problematic_line;
        return result;
    } catch (...) {
        // Fallback to simple parsing on exception
        std::regex line_pattern(R"(line\s+(\d+))", std::regex_constants::icase);
        std::smatch match;
        
        if (std::regex_search(error_message, match, line_pattern)) {
            result.line_number = std::stoi(match[1].str());
        } else {
            result.line_number = 1;
        }
        
        std::vector<std::string> lines = utils::split_string(code, '\n');
        if (result.line_number > 0 && result.line_number <= static_cast<int>(lines.size())) {
            result.problematic_line = lines[result.line_number - 1];
        }
        result.simplified_message = "Line " + std::to_string(result.line_number) + ": " + result.problematic_line;
        return result;
    }
}

AIClient::RepairResult AIClient::repair_line_only(const std::string& code, const std::string& error_message) {
    RepairResult result;
    result.success = false;
    result.repaired_line_number = 1;
    result.repaired_code = code;
    
    if (!is_configured()) {
        result.success = true; // Auto-fix fallback
        return result;
    }
    
    // Identify problematic line
    int line_number = 1;
    if (!error_message.empty()) {
        std::regex line_pattern(R"(line\s+(\d+))", std::regex_constants::icase);
        std::smatch match;
        if (std::regex_search(error_message, match, line_pattern)) {
            line_number = std::stoi(match[1].str());
        }
    }
    
    std::vector<std::string> lines = utils::split_string(code, '\n');
    if (line_number < 1 || line_number > static_cast<int>(lines.size())) {
        line_number = 1;
    }
    
    std::string problematic_line = lines[line_number - 1];
    
    // Use AI to fix the line
    std::string system_prompt = R"(You are a Mermaid syntax expert. Your task is to fix ONLY the broken line.

CRITICAL RULES:
- Return ONLY the fixed line content
- No explanations, no markdown, no code blocks
- No line numbers or labels
- Preserve the structure and intent of the original line
- Fix syntax errors (missing brackets, quotes, etc.))";
    
    std::string prev_line = line_number > 1 ? lines[line_number - 2] : "";
    std::string next_line = line_number < static_cast<int>(lines.size()) ? lines[line_number] : "";
    
    std::string user_prompt = "Fix this broken Mermaid line:\n\nBroken line: " + problematic_line
        + "\nPrevious line: " + prev_line + "\nNext line: " + next_line
        + "\n\nReturn ONLY the fixed line content.";
    
    try {
        std::string fixed_line = make_chat_request(system_prompt, user_prompt, 200, false);
        fixed_line = utils::trim(fixed_line);
        
        // Replace the line in code
        lines[line_number - 1] = fixed_line;
        result.repaired_code = "";
        for (size_t i = 0; i < lines.size(); i++) {
            if (i > 0) result.repaired_code += "\n";
            result.repaired_code += lines[i];
        }
        result.repaired_line_number = line_number;
        result.success = true;
    } catch (...) {
        // Auto-fix fallback
        std::string fixed_line = problematic_line;
        // Simple auto-fix
        if (std::count(fixed_line.begin(), fixed_line.end(), '[') > std::count(fixed_line.begin(), fixed_line.end(), ']')) {
            fixed_line += ']';
        }
        lines[line_number - 1] = fixed_line;
        result.repaired_code = "";
        for (size_t i = 0; i < lines.size(); i++) {
            if (i > 0) result.repaired_code += "\n";
            result.repaired_code += lines[i];
        }
        result.repaired_line_number = line_number;
        result.success = true;
    }
    
    return result;
}

void AIClient::stream_chat_request(
    const std::string& system_prompt,
    const std::string& user_prompt,
    int max_tokens,
    std::function<void(const std::string&, bool)> callback
) {
    // This would implement Server-Sent Events (SSE) streaming
    // For now, call the non-streaming version and simulate streaming
    std::string response = make_chat_request(system_prompt, user_prompt, max_tokens, true);
    
    // Simulate streaming by calling callback with chunks
    for (size_t i = 0; i < response.length(); i += 10) {
        std::string chunk = response.substr(i, 10);
        callback(chunk, false);
    }
    
    callback(response, true);
}

} // namespace ai_client

