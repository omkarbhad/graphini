# AI Chat Refactoring Guide

## Overview

The AI chat implementation has been refactored to follow industry-standard patterns and best practices. This document outlines the changes and migration path.

## Problems Addressed

### Before Refactoring

- **2153-line monolithic Chat.svelte** - violated single responsibility principle
- **20+ scattered state variables** - difficult to track and debug
- **400+ lines of parsing logic** - overly complex semantic content parsing
- **Mixed concerns** - UI, business logic, API calls, and parsing in one file
- **Tight coupling** - Chat UI directly coupled to API implementation
- **Complex tool handling** - nested switch statements with 10+ cases
- **708-line API handler** - monolithic POST function
- **No service layer** - business logic in route handlers

### After Refactoring

- **Separated concerns** - UI, business logic, and API are decoupled
- **Centralized state** - single source of truth via message store
- **Service layer** - reusable chat service for business logic
- **Modular components** - small, focused Svelte components
- **Simplified streaming** - clean event handling
- **Type safety** - comprehensive TypeScript types
- **Testable code** - each layer can be tested independently

## New Architecture

```
src/lib/chat/
├── types.ts              # Shared type definitions
├── chat-service.ts       # Business logic & API communication
├── message-store.ts      # Centralized state management
└── api-client.ts         # Existing API client (unchanged)

src/lib/components/chat/
├── ChatContainer.svelte  # Main container (orchestration)
├── ChatMessage.svelte    # Individual message display
└── ChatInput.svelte      # Message input form

src/lib/server/
└── chat-handler.ts       # Server-side chat processing

src/routes/api/
├── chat/+server.ts       # Original endpoint (keep for compatibility)
└── chat-v2/+server.ts    # New simplified endpoint
```

## Key Improvements

### 1. Type Safety

```typescript
// Before: any types, runtime errors
let messages: any[] = [];

// After: Strong typing
import type { ChatMessage, ChatState } from '$lib/chat/types';
const messages: ChatMessage[] = [];
```

### 2. State Management

```typescript
// Before: Scattered state
let messages = $state([]);
let status = $state('idle');
let error = $state(null);
// ... 20+ more state variables

// After: Centralized store
import { messageStore } from '$lib/chat/message-store';
messageStore.addMessage(message);
messageStore.setStatus('loading');
```

### 3. Service Layer

```typescript
// Before: API calls directly in components
const res = await fetch('/api/chat', { ... });
const reader = res.body?.getReader();
// ... 200+ lines of streaming logic

// After: Clean service interface
await chatService.sendMessage({
  conversationId,
  message,
  onStream: handleStreamEvent
});
```

### 4. Component Separation

```typescript
// Before: 2153-line Chat.svelte with everything

// After: Focused components
<ChatContainer>           // Orchestration
  <ChatMessage />         // Display logic
  <ChatInput />           // Input handling
</ChatContainer>
```

### 5. Simplified Server

```typescript
// Before: 708 lines with nested loops and state management

// After: Clean handler pattern
await chatHandler.handleRequest(request, {
  onText: (content) => { ... },
  onToolCall: (name, args) => { ... },
  onError: (error) => { ... },
  onDone: () => { ... }
});
```

## Migration Path

### Option 1: Gradual Migration (Recommended)

1. Keep existing `Chat.svelte` working
2. Use new components in new features
3. Gradually migrate existing features
4. Remove old code when confident

### Option 2: Direct Replacement

1. Replace `Chat.svelte` with `ChatContainer.svelte`
2. Update imports in parent components
3. Test thoroughly
4. Remove old files

## Usage Examples

### Basic Chat Implementation

```svelte
<script>
  import ChatContainer from '$lib/components/chat/ChatContainer.svelte';
</script>

<ChatContainer class="h-full" />
```

### Custom Message Handling

```svelte
<script>
  import { messageStore } from '$lib/chat/message-store';
  import { chatService } from '$lib/chat/chat-service';

  async function sendCustomMessage(text: string) {
    const conversationId = messageStore.conversationId;

    await chatService.sendMessage({
      conversationId,
      message: text,
      onStream: (event) => {
        if (event.type === 'diagram') {
          // Custom diagram handling
        }
      }
    });
  }
</script>
```

### Accessing Chat State

```svelte
<script>
  import { messageStore } from '$lib/chat/message-store';

  // Reactive access to chat state
  $: messages = messageStore.messages;
  $: status = messageStore.status;
  $: error = messageStore.error;
</script>

{#if status === 'loading'}
  <LoadingSpinner />
{/if}

{#each messages as message}
  <MessageDisplay {message} />
{/each}
```

## API Changes

### New Endpoint: `/api/chat-v2`

- Simplified request/response format
- Cleaner event types
- Better error handling
- Same streaming protocol

### Event Types

```typescript
// Text content
{ type: 'text', content: string }

// Diagram generation
{ type: 'diagram', name: string, diagram_type: string, mermaid_code: string }

// Error
{ type: 'error', message: string }

// Stream complete
{ type: 'done' }
```

## Testing

### Unit Tests

````typescript
import { chatService } from '$lib/chat/chat-service';

test('extracts mermaid code', () => {
  const content = '```mermaid\nflowchart TD\n```';
  const code = chatService.extractMermaidCode(content);
  expect(code).toBe('flowchart TD');
});
````

### Integration Tests

```typescript
import { messageStore } from '$lib/chat/message-store';

test('adds message to store', () => {
  messageStore.addMessage({ id: '1', role: 'user', content: 'test' });
  expect(messageStore.messages).toHaveLength(1);
});
```

## Performance Improvements

1. **Reduced bundle size** - Smaller components = better code splitting
2. **Efficient reactivity** - Centralized state reduces unnecessary updates
3. **Lazy loading** - Components can be loaded on demand
4. **Memory management** - Proper cleanup in service layer

## Breaking Changes

### Component API

- `Chat.svelte` props changed to `ChatContainer.svelte`
- `onClearChat` callback removed (use messageStore directly)
- Model selection moved to separate component

### State Access

- Direct state access replaced with store
- Use `messageStore.messages` instead of local state

### Event Handling

- Simplified event types
- Removed complex semantic parsing
- Tool calls handled in service layer

## Rollback Plan

If issues arise:

1. Revert to original `Chat.svelte`
2. Keep new files for future use
3. Report issues for investigation
4. No data loss - DB schema unchanged

## Next Steps

1. **Test new implementation** with existing features
2. **Monitor performance** in production
3. **Gather feedback** from team
4. **Iterate** based on learnings
5. **Remove old code** when stable

## Support

For questions or issues:

- Check this guide first
- Review code comments
- Test in development environment
- Report bugs with reproduction steps

## Summary

This refactoring brings the codebase in line with industry standards:

- ✅ Separation of concerns
- ✅ Type safety
- ✅ Testability
- ✅ Maintainability
- ✅ Performance
- ✅ Developer experience

The new architecture is more maintainable, testable, and follows React/Vue/Svelte best practices used across the industry.
