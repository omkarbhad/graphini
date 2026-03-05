# WASM Movement Calculations Module

This directory contains the WebAssembly (WASM) module for high-performance movement and calculation operations in Graphinix.

## Overview

The WASM module provides optimized C++ implementations of computationally intensive operations:

- **Freehand Drawing Smoothing**: Advanced smoothing algorithms for drawing operations
- **Movement Calculations**: Coordinate transformations, drag offsets, bounds calculations
- **Batch Operations**: Optimized processing for multiple points/elements

## Building

### Prerequisites

- **Emscripten**: Install via Homebrew:
  ```bash
  brew install emscripten
  ```

### Build Commands

```bash
# Default build (optimized)
make

# Production build (maximum optimization)
make prod

# Development build (with debug symbols)
make dev

# Clean build artifacts
make clean

# Clean and rebuild
make rebuild
```

## Output Files

After building, the following files are generated in `dist/`:

- `movement-calculations.js` - JavaScript glue code and module loader
- `movement-calculations.wasm` - Compiled WebAssembly binary

## Integration

The WASM module is automatically integrated into the application through TypeScript wrappers:

- `movement-calculations.ts` - WASM smoother bindings
- `movement-utils.ts` - WASM movement calculation utilities

These wrappers provide:
- **Automatic fallback**: Falls back to JavaScript if WASM fails to load
- **Hybrid mode**: Uses WASM when available, JS when needed
- **Type safety**: Full TypeScript support

## Usage Example

```typescript
import { MovementCalculationsHybrid } from './wasm/movement-utils';

const movementCalc = new MovementCalculationsHybrid();

// Calculate drag offset
const offset = await movementCalc.calculateDragOffset(currentPoint, originPoint);

// Batch apply offset to multiple points
const updatedPoints = await movementCalc.batchApplyOffset(points, offset);

// Calculate bounds
const bounds = await movementCalc.calculateBounds(points);
```

## Performance Benefits

WASM provides significant performance improvements for:

- **Batch operations**: Processing hundreds of points simultaneously
- **Complex calculations**: Bounds, offsets, transformations
- **Smoothing algorithms**: Real-time smoothing of drawing strokes

The module automatically falls back to JavaScript implementations if WASM is unavailable, ensuring compatibility across all environments.

## Architecture

### C++ Source (`src/movement-calculations.cpp`)

Contains the core C++ implementation:
- `FreehandSmoother` class - Drawing smoothing algorithms
- Movement calculation utilities
- Coordinate transformation functions

### TypeScript Wrappers

- `movement-calculations.ts` - Freehand smoother bindings
- `movement-utils.ts` - General movement calculation utilities

Both provide hybrid implementations that gracefully fall back to JavaScript when needed.

## Development

When modifying C++ code:

1. Edit `src/movement-calculations.cpp`
2. Run `make rebuild` to rebuild
3. Test changes in the application

The module is automatically loaded by the application when needed.

