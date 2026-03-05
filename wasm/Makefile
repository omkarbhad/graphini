# Emscripten build configuration for movement calculations WASM module

EMCC=emcc
EMXX=em++
EMAR=emar

# Compiler flags
CXXFLAGS=-std=c++17 -O3 -flto -Wall -Wextra
EMFLAGS=--bind -s WASM=1 -s MODULARIZE=1 -s EXPORT_ES6=1 -s ENVIRONMENT=web
EMFLAGS+=-s ALLOW_MEMORY_GROWTH=1 -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap']

# Source files
SRC_DIR=src
BUILD_DIR=dist
SOURCES=$(SRC_DIR)/movement-calculations.cpp
TARGET=$(BUILD_DIR)/movement-calculations.js
TARGET_WASM=$(BUILD_DIR)/movement-calculations.wasm

# Default target
all: $(TARGET) $(TARGET_WASM)

# Build the WASM module
$(TARGET): $(SOURCES)
	@mkdir -p $(BUILD_DIR)
	$(EMXX) $(CXXFLAGS) $(EMFLAGS) -o $@ $(SOURCES)

# Clean build artifacts
clean:
	rm -rf $(BUILD_DIR)

# Clean and rebuild
rebuild: clean all

# Development build with debug info
dev:
	@mkdir -p $(BUILD_DIR)
	$(EMXX) $(CXXFLAGS) -g -O0 $(EMFLAGS) -s ASSERTIONS=1 -o $(BUILD_DIR)/movement-calculations.js $(SOURCES)

# Production build with optimizations
prod:
	@mkdir -p $(BUILD_DIR)
	$(EMXX) $(CXXFLAGS) -Oz -flto $(EMFLAGS) -s ASSERTIONS=0 -o $(BUILD_DIR)/movement-calculations.js $(SOURCES)

.PHONY: all clean rebuild dev prod
