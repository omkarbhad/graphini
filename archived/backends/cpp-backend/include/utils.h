#pragma once

#include <string>
#include <regex>
#include <sstream>
#include <iomanip>
#include <ctime>
#include <vector>

namespace utils {

// Extract Mermaid code from AI response
std::string extract_mermaid_code(const std::string& response_text);

// Get system prompt based on diagram type and complexity
std::string get_system_prompt(const std::string& diagram_type, const std::string& complexity);

// Get max tokens for complexity
int get_max_tokens_for_complexity(const std::string& complexity, int model_limit);

// URL encode string
std::string url_encode(const std::string& value);

// Get current timestamp as ISO 8601 string
std::string get_current_timestamp();

// Split string by delimiter
std::vector<std::string> split_string(const std::string& str, char delimiter);

// Trim whitespace
std::string trim(const std::string& str);

// Check if string is a valid UUID
bool is_valid_uuid(const std::string& uuid);

} // namespace utils

