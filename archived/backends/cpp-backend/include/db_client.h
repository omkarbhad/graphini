#pragma once

#include <string>
#include <vector>
#include <memory>
#include <map>
#include <tuple>

namespace db_client {

struct Conversation {
    std::string id;
    std::string user_id;
    std::string title;
    std::string created_at;
    std::string updated_at;
    std::map<std::string, std::string> metadata;
    
    std::map<std::string, std::string> to_dict() const;
};

struct Message {
    std::string id;
    std::string conversation_id;
    std::string role;
    std::string content;
    std::string parts; // JSON string
    std::string created_at;
    std::map<std::string, std::string> metadata;
    
    std::map<std::string, std::string> to_dict() const;
};

struct Snapshot {
    std::string id;
    std::string conversation_id;
    std::string message_id;
    std::string description;
    std::string state; // JSON string
    std::string created_at;
    
    std::map<std::string, std::string> to_dict() const;
};

class DBClient {
public:
    DBClient(const std::string& supabase_url, const std::string& supabase_key);
    
    // Conversation operations
    Conversation create_conversation(const std::map<std::string, std::string>& data);
    Conversation get_conversation(const std::string& conversation_id);
    std::vector<Conversation> list_conversations(const std::map<std::string, std::string>& filters = {});
    Conversation update_conversation(const std::string& conversation_id, const std::map<std::string, std::string>& data);
    void delete_conversation(const std::string& conversation_id);
    
    // Message operations
    Message create_message(const std::map<std::string, std::string>& data);
    Message get_message(const std::string& message_id);
    std::vector<Message> list_messages(const std::string& conversation_id, const std::map<std::string, std::string>& filters = {});
    
    // Snapshot operations
    Snapshot create_snapshot(const std::map<std::string, std::string>& data);
    Snapshot get_snapshot(const std::string& snapshot_id);
    std::vector<Snapshot> list_snapshots(const std::string& conversation_id);
    void delete_snapshot(const std::string& snapshot_id);
    
private:
    std::string supabase_url_;
    std::string supabase_key_;
    
    // Make HTTP request to Supabase
    std::string make_request(
        const std::string& method,
        const std::string& endpoint,
        const std::string& body = ""
    );
    
    // Parse JSON response
    std::map<std::string, std::string> parse_json(const std::string& json_str);
    std::vector<std::map<std::string, std::string>> parse_json_array(const std::string& json_str);
};

} // namespace db_client

