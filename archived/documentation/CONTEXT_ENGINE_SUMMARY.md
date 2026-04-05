# Context Engine Implementation Summary

## What Was Built

A comprehensive **Context Engine** for the Mermaid Live Editor chat system that intelligently tracks conversation context, user intent, diagram changes, and errors to provide more relevant AI responses.

## Files Created/Modified

### New Files

1. **`/src/lib/chat/context-engine.ts`** (390 lines)

   - Core context engine implementation
   - Context tracking and analysis
   - Intent extraction
   - Relevance scoring
   - Context-aware prompt generation

2. **`/src/lib/components/ContextInsights.svelte`** (119 lines)

   - Visual component displaying context insights
   - Shows mode, diagram type, recent actions, changes, and errors
   - Collapsible UI with clean design

3. **`/docs/CONTEXT_ENGINE.md`**
   - Complete documentation
   - API reference
   - Usage examples
   - Architecture overview

### Modified Files

1. **`/src/lib/components/Chat.svelte`**
   - Integrated context engine
   - Added context tracking on mount
   - Update context after messages
   - Track errors in context
   - Use context-aware prompts
   - Display ContextInsights component

## Key Features

### 1. Context Tracking

- **Diagram State**: Current code and diagram type
- **User Intent**: Automatically detected from messages (create, modify, fix, explain, style, etc.)
- **Conversation History**: Recent messages with relevance scoring
- **Diagram Changes**: Tracks additions, deletions, and modifications
- **Error Context**: Records errors for better recovery

### 2. Intelligent Analysis

- **Intent Extraction**: Detects 8 different user intents
- **Mode Inference**: Automatically switches between create/edit modes
- **Relevance Scoring**: Time-based decay + type-based importance
- **Change Detection**: Describes what changed in diagrams

### 3. Context-Aware Prompts

Generates enhanced system prompts including:

- Current diagram state
- Recent changes
- User's recent actions
- Error history
- Conversation summary

### 4. Visual Insights

The ContextInsights component shows users:

- Current mode (create/edit)
- Diagram type
- Recent actions (as badges)
- Recent changes (bulleted list)
- Error history (if any)
- Conversation summary

## How It Works

### Flow Diagram

```
User Message
    ↓
Update Context (track intent, changes)
    ↓
Build Conversation Context
    ↓
Generate Contextual Prompt
    ↓
Enhanced Instruction to AI
    ↓
AI Response
    ↓
Update Context (track changes, errors)
    ↓
Display Context Insights
```

### Example Usage

**User sends:** "Add a decision node to the flowchart"

**Context Engine detects:**

- Intent: `add`
- Mode: `edit`
- Diagram Type: `flowchart`

**Enhanced Prompt includes:**

````
You are helping the user modify an existing Mermaid diagram.
Current diagram type: flowchart
Current diagram:
```mermaid
flowchart TD
    A[Start] --> B[Process]
````

Context: Discussion about flowchart diagrams
Recent changes: Added 2 line(s)
User has been: add, modify

Reply with ONLY the new Mermaid syntax lines to add...

````

## Benefits

1. **Better AI Responses**: Context-aware prompts = more relevant suggestions
2. **Conversation Continuity**: Maintains flow across multiple messages
3. **Error Recovery**: Tracks errors to avoid repeating mistakes
4. **User Transparency**: Shows what context is being used
5. **Adaptive Behavior**: Learns from user patterns

## Technical Highlights

### Relevance Scoring Algorithm
```typescript
relevance = timeScore * typeScore

timeScore = max(0, 1 - (age / maxAge))
typeScore = importance[contextType]
````

### Intent Detection

Uses regex patterns to detect user intent:

- `create|make|generate` → create
- `change|update|modify` → modify
- `fix|correct|repair` → fix
- `add|include|insert` → add
- etc.

### Context Persistence

- Export: `contextEngine.exportContext(conversationId)`
- Import: `contextEngine.importContext(conversationId, data)`
- Clear: `contextEngine.clearContext(conversationId)`

## Testing

The dev server is running at: **http://localhost:3002**

### Test Scenarios

1. **Create Mode**

   - Send: "Create a flowchart"
   - Check: Context shows mode=create

2. **Edit Mode**

   - Send: "Add a node"
   - Check: Context shows mode=edit, intent=add

3. **Error Tracking**

   - Trigger an error
   - Check: Context shows error in history

4. **Context Insights**
   - Click to expand Context Insights
   - Verify all sections display correctly

## Bug Fixes Included

Also fixed the original issue where chat wasn't working for 2 user messages:

- **Problem**: Race condition in message persistence
- **Solution**: Persist user messages BEFORE sending to chat API
- **Location**: `/src/lib/components/Chat.svelte` lines 623-635

## Future Enhancements

- Vector embeddings for semantic search
- ML-based intent classification
- Cross-conversation context
- Context compression for long chats
- Advanced visualization tools
- User preference learning

## Performance

- **Memory**: Limits to 50 context items per conversation
- **History**: Keeps last 10 messages for analysis
- **Cleanup**: Auto-removes contexts older than 24 hours
- **Relevance**: Only top 10 most relevant contexts used

## Architecture

```
Chat Component
    ↓
Context Engine (Singleton)
    ↓
Context Items (Map<conversationId, ContextItem[]>)
    ↓
Conversation Context (Built on demand)
    ↓
Context Insights UI (Visual display)
```

## API Surface

```typescript
// Main API
contextEngine.buildConversationContext(id, messages, state);
contextEngine.trackDiagramChange(id, oldCode, newCode);
contextEngine.trackError(id, error);
contextEngine.generateContextualPrompt(context);
contextEngine.getRelevantContexts(id, limit);

// Persistence
contextEngine.exportContext(id);
contextEngine.importContext(id, data);
contextEngine.clearContext(id);
```

## Documentation

Full documentation available at: `/docs/CONTEXT_ENGINE.md`

## Status

✅ **Complete and Ready for Testing**

All features implemented, integrated, and documented. The context engine is now active in the chat system and will automatically enhance all AI interactions.
