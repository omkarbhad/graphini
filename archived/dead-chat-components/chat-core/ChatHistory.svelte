<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Card } from '$lib/components/ui/card';
  import { MessageSquare, Trash2, Clock } from 'lucide-svelte';

  interface Conversation {
    id: string;
    title: string;
    lastMessage: string;
    timestamp: Date;
    messageCount: number;
  }

  interface Props {
    conversations: Conversation[];
    activeConversation?: string;
    onSelectConversation?: (id: string) => void;
    onDeleteConversation?: (id: string) => void;
    onNewConversation?: () => void;
    class?: string;
  }

  let {
    conversations,
    activeConversation,
    onSelectConversation,
    onDeleteConversation,
    onNewConversation,
    class: className = ''
  }: Props = $props();

  function formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
</script>

<div class="chat-history {className}">
  <!-- Header -->
  <div class="history-header">
    <div class="header-content">
      <h2 class="history-title">
        <MessageSquare class="title-icon" />
        Conversations
      </h2>
      <Button variant="outline" size="sm" onclick={onNewConversation} class="new-chat-btn">
        New Chat
      </Button>
    </div>
  </div>

  <!-- Conversations List -->
  <div class="conversations-list">
    {#each conversations as conversation (conversation.id)}
      <Card
        class={`conversation-card ${activeConversation === conversation.id ? 'active' : ''}`}
        onclick={() => onSelectConversation?.(conversation.id)}>
        <div class="conversation-content">
          <div class="conversation-header">
            <h3 class="conversation-title">
              {truncateText(conversation.title, 30)}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              class="delete-btn"
              onclick={(e) => {
                e.stopPropagation();
                onDeleteConversation?.(conversation.id);
              }}>
              <Trash2 class="h-3 w-3" />
            </Button>
          </div>

          <p class="conversation-preview">
            {truncateText(conversation.lastMessage, 50)}
          </p>

          <div class="conversation-meta">
            <div class="meta-item">
              <Clock class="meta-icon" />
              <span class="meta-text">{formatDate(conversation.timestamp)}</span>
            </div>
            <div class="meta-item">
              <MessageSquare class="meta-icon" />
              <span class="meta-text">{conversation.messageCount} messages</span>
            </div>
          </div>
        </div>
      </Card>
    {/each}

    {#if conversations.length === 0}
      <div class="empty-state">
        <MessageSquare class="empty-icon" />
        <h3 class="empty-title">No conversations yet</h3>
        <p class="empty-description">Start a new conversation to see it here</p>
        <Button variant="default" onclick={onNewConversation} class="empty-action">
          Start New Chat
        </Button>
      </div>
    {/if}
  </div>
</div>

<style>
  .chat-history {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: hsl(var(--background));
  }

  .history-header {
    padding: 1rem;
    border-bottom: 1px solid hsl(var(--border));
  }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .history-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
    color: hsl(var(--foreground));
  }

  .title-icon {
    width: 16px;
    height: 16px;
  }

  .new-chat-btn {
    flex-shrink: 0;
  }

  .conversations-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }

  .conversation-card {
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 0.5rem;
  }

  .conversation-card:hover {
    background: hsl(var(--accent));
  }

  .conversation-card.active {
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
  }

  .conversation-content {
    padding: 0.75rem;
  }

  .conversation-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .conversation-title {
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0;
    line-height: 1.4;
  }

  .delete-btn {
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .conversation-card:hover .delete-btn {
    opacity: 1;
  }

  .conversation-preview {
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
    margin: 0 0 0.5rem 0;
    line-height: 1.4;
  }

  .conversation-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .meta-icon {
    width: 12px;
    height: 12px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
  }

  .empty-icon {
    width: 48px;
    height: 48px;
    color: hsl(var(--muted-foreground));
    margin-bottom: 1rem;
  }

  .empty-title {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    color: hsl(var(--foreground));
  }

  .empty-description {
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    margin: 0 0 1.5rem 0;
  }

  .empty-action {
    margin-top: 0.5rem;
  }
</style>
