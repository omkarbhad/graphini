#include "db_client.h"
#include <curl/curl.h>
#include <sstream>
#include <stdexcept>
#include <algorithm>

namespace db_client {

// Simple HTTP client for Supabase
struct CurlResponse {
    std::string data;
};

static size_t WriteCallback(void* contents, size_t size, size_t nmemb, void* userp) {
    size_t total_size = size * nmemb;
    CurlResponse* response = static_cast<CurlResponse*>(userp);
    response->data.append(static_cast<char*>(contents), total_size);
    return total_size;
}

std::map<std::string, std::string> Conversation::to_dict() const {
    std::map<std::string, std::string> result;
    result["id"] = id;
    result["user_id"] = user_id;
    result["title"] = title;
    result["created_at"] = created_at;
    result["updated_at"] = updated_at;
    // metadata would need JSON serialization
    return result;
}

std::map<std::string, std::string> Message::to_dict() const {
    std::map<std::string, std::string> result;
    result["id"] = id;
    result["conversation_id"] = conversation_id;
    result["role"] = role;
    result["content"] = content;
    result["parts"] = parts;
    result["created_at"] = created_at;
    // metadata would need JSON serialization
    return result;
}

std::map<std::string, std::string> Snapshot::to_dict() const {
    std::map<std::string, std::string> result;
    result["id"] = id;
    result["conversation_id"] = conversation_id;
    result["message_id"] = message_id;
    result["description"] = description;
    result["state"] = state;
    result["created_at"] = created_at;
    return result;
}

DBClient::DBClient(const std::string& supabase_url, const std::string& supabase_key)
    : supabase_url_(supabase_url), supabase_key_(supabase_key) {
    curl_global_init(CURL_GLOBAL_DEFAULT);
}

std::string DBClient::make_request(
    const std::string& method,
    const std::string& endpoint,
    const std::string& body
) {
    CURL* curl = curl_easy_init();
    if (!curl) {
        throw std::runtime_error("Failed to initialize curl");
    }
    
    CurlResponse response;
    std::string url = supabase_url_ + "/rest/v1/" + endpoint;
    
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
    
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    headers = curl_slist_append(headers, "apikey: application/json");
    std::string auth_header = "Authorization: Bearer " + supabase_key_;
    headers = curl_slist_append(headers, auth_header.c_str());
    headers = curl_slist_append(headers, "Prefer: return=representation");
    
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    
    if (method == "POST") {
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
    } else if (method == "PATCH") {
        curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "PATCH");
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
    } else if (method == "DELETE") {
        curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "DELETE");
    }
    
    CURLcode res = curl_easy_perform(curl);
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    
    if (res != CURLE_OK) {
        throw std::runtime_error("HTTP request failed: " + std::string(curl_easy_strerror(res)));
    }
    
    return response.data;
}

std::map<std::string, std::string> DBClient::parse_json(const std::string& json_str) {
    // Simplified JSON parser - use nlohmann/json in production
    std::map<std::string, std::string> result;
    // TODO: Implement proper JSON parsing
    return result;
}

std::vector<std::map<std::string, std::string>> DBClient::parse_json_array(const std::string& json_str) {
    // Simplified JSON array parser - use nlohmann/json in production
    std::vector<std::map<std::string, std::string>> result;
    // TODO: Implement proper JSON array parsing
    return result;
}

Conversation DBClient::create_conversation(const std::map<std::string, std::string>& data) {
    std::ostringstream json_body;
    json_body << "{\"user_id\":\"" << data.at("user_id") 
              << "\",\"title\":\"" << (data.count("title") ? data.at("title") : "New Chat") << "\"}";
    
    std::string response = make_request("POST", "conversations", json_body.str());
    auto parsed = parse_json(response);
    
    Conversation conv;
    conv.id = parsed.at("id");
    conv.user_id = parsed.at("user_id");
    conv.title = parsed.at("title");
    conv.created_at = parsed.at("created_at");
    conv.updated_at = parsed.at("updated_at");
    return conv;
}

Conversation DBClient::get_conversation(const std::string& conversation_id) {
    std::string endpoint = "conversations?id=eq." + conversation_id;
    std::string response = make_request("GET", endpoint);
    auto parsed_array = parse_json_array(response);
    
    if (parsed_array.empty()) {
        throw std::runtime_error("Conversation not found");
    }
    
    Conversation conv;
    conv.id = parsed_array[0].at("id");
    conv.user_id = parsed_array[0].at("user_id");
    conv.title = parsed_array[0].at("title");
    conv.created_at = parsed_array[0].at("created_at");
    conv.updated_at = parsed_array[0].at("updated_at");
    return conv;
}

std::vector<Conversation> DBClient::list_conversations(const std::map<std::string, std::string>& filters) {
    std::ostringstream endpoint;
    endpoint << "conversations?";
    
    if (filters.count("user_id")) {
        endpoint << "user_id=eq." << filters.at("user_id") << "&";
    }
    if (filters.count("limit")) {
        endpoint << "limit=" << filters.at("limit") << "&";
    }
    if (filters.count("offset")) {
        endpoint << "offset=" << filters.at("offset") << "&";
    }
    endpoint << "order=updated_at.desc";
    
    std::string response = make_request("GET", endpoint.str());
    auto parsed_array = parse_json_array(response);
    
    std::vector<Conversation> conversations;
    for (const auto& item : parsed_array) {
        Conversation conv;
        conv.id = item.at("id");
        conv.user_id = item.at("user_id");
        conv.title = item.at("title");
        conv.created_at = item.at("created_at");
        conv.updated_at = item.at("updated_at");
        conversations.push_back(conv);
    }
    
    return conversations;
}

Conversation DBClient::update_conversation(const std::string& conversation_id, const std::map<std::string, std::string>& data) {
    std::ostringstream json_body;
    json_body << "{";
    bool first = true;
    if (data.count("title")) {
        if (!first) json_body << ",";
        json_body << "\"title\":\"" << data.at("title") << "\"";
        first = false;
    }
    json_body << "}";
    
    std::string endpoint = "conversations?id=eq." + conversation_id;
    std::string response = make_request("PATCH", endpoint, json_body.str());
    auto parsed_array = parse_json_array(response);
    
    if (parsed_array.empty()) {
        throw std::runtime_error("Conversation not found");
    }
    
    Conversation conv;
    conv.id = parsed_array[0].at("id");
    conv.user_id = parsed_array[0].at("user_id");
    conv.title = parsed_array[0].at("title");
    conv.created_at = parsed_array[0].at("created_at");
    conv.updated_at = parsed_array[0].at("updated_at");
    return conv;
}

void DBClient::delete_conversation(const std::string& conversation_id) {
    std::string endpoint = "conversations?id=eq." + conversation_id;
    make_request("DELETE", endpoint);
}

Message DBClient::create_message(const std::map<std::string, std::string>& data) {
    std::ostringstream json_body;
    json_body << "{\"conversation_id\":\"" << data.at("conversation_id")
              << "\",\"role\":\"" << data.at("role")
              << "\",\"content\":\"" << data.at("content") << "\"}";
    
    std::string response = make_request("POST", "messages", json_body.str());
    auto parsed = parse_json(response);
    
    Message msg;
    msg.id = parsed.at("id");
    msg.conversation_id = parsed.at("conversation_id");
    msg.role = parsed.at("role");
    msg.content = parsed.at("content");
    msg.created_at = parsed.at("created_at");
    return msg;
}

Message DBClient::get_message(const std::string& message_id) {
    std::string endpoint = "messages?id=eq." + message_id;
    std::string response = make_request("GET", endpoint);
    auto parsed_array = parse_json_array(response);
    
    if (parsed_array.empty()) {
        throw std::runtime_error("Message not found");
    }
    
    Message msg;
    msg.id = parsed_array[0].at("id");
    msg.conversation_id = parsed_array[0].at("conversation_id");
    msg.role = parsed_array[0].at("role");
    msg.content = parsed_array[0].at("content");
    msg.created_at = parsed_array[0].at("created_at");
    return msg;
}

std::vector<Message> DBClient::list_messages(const std::string& conversation_id, const std::map<std::string, std::string>& filters) {
    std::ostringstream endpoint;
    endpoint << "messages?conversation_id=eq." << conversation_id;
    
    if (filters.count("limit")) {
        endpoint << "&limit=" << filters.at("limit");
    }
    if (filters.count("offset")) {
        endpoint << "&offset=" << filters.at("offset");
    }
    endpoint << "&order=created_at.asc";
    
    std::string response = make_request("GET", endpoint.str());
    auto parsed_array = parse_json_array(response);
    
    std::vector<Message> messages;
    for (const auto& item : parsed_array) {
        Message msg;
        msg.id = item.at("id");
        msg.conversation_id = item.at("conversation_id");
        msg.role = item.at("role");
        msg.content = item.at("content");
        msg.created_at = item.at("created_at");
        messages.push_back(msg);
    }
    
    return messages;
}

Snapshot DBClient::create_snapshot(const std::map<std::string, std::string>& data) {
    std::ostringstream json_body;
    json_body << "{\"conversation_id\":\"" << data.at("conversation_id")
              << "\",\"state\":" << data.at("state") << "}";
    
    if (data.count("message_id")) {
        json_body << ",\"message_id\":\"" << data.at("message_id") << "\"";
    }
    if (data.count("description")) {
        json_body << ",\"description\":\"" << data.at("description") << "\"";
    }
    
    std::string response = make_request("POST", "snapshots", json_body.str());
    auto parsed = parse_json(response);
    
    Snapshot snap;
    snap.id = parsed.at("id");
    snap.conversation_id = parsed.at("conversation_id");
    snap.message_id = parsed.count("message_id") ? parsed.at("message_id") : "";
    snap.description = parsed.count("description") ? parsed.at("description") : "";
    snap.state = parsed.at("state");
    snap.created_at = parsed.at("created_at");
    return snap;
}

Snapshot DBClient::get_snapshot(const std::string& snapshot_id) {
    std::string endpoint = "snapshots?id=eq." + snapshot_id;
    std::string response = make_request("GET", endpoint);
    auto parsed_array = parse_json_array(response);
    
    if (parsed_array.empty()) {
        throw std::runtime_error("Snapshot not found");
    }
    
    Snapshot snap;
    snap.id = parsed_array[0].at("id");
    snap.conversation_id = parsed_array[0].at("conversation_id");
    snap.message_id = parsed_array[0].count("message_id") ? parsed_array[0].at("message_id") : "";
    snap.description = parsed_array[0].count("description") ? parsed_array[0].at("description") : "";
    snap.state = parsed_array[0].at("state");
    snap.created_at = parsed_array[0].at("created_at");
    return snap;
}

std::vector<Snapshot> DBClient::list_snapshots(const std::string& conversation_id) {
    std::string endpoint = "snapshots?conversation_id=eq." + conversation_id + "&order=created_at.desc";
    std::string response = make_request("GET", endpoint);
    auto parsed_array = parse_json_array(response);
    
    std::vector<Snapshot> snapshots;
    for (const auto& item : parsed_array) {
        Snapshot snap;
        snap.id = item.at("id");
        snap.conversation_id = item.at("conversation_id");
        snap.message_id = item.count("message_id") ? item.at("message_id") : "";
        snap.description = item.count("description") ? item.at("description") : "";
        snap.state = item.at("state");
        snap.created_at = item.at("created_at");
        snapshots.push_back(snap);
    }
    
    return snapshots;
}

void DBClient::delete_snapshot(const std::string& snapshot_id) {
    std::string endpoint = "snapshots?id=eq." + snapshot_id;
    make_request("DELETE", endpoint);
}

} // namespace db_client

