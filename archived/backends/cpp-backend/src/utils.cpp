#include "utils.h"
#include <algorithm>
#include <cctype>
#include <regex>
#include <map>
#include <sstream>
#include <iomanip>
#include <ctime>

namespace utils {

std::string extract_mermaid_code(const std::string& response_text) {
    // Remove markdown code blocks if present
    std::regex code_block_pattern(R"(```(?:mermaid)?\s*(.*?)```)");
    std::smatch matches;
    
    if (std::regex_search(response_text, matches, code_block_pattern)) {
        std::string extracted = matches[1].str();
        // Trim whitespace
        extracted.erase(0, extracted.find_first_not_of(" \t\n\r"));
        extracted.erase(extracted.find_last_not_of(" \t\n\r") + 1);
        return extracted;
    }
    
    // If no code blocks, try to find Mermaid syntax directly
    // Use simpler regex patterns that work with C++ regex
    std::vector<std::pair<std::string, int>> mermaid_patterns = {
        {R"(graph\s+(TD|LR|BT|RL|TB|RL))", 0},
        {R"(flowchart\s+(TD|LR|BT|RL|TB|RL))", 0},
        {R"(sequenceDiagram)", 0},
        {R"(classDiagram)", 0},
        {R"(stateDiagram)", 0},
        {R"(erDiagram)", 0},
        {R"(gantt)", 0},
        {R"(pie)", 0},
        {R"(journey)", 0},
    };
    
    for (const auto& pattern_pair : mermaid_patterns) {
        try {
            std::regex pattern(pattern_pair.first, std::regex_constants::icase);
            if (std::regex_search(response_text, matches, pattern)) {
                // Find where the diagram starts
                size_t start_pos = response_text.find(matches[0].str());
                if (start_pos != std::string::npos) {
                    // Extract everything from that point to the end (or until we find a clear ending)
                    // For large diagrams, just return from the start
                    std::string extracted = response_text.substr(start_pos);
                    // Try to find a reasonable ending point (double newline or end of string)
                    size_t end_pos = extracted.find("\n\n\n");
                    if (end_pos != std::string::npos) {
                        extracted = extracted.substr(0, end_pos);
                    }
                    extracted.erase(0, extracted.find_first_not_of(" \t\n\r"));
                    extracted.erase(extracted.find_last_not_of(" \t\n\r") + 1);
                    if (!extracted.empty()) {
                        return extracted;
                    }
                }
            }
        } catch (const std::regex_error& e) {
            // Skip invalid regex patterns
            continue;
        }
    }
    
    // If nothing found, return trimmed original text
    std::string trimmed = response_text;
    trimmed.erase(0, trimmed.find_first_not_of(" \t\n\r"));
    trimmed.erase(trimmed.find_last_not_of(" \t\n\r") + 1);
    return trimmed;
}

std::string get_system_prompt(const std::string& diagram_type, const std::string& complexity) {
    std::map<std::string, std::string> complexity_guidance = {
        {"simple", "Create a simple, straightforward diagram with 5-10 nodes."},
        {"medium", "Create a well-structured diagram with 15-30 nodes, including proper organization."},
        {"complex", "Create a comprehensive diagram with 30-60 nodes, using subgraphs/clusters for organization."},
        {"large", "Create a large, detailed diagram with 60+ nodes, extensive use of subgraphs/clusters, and comprehensive relationships."}
    };
    
    std::string complexity_lower = complexity;
    std::transform(complexity_lower.begin(), complexity_lower.end(), complexity_lower.begin(), ::tolower);
    
    std::string complexity_instruction = complexity_guidance.count(complexity_lower) 
        ? complexity_guidance[complexity_lower] 
        : complexity_guidance["medium"];
    
    std::string diagram_type_hint = "";
    if (!diagram_type.empty()) {
        diagram_type_hint = "\nThe user requested a " + diagram_type + " diagram. Use the appropriate Mermaid syntax for this type.";
    }
    
    return R"(You are an expert Mermaid diagram assistant specializing in creating large, complex, and well-structured diagrams.

CRITICAL RULES:
- ALWAYS respond with a complete, valid Mermaid diagram
- NEVER send empty or blank responses
- Use proper Mermaid syntax for the requested diagram type
- Make diagrams clear, readable, and well-organized
- Use meaningful node labels and relationships
- Use subgraphs/clusters to organize complex diagrams
- For large diagrams, break them into logical sections using subgraphs

)" + complexity_instruction + diagram_type_hint + R"(

Format your response as:
```mermaid
[complete diagram code here]
```

Supported diagram types: flowchart, graph, sequenceDiagram, classDiagram, stateDiagram, erDiagram, gantt, pie, journey, mindmap, timeline, quadrantChart, gitGraph.

For large diagrams, use:
- Subgraphs/clusters for logical grouping
- Clear hierarchical structure
- Meaningful node IDs and labels
- Appropriate styling for visual clarity
- Proper spacing and organization)";
}

int get_max_tokens_for_complexity(const std::string& complexity, int model_limit) {
    std::string complexity_lower = complexity;
    std::transform(complexity_lower.begin(), complexity_lower.end(), complexity_lower.begin(), ::tolower);
    
    std::map<std::string, double> ratios = {
        {"simple", 0.25},
        {"medium", 0.5},
        {"complex", 0.7},
        {"large", 0.9}
    };
    
    double ratio = ratios.count(complexity_lower) ? ratios[complexity_lower] : 0.5;
    int tokens = static_cast<int>(model_limit * ratio);
    
    // Ensure we always allocate a reasonable number of tokens but never exceed the model limit
    return std::max(1024, std::min(tokens, model_limit));
}

std::string url_encode(const std::string& value) {
    std::ostringstream escaped;
    escaped.fill('0');
    escaped << std::hex;
    
    for (char c : value) {
        if (std::isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~') {
            escaped << c;
        } else {
            escaped << '%' << std::setw(2) << static_cast<int>(static_cast<unsigned char>(c));
        }
    }
    
    return escaped.str();
}

std::string get_current_timestamp() {
    auto now = std::time(nullptr);
    auto tm = *std::gmtime(&now);
    
    std::ostringstream oss;
    oss << std::put_time(&tm, "%Y-%m-%dT%H:%M:%S.000Z");
    return oss.str();
}

std::vector<std::string> split_string(const std::string& str, char delimiter) {
    std::vector<std::string> tokens;
    std::stringstream ss(str);
    std::string token;
    
    while (std::getline(ss, token, delimiter)) {
        tokens.push_back(token);
    }
    
    return tokens;
}

std::string trim(const std::string& str) {
    size_t first = str.find_first_not_of(" \t\n\r");
    if (first == std::string::npos) return "";
    
    size_t last = str.find_last_not_of(" \t\n\r");
    return str.substr(first, (last - first + 1));
}

bool is_valid_uuid(const std::string& uuid) {
    std::regex uuid_pattern(R"(^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$)");
    return std::regex_match(uuid, uuid_pattern);
}

} // namespace utils

