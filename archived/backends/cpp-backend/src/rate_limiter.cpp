#include "rate_limiter.h"
#include <algorithm>

RateLimiter::RateLimiter(int window_ms, int max_requests)
    : window_ms_(window_ms), max_requests_(max_requests) {
}

std::tuple<bool, int, std::chrono::system_clock::time_point> RateLimiter::check_rate_limit(const std::string& client_id) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    auto now = std::chrono::system_clock::now();
    auto& entry = store_[client_id];
    
    // Check if window has expired
    if (entry.reset_at < now) {
        entry.count = 1;
        entry.reset_at = now + std::chrono::milliseconds(window_ms_);
        return std::make_tuple(true, max_requests_ - 1, entry.reset_at);
    }
    
    // Check if limit exceeded
    if (entry.count >= max_requests_) {
        return std::make_tuple(false, 0, entry.reset_at);
    }
    
    // Increment count
    entry.count++;
    int remaining = max_requests_ - entry.count;
    return std::make_tuple(true, remaining, entry.reset_at);
}

void RateLimiter::cleanup_expired() {
    std::lock_guard<std::mutex> lock(mutex_);
    
    auto now = std::chrono::system_clock::now();
    
    auto it = store_.begin();
    while (it != store_.end()) {
        if (it->second.reset_at < now) {
            it = store_.erase(it);
        } else {
            ++it;
        }
    }
}

