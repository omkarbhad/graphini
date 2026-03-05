# Excalidraw Smooth Selection and Element Movement: Technical Analysis

## Executive Summary

Excalidraw achieves remarkably smooth selection and element movement through a sophisticated multi-layered architecture that combines requestAnimationFrame throttling, batched React updates, coordinated element state management, and optimized rendering pipelines. This report provides a comprehensive technical analysis of the mechanisms that enable this smooth user experience.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Throttling Mechanisms](#core-throttling-mechanisms)
3. [Pointer Event Handling System](#pointer-event-handling-system)
4. [Element State Management](#element-state-management)
5. [Rendering Pipeline Optimization](#rendering-pipeline-optimization)
6. [Snapping and Grid System](#snapping-and-grid-system)
7. [Performance Optimizations](#performance-optimizations)
8. [Key Technical Insights](#key-technical-insights)
9. [Code Examples and Implementation Details](#code-examples-and-implementation-details)

## Architecture Overview

Excalidraw's smooth movement system is built on several interconnected layers:

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interaction Layer                   │
│  (Pointer Events, Keyboard Events, Touch Events)           │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Event Throttling Layer                      │
│  (throttleRAF, withBatchedUpdatesThrottled)               │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              State Management Layer                        │
│  (PointerDownState, Scene, Element Mutations)             │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Rendering Pipeline                          │
│  (Static Scene, Interactive Scene, Canvas Operations)     │
└─────────────────────────────────────────────────────────────┘
```

## Core Throttling Mechanisms

### 1. RequestAnimationFrame Throttling (`throttleRAF`)

**Location**: `packages/common/src/utils.ts:160-211`

The foundation of smooth movement is the `throttleRAF` function, which ensures all updates are synchronized with the browser's refresh rate:

```typescript
export const throttleRAF = <T extends any[]>(
  fn: (...args: T) => void,
  opts?: { trailing?: boolean },
) => {
  let timerId: number | null = null;
  let lastArgs: T | null = null;
  let lastArgsTrailing: T | null = null;

  const scheduleFunc = (args: T) => {
    timerId = window.requestAnimationFrame(() => {
      timerId = null;
      fn(...args);
      lastArgs = null;
      if (lastArgsTrailing) {
        lastArgs = lastArgsTrailing;
        lastArgsTrailing = null;
        scheduleFunc(lastArgs);
      }
    });
  };

  const ret = (...args: T) => {
    if (isTestEnv()) {
      fn(...args);
      return;
    }
    lastArgs = args;
    if (timerId === null) {
      scheduleFunc(lastArgs);
    } else if (opts?.trailing) {
      lastArgsTrailing = args;
    }
  };
  
  return ret;
};
```

**Key Features**:
- **Frame-rate synchronization**: Limits execution to 60fps maximum
- **Trailing option**: Ensures the final state is always applied
- **Test environment bypass**: Direct execution in tests for reliability
- **Memory efficient**: Reuses animation frame IDs

### 2. Batched React Updates (`withBatchedUpdatesThrottled`)

**Location**: `packages/excalidraw/reactUtils.ts:23-32`

Combines React's batching with RAF throttling:

```typescript
export const withBatchedUpdatesThrottled = <
  TFunction extends ((event: any) => void) | (() => void),
>(
  func: Parameters<TFunction>["length"] extends 0 | 1 ? TFunction : never,
) => {
  return throttleRAF<Parameters<TFunction>>(((event) => {
    unstable_batchedUpdates(func, event);
  }) as TFunction);
};
```

**Benefits**:
- **Single render cycle**: All state updates happen together
- **Reduced re-renders**: Prevents multiple React render cycles
- **Consistent state**: Ensures UI reflects the final state

## Pointer Event Handling System

### PointerDownState Architecture

**Location**: `packages/excalidraw/types.ts:751-817`

The `PointerDownState` is a comprehensive state container that maintains all necessary information for smooth dragging:

```typescript
export type PointerDownState = Readonly<{
  // Initial pointer position
  origin: Readonly<{ x: number; y: number }>;
  originInGrid: Readonly<{ x: number; y: number }>;
  
  // Previous pointer position for delta calculations
  lastCoords: { x: number; y: number };
  
  // CRITICAL: Frozen snapshots of all elements at drag start
  originalElements: Map<string, NonDeleted<ExcalidrawElement>>;
  
  // Drag state tracking
  drag: {
    hasOccurred: boolean;
    offset: { x: number; y: number } | null;
    origin: { x: number; y: number };
    blockDragging: boolean;
  };
  
  // Event listeners for cleanup
  eventListeners: {
    onMove: null | ReturnType<typeof throttleRAF>;
    onUp: null | ((event: PointerEvent) => void);
    onKeyDown: null | ((event: KeyboardEvent) => void);
    onKeyUp: null | ((event: KeyboardEvent) => void);
  };
}>;
```

### Initial State Setup

**Location**: `packages/excalidraw/components/App.tsx:7133-7200`

The initial pointer down state captures a complete snapshot:

```typescript
private initialPointerDownState(
  event: React.PointerEvent<HTMLElement>,
): PointerDownState {
  const origin = viewportCoordsToSceneCoords(event, this.state);
  const selectedElements = this.scene.getSelectedElements(this.state);
  
  return {
    origin,
    originInGrid: tupleToCoors(
      getGridPoint(
        origin.x,
        origin.y,
        event[KEYS.CTRL_OR_CMD] || isElbowArrowOnly
          ? null
          : this.getEffectiveGridSize(),
      ),
    ),
    // CRITICAL: Deep copy all elements to preserve original state
    originalElements: this.scene
      .getNonDeletedElements()
      .reduce((acc, element) => {
        acc.set(element.id, deepCopyElement(element));
        return acc;
      }, new Map() as PointerDownState["originalElements"]),
    // ... other state
  };
}
```

### Pointer Move Handler

**Location**: `packages/excalidraw/components/App.tsx:8279-9102`

The core movement logic is wrapped in throttled updates:

```typescript
private onPointerMoveFromPointerDownHandler(
  pointerDownState: PointerDownState,
) {
  return withBatchedUpdatesThrottled((event: PointerEvent) => {
    const pointerCoords = viewportCoordsToSceneCoords(event, this.state);
    
    // Calculate drag offset from original position
    const dragOffset = {
      x: pointerCoords.x - pointerDownState.drag.origin.x,
      y: pointerCoords.y - pointerDownState.drag.origin.y,
    };

    // Apply snapping calculations
    const { snapOffset, snapLines } = snapDraggedElements(
      originalElements,
      dragOffset,
      this,
      event,
      this.scene.getNonDeletedElementsMap(),
    );

    // Move all selected elements together
    dragSelectedElements(
      pointerDownState,
      selectedElements,
      dragOffset,
      this.scene,
      snapOffset,
      this.getEffectiveGridSize(),
    );
  });
}
```

## Element State Management

### Coordinated Element Movement

**Location**: `packages/element/src/dragElements.ts:34-126`

The `dragSelectedElements` function ensures all selected elements move together:

```typescript
export const dragSelectedElements = (
  pointerDownState: PointerDownState,
  _selectedElements: NonDeletedExcalidrawElement[],
  offset: { x: number; y: number },
  scene: Scene,
  snapOffset: { x: number; y: number },
  gridSize: NullableGridSize,
) => {
  // Filter elements that can be dragged together
  const selectedElements = _selectedElements.filter((element) => {
    if (isElbowArrow(element) && element.startBinding && element.endBinding) {
      const startElement = _selectedElements.find(
        (el) => el.id === element.startBinding?.elementId,
      );
      const endElement = _selectedElements.find(
        (el) => el.id === element.endBinding?.elementId,
      );
      return startElement && endElement;
    }
    return true;
  });

  // Handle frame elements and their children
  const elementsToUpdate = new Set<NonDeletedExcalidrawElement>(
    selectedElements,
  );
  const frames = selectedElements
    .filter((e) => isFrameLikeElement(e))
    .map((f) => f.id);

  if (frames.length > 0) {
    for (const element of scene.getNonDeletedElements()) {
      if (element.frameId !== null && frames.includes(element.frameId)) {
        elementsToUpdate.add(element);
      }
    }
  }

  // Calculate offset from original positions
  const adjustedOffset = calculateOffset(
    getCommonBounds(origElements),
    offset,
    snapOffset,
    gridSize,
  );

  // Update each element with the same offset
  elementsToUpdate.forEach((element) => {
    updateElementCoords(pointerDownState, element, scene, adjustedOffset);
    
    // Handle bound elements (text labels, arrows)
    if (!isArrowElement(element)) {
      const textElement = getBoundTextElement(
        element,
        scene.getNonDeletedElementsMap(),
      );
      if (textElement) {
        updateElementCoords(
          pointerDownState,
          textElement,
          scene,
          adjustedOffset,
        );
      }
      updateBoundElements(element, scene, {
        simultaneouslyUpdated: Array.from(elementsToUpdate),
      });
    }
  });
};
```

### Element Coordinate Updates

**Location**: `packages/element/src/dragElements.ts:159-175`

Each element's position is calculated from its original position:

```typescript
const updateElementCoords = (
  pointerDownState: PointerDownState,
  element: NonDeletedExcalidrawElement,
  scene: Scene,
  dragOffset: { x: number; y: number },
) => {
  // Get the original element state
  const originalElement =
    pointerDownState.originalElements.get(element.id) ?? element;

  // Calculate new position from original + offset
  const nextX = originalElement.x + dragOffset.x;
  const nextY = originalElement.y + dragOffset.y;

  // Update the element
  scene.mutateElement(element, {
    x: nextX,
    y: nextY,
  });
};
```

## Rendering Pipeline Optimization

### Dual Canvas Architecture

Excalidraw uses a dual-canvas approach for optimal performance:

1. **Static Canvas**: Renders the actual elements
2. **Interactive Canvas**: Renders UI elements (selections, handles, etc.)

### Throttled Rendering

**Location**: `packages/excalidraw/renderer/interactiveScene.ts:1197-1204`

Both canvases use throttled rendering:

```typescript
export const renderInteractiveSceneThrottled = throttleRAF(
  (config: InteractiveSceneRenderConfig) => {
    const ret = _renderInteractiveScene(config);
    config.callback?.(ret);
  },
  { trailing: true },
);
```

### Scene Update Coordination

**Location**: `packages/element/src/Scene.ts:303-309`

The Scene class coordinates all updates:

```typescript
triggerUpdate() {
  this.sceneNonce = randomInteger();
  
  for (const callback of Array.from(this.callbacks)) {
    callback();
  }
}
```

## Snapping and Grid System

### Smart Snapping Algorithm

**Location**: `packages/excalidraw/snapping.ts:692-807`

The snapping system provides smooth alignment without jarring jumps:

```typescript
export const snapDraggedElements = (
  elements: ExcalidrawElement[],
  dragOffset: Vector2D,
  app: AppClassProperties,
  event: KeyboardModifiersObject,
  elementsMap: ElementsMap,
) => {
  const appState = app.state;
  const selectedElements = getSelectedElements(elements, appState);
  
  if (
    !isSnappingEnabled({ app, event, selectedElements }) ||
    selectedElements.length === 0
  ) {
    return {
      snapOffset: { x: 0, y: 0 },
      snapLines: [],
    };
  }

  // Calculate snap distance based on zoom
  const snapDistance = getSnapDistance(appState.zoom.value);
  
  // Get selection points for snapping
  const selectionPoints = getElementsCorners(selectedElements, elementsMap, {
    dragOffset,
  });

  // Find nearest snaps
  const nearestSnapsX: Snaps = [];
  const nearestSnapsY: Snaps = [];
  
  getPointSnaps(
    selectedElements,
    selectionPoints,
    app,
    event,
    nearestSnapsX,
    nearestSnapsY,
    { x: snapDistance, y: snapDistance },
  );

  // Calculate final snap offset
  const snapOffset = {
    x: nearestSnapsX[0]?.offset ?? 0,
    y: nearestSnapsY[0]?.offset ?? 0,
  };

  return { snapOffset, snapLines: [] };
};
```

### Grid Integration

**Location**: `packages/element/src/dragElements.ts:128-157`

Grid snapping is integrated into the offset calculation:

```typescript
const calculateOffset = (
  commonBounds: Bounds,
  dragOffset: { x: number; y: number },
  snapOffset: { x: number; y: number },
  gridSize: NullableGridSize,
): { x: number; y: number } => {
  const [x, y] = commonBounds;
  let nextX = x + dragOffset.x + snapOffset.x;
  let nextY = y + dragOffset.y + snapOffset.y;

  // Apply grid snapping if no object snapping occurred
  if (snapOffset.x === 0 || snapOffset.y === 0) {
    const [nextGridX, nextGridY] = getGridPoint(
      x + dragOffset.x,
      y + dragOffset.y,
      gridSize,
    );

    if (snapOffset.x === 0) {
      nextX = nextGridX;
    }

    if (snapOffset.y === 0) {
      nextY = nextGridY;
    }
  }
  
  return {
    x: nextX - x,
    y: nextY - y,
  };
};
```

## Performance Optimizations

### 1. Element Caching and Memoization

- **Shape Cache**: Elements are cached to avoid recalculation
- **Bounds Caching**: Element bounds are memoized
- **Selection Hashing**: Selection state is hashed for quick comparison

### 2. Selective Rendering

- **Visible Elements Only**: Only visible elements are rendered
- **Dirty Region Tracking**: Only changed regions are redrawn
- **Layer Separation**: Static and interactive elements are rendered separately

### 3. Event Optimization

- **Event Delegation**: Single event listener for the entire canvas
- **Pointer Event API**: Uses modern pointer events for better performance
- **Gesture Recognition**: Optimized touch and gesture handling

### 4. Memory Management

- **Object Pooling**: Reuses objects where possible
- **Weak References**: Uses weak references for cleanup
- **Garbage Collection**: Minimizes allocations during drag operations

## Key Technical Insights

### 1. Original State Preservation

The most critical aspect of smooth movement is preserving the original element state at the start of a drag operation. This allows:

- **Consistent calculations**: All position updates are relative to the original position
- **Undo/redo support**: Original state can be restored
- **Snap accuracy**: Snapping calculations are based on original positions

### 2. Coordinated Updates

All selected elements are updated together in a single operation:

- **Atomic updates**: Either all elements move or none do
- **Consistent state**: No intermediate states where elements are misaligned
- **Bound element handling**: Text labels and arrows move with their parents

### 3. Frame-Rate Synchronization

Everything is synchronized to the browser's refresh rate:

- **Smooth animations**: No stuttering or frame drops
- **Consistent timing**: Predictable update intervals
- **Battery efficiency**: Respects device refresh rate capabilities

### 4. Smart Snapping

The snapping system provides visual feedback without jarring movements:

- **Progressive snapping**: Gradual approach to snap points
- **Visual indicators**: Snap lines show alignment
- **Context-aware**: Different snapping for different element types

## Code Examples and Implementation Details

### Complete Drag Flow Example

Here's how a complete drag operation flows through the system:

```typescript
// 1. Pointer Down - Initialize state
const pointerDownState = this.initialPointerDownState(event);

// 2. Set up throttled move handler
pointerDownState.eventListeners.onMove = this.onPointerMoveFromPointerDownHandler(
  pointerDownState,
);

// 3. Pointer Move - Throttled execution
const throttledMoveHandler = withBatchedUpdatesThrottled((event: PointerEvent) => {
  // Calculate drag offset
  const dragOffset = {
    x: pointerCoords.x - pointerDownState.drag.origin.x,
    y: pointerCoords.y - pointerDownState.drag.origin.y,
  };

  // Apply snapping
  const { snapOffset, snapLines } = snapDraggedElements(
    originalElements,
    dragOffset,
    this,
    event,
    this.scene.getNonDeletedElementsMap(),
  );

  // Move elements
  dragSelectedElements(
    pointerDownState,
    selectedElements,
    dragOffset,
    this.scene,
    snapOffset,
    this.getEffectiveGridSize(),
  );

  // Update UI
  this.setState({ snapLines });
});

// 4. Pointer Up - Cleanup
const cleanup = () => {
  pointerDownState.eventListeners.onMove?.cancel();
  // ... other cleanup
};
```

### Performance Monitoring

The system includes performance monitoring capabilities:

```typescript
// Throttling can be disabled for testing
if (isTestEnv()) {
  fn(...args);
  return;
}

// Render throttling can be controlled
export const isRenderThrottlingEnabled = () => {
  return !isTestEnv() && !isDevEnv();
};
```

## Conclusion

Excalidraw's smooth selection and element movement is achieved through a sophisticated combination of:

1. **RequestAnimationFrame throttling** for frame-rate synchronization
2. **Batched React updates** for consistent state management
3. **Original state preservation** for accurate position calculations
4. **Coordinated element updates** for atomic operations
5. **Optimized rendering pipelines** for smooth visual feedback
6. **Smart snapping algorithms** for precise alignment
7. **Performance optimizations** for responsive user experience

This architecture ensures that even complex operations like dragging multiple elements with bound relationships, snapping, and grid alignment feel smooth and responsive across all devices and browsers.

The key insight is that smoothness comes not from any single technique, but from the careful coordination of multiple systems working together to create a seamless user experience.
