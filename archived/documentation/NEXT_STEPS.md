# Next Steps: Complete Chat Implementation

## ✅ What's Been Created

### API Endpoints (Complete)

- ✅ `/src/routes/api/chat/conversations/+server.ts` - List & create conversations
- ✅ `/src/routes/api/chat/conversations/[id]/+server.ts` - Get, update, delete conversation
- ✅ `/src/routes/api/chat/conversations/[id]/messages/+server.ts` - List & create messages
- ✅ `/src/routes/api/chat/snapshots/+server.ts` - List & create snapshots
- ✅ `/src/routes/api/chat/snapshots/[id]/+server.ts` - Get & delete snapshot

### Client Library (Complete)

- ✅ `/src/lib/chat/api-client.ts` - API client with retry logic

### UI Components (Complete)

- ✅ `/src/lib/components/ConversationList.svelte` - Sidebar with conversation list
- ✅ `/src/lib/components/ConversationSettings.svelte` - Settings dialog

### Database Infrastructure (Complete)

- ✅ `/database/schema.sql` - PostgreSQL schema
- ✅ `/database/README.md` - Setup guide
- ✅ `/src/lib/server/db.ts` - Database client

## 🚀 Immediate Actions Required

### 1. Install Dependencies

```bash
pnpm add @supabase/supabase-js
```

### 2. Set Up Supabase (10 minutes)

**Step-by-step:**

1. **Create Account**

   - Go to [https://supabase.com](https://supabase.com)
   - Sign up with GitHub or email

2. **Create Project**

   - Click "New Project"
   - Organization: Choose or create
   - Name: `mermaid-live-editor`
   - Database Password: Generate strong password (save it!)
   - Region: Choose closest to your users
   - Plan: Free tier

3. **Run Schema**

   - Go to **SQL Editor** in left sidebar
   - Click "New Query"
   - Open `/database/schema.sql` in your editor
   - Copy entire contents
   - Paste into Supabase SQL Editor
   - Click "Run" (bottom right)
   - Verify success (should see "Success. No rows returned")

4. **Verify Tables**

   - Go to **Table Editor** in left sidebar
   - Should see 4 tables:
     - `conversations`
     - `messages`
     - `snapshots`
     - `usage_stats`

5. **Get API Credentials**

   - Go to **Project Settings** (gear icon)
   - Click **API** in left menu
   - Copy these values:
     - **Project URL**: `https://xxxxx.supabase.co`
     - **anon public**: `eyJhbGc...` (long string)
     - **service_role**: `eyJhbGc...` (long string, keep secret!)

6. **Update Environment**
   - Open your `.env` file (create if doesn't exist)
   - Add these lines:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Chat Configuration
CHAT_MAX_CONVERSATIONS_PER_USER=10
CHAT_MAX_MESSAGES_PER_CONVERSATION=100
CHAT_CLEANUP_DAYS=30
```

7. **Test Connection**
   - Run: `pnpm dev`
   - Lint errors in `/src/lib/server/db.ts` should disappear
   - Visit: `http://localhost:5173/api/chat/conversations`
   - Should see: `{"conversations":[],"pagination":{...}}`

### 3. Update Chat Component (Required)

The existing `Chat.svelte` needs to be updated to use the new server-side storage. Here's what needs to change:

**File**: `/src/lib/components/Chat.svelte`

**Changes needed:**

1. **Add conversation state**

```typescript
import { createConversation, createMessage, listMessages } from '$lib/chat/api-client';

let currentConversationId = $state<string | null>(null);
let showConversationList = $state(false);
```

2. **Replace IndexedDB with API calls**

Replace this:

```typescript
// OLD: IndexedDB
repository = await createChatRepository();
const messages = await repository.loadMessages();
```

With this:

```typescript
// NEW: API
if (!currentConversationId) {
  const response = await createConversation({ title: 'New Chat' });
  currentConversationId = response.conversation.id;
}

const response = await listMessages(currentConversationId);
chat.messages = response.messages;
```

3. **Update message persistence**

Replace this:

```typescript
// OLD: IndexedDB
await repository.saveMessage(message);
```

With this:

```typescript
// NEW: API
await createMessage(currentConversationId!, {
  role: message.role,
  content: message.content,
  parts: message.parts
});
```

4. **Add conversation management**

```svelte
<script>
  import ConversationList from '$lib/components/ConversationList.svelte';
  import ConversationSettings from '$lib/components/ConversationSettings.svelte';
</script>

{#if showConversationList}
  <ConversationList
    {currentConversationId}
    onSelectConversation={handleSelectConversation}
    onNewConversation={handleNewConversation} />
{/if}
```

### 4. Test the Implementation

**Test API Endpoints:**

```bash
# List conversations
curl http://localhost:5173/api/chat/conversations

# Create conversation
curl -X POST http://localhost:5173/api/chat/conversations \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Conversation"}'

# Create message
curl -X POST http://localhost:5173/api/chat/conversations/CONVERSATION_ID/messages \
  -H "Content-Type: application/json" \
  -d '{"role":"user","content":"Hello"}'
```

**Test UI:**

1. Start dev server: `pnpm dev`
2. Navigate to chat interface
3. Send a message
4. Verify it appears in Supabase Table Editor
5. Refresh page - messages should persist
6. Create new conversation
7. Switch between conversations

## 📋 Optional Enhancements

### 1. Add Conversation Export

```typescript
// In ConversationSettings.svelte
async function exportConversation() {
  const response = await getConversation(conversation.id);
  const data = {
    conversation: response.conversation,
    messages: response.messages
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `conversation-${conversation.id}.json`;
  a.click();
}
```

### 2. Add Message Search

```typescript
// In Chat.svelte
let searchQuery = $state('');

const filteredMessages = $derived(
  chat.messages.filter((msg) => msg.content.toLowerCase().includes(searchQuery.toLowerCase()))
);
```

### 3. Add Keyboard Shortcuts

```typescript
// In Chat.svelte
onMount(() => {
  const handleKeydown = (e: KeyboardEvent) => {
    // Cmd/Ctrl + K: New conversation
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      handleNewConversation();
    }

    // Cmd/Ctrl + B: Toggle sidebar
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      showConversationList = !showConversationList;
    }
  };

  window.addEventListener('keydown', handleKeydown);
  return () => window.removeEventListener('keydown', handleKeydown);
});
```

### 4. Add Loading States

```svelte
{#if loading}
  <div class="flex items-center justify-center p-8">
    <div class="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
  </div>
{:else}
  <!-- Content -->
{/if}
```

### 5. Add Error Boundaries

```typescript
let error = $state<string | null>(null);

try {
  // API call
} catch (err) {
  error = err instanceof Error ? err.message : 'An error occurred';
  toast.error(error);
}
```

## 🧪 Testing Checklist

### API Tests

- [ ] Can create conversation
- [ ] Can list conversations
- [ ] Can get conversation with messages
- [ ] Can update conversation title
- [ ] Can delete conversation
- [ ] Can create message
- [ ] Can list messages (paginated)
- [ ] Can create snapshot
- [ ] Can list snapshots
- [ ] Can delete snapshot
- [ ] Rate limiting works
- [ ] Input validation works
- [ ] Error responses are correct

### UI Tests

- [ ] Conversation list displays
- [ ] Can create new conversation
- [ ] Can switch conversations
- [ ] Can delete conversation
- [ ] Can update conversation title
- [ ] Messages persist after refresh
- [ ] Loading states display
- [ ] Error messages display
- [ ] Keyboard shortcuts work

### Integration Tests

- [ ] Chat messages save to database
- [ ] Snapshots save and restore
- [ ] Conversation switching loads correct messages
- [ ] Delete conversation removes all data
- [ ] Rate limit is respected
- [ ] Retry logic works on failures

## 📊 Monitoring

### Supabase Dashboard

Monitor in real-time:

- **Database**: Table Editor → View data
- **API**: API → Logs
- **Performance**: Reports → Performance

### Custom Logging

Add to API endpoints:

```typescript
console.log('[API] Creating conversation', { userId, title });
console.log('[API] Conversation created', { id: conversation.id });
```

## 🐛 Troubleshooting

### "Cannot find module '@supabase/supabase-js'"

**Solution**: Run `pnpm add @supabase/supabase-js`

### "Module has no exported member 'SUPABASE_URL'"

**Solution**: Add Supabase credentials to `.env` file

### "Failed to create conversation"

**Solution**:

1. Check Supabase dashboard for errors
2. Verify schema was run successfully
3. Check API credentials are correct
4. Look at browser console for details

### "Rate limit exceeded"

**Solution**: Wait 60 seconds or adjust rate limit in `/src/routes/api/chat/+server.ts`

### Messages not persisting

**Solution**:

1. Check browser console for errors
2. Verify API calls are being made
3. Check Supabase Table Editor for data
4. Verify conversation ID is set

## 📚 Documentation

### API Documentation

Create `/docs/API.md`:

```markdown
# Chat API Documentation

## Endpoints

### Conversations

- `GET /api/chat/conversations` - List conversations
- `POST /api/chat/conversations` - Create conversation
- `GET /api/chat/conversations/:id` - Get conversation
- `PATCH /api/chat/conversations/:id` - Update conversation
- `DELETE /api/chat/conversations/:id` - Delete conversation

### Messages

- `GET /api/chat/conversations/:id/messages` - List messages
- `POST /api/chat/conversations/:id/messages` - Create message

### Snapshots

- `GET /api/chat/snapshots?conversation_id=:id` - List snapshots
- `POST /api/chat/snapshots` - Create snapshot
- `GET /api/chat/snapshots/:id` - Get snapshot
- `DELETE /api/chat/snapshots/:id` - Delete snapshot
```

## 🎯 Success Criteria

You'll know it's working when:

1. ✅ `pnpm dev` runs without errors
2. ✅ Can create and list conversations via API
3. ✅ Chat messages appear in Supabase Table Editor
4. ✅ Messages persist after page refresh
5. ✅ Can switch between conversations
6. ✅ Can delete conversations
7. ✅ Rate limiting works (test with rapid requests)
8. ✅ Error handling works (test with invalid data)

## 🚀 Deployment

When ready for production:

1. **Environment Variables**

   - Add to hosting provider (Netlify, Vercel, etc.)
   - Never commit `.env` to git

2. **Database**

   - Supabase handles backups automatically
   - Consider upgrading to paid tier for production

3. **Monitoring**

   - Set up error tracking (Sentry)
   - Monitor API usage in Supabase dashboard
   - Set up alerts for errors

4. **Security**
   - Enable HTTPS
   - Configure CORS
   - Review RLS policies
   - Rotate API keys regularly

## 📞 Support

If you get stuck:

1. Check `/database/README.md` for database setup
2. Check browser console for errors
3. Check Supabase dashboard logs
4. Review API endpoint code
5. Test with curl commands

---

**Current Status**: Ready for implementation
**Estimated Time**: 30-60 minutes
**Next Action**: Install dependencies and set up Supabase
