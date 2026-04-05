cmake_minimum_required(VERSION 3.15)
project(mermaid_backend_cpp)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Options
option(BUILD_TESTS "Build tests" OFF)

# Include directories
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/third_party)

# Find required packages
find_package(Threads REQUIRED)
find_package(OpenSSL REQUIRED)
find_package(CURL REQUIRED)
find_package(PkgConfig REQUIRED)

# Third-party dependencies (using FetchContent or external)
# For now, we'll assume they're in third_party directory
# You can use FetchContent, git submodules, or vcpkg

# Sources
set(SOURCES
    src/main.cpp
    src/ai_client.cpp
    src/db_client.cpp
    src/utils.cpp
    src/rate_limiter.cpp
)

# Headers
set(HEADERS
    include/ai_client.h
    include/db_client.h
    include/utils.h
    include/rate_limiter.h
)

# Executable
add_executable(mermaid_backend ${SOURCES} ${HEADERS})

# Link libraries
target_link_libraries(mermaid_backend
    PRIVATE
    Threads::Threads
    OpenSSL::SSL
    OpenSSL::Crypto
    CURL::libcurl
    ${CMAKE_DL_LIBS}
)

# Compiler-specific options
if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    target_compile_options(mermaid_backend PRIVATE -Wall -Wextra -Wpedantic)
endif()

# Install
install(TARGETS mermaid_backend DESTINATION bin)

