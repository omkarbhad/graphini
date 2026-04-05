#pragma once

#include <string>
#include <map>
#include <chrono>
#include <mutex>

struct RateLimitEntry {
    int count;
    std::chrono::system_clock::time_point reset_at;
};

class RateLimiter {
public:
    RateLimiter(int window_ms = 60000, int max_requests = 10);
    
    // Check rate limit and update count
    // Returns: (allowed, remaining, reset_time)
    std::tuple<bool, int, std::chrono::system_clock::time_point> check_rate_limit(const std::string& client_id);
    
    // Clean up expired entries
    void cleanup_expired();
    
private:
    int window_ms_;
    int max_requests_;
    std::map<std::string, RateLimitEntry> store_;
    std::mutex mutex_;
};

