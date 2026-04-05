<script lang="ts">
  import { updateConversation } from '$lib/chat/api-client';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Download, Settings, Trash2 } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';

  interface Conversation {
    id: string;
    title: string | null;
    created_at: string;
    updated_at: string;
  }

  interface Props {
    conversation: Conversation;
    messageCount?: number;
    onUpdate?: (conversation: Conversation) => void;
    onDelete?: () => void;
    onExport?: () => void;
  }

  let { conversation, messageCount = 0, onUpdate, onDelete, onExport }: Props = $props();

  let isOpen = $state(false);
  let title = $state(conversation.title || '');
  let saving = $state(false);

  async function handleSave() {
    try {
      saving = true;
      const response = await updateConversation(conversation.id, {
        title: title.trim() || null
      });

      onUpdate?.(response.conversation);
      toast.success('Conversation updated');
      isOpen = false;
    } catch (error) {
      console.error('Failed to update conversation:', error);
      toast.error('Failed to update conversation');
    } finally {
      saving = false;
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }
</script>

<Dialog.Root bind:open={isOpen}>
  <Dialog.Trigger asChild let:builder>
    <Button builders={[builder]} variant="ghost" size="sm">
      <Settings class="size-4" />
      <span class="sr-only">Conversation settings</span>
    </Button>
  </Dialog.Trigger>
  <Dialog.Content class="sm:max-w-[425px]">
    <Dialog.Header>
      <Dialog.Title>Conversation Settings</Dialog.Title>
      <Dialog.Description>Manage your conversation settings and data.</Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4 py-4">
      <!-- Title -->
      <div class="space-y-2">
        <label for="title" class="text-sm font-medium"> Title </label>
        <Input id="title" bind:value={title} placeholder="Untitled Conversation" maxlength={200} />
      </div>

      <!-- Statistics -->
      <div class="space-y-2">
        <div class="text-sm font-medium">Statistics</div>
        <div class="space-y-1 rounded-lg border p-3 text-sm">
          <div class="flex justify-between">
            <span class="text-muted-foreground">Messages:</span>
            <span class="font-medium">{messageCount}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Created:</span>
            <span class="font-medium">{formatDate(conversation.created_at)}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">Updated:</span>
            <span class="font-medium">{formatDate(conversation.updated_at)}</span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="space-y-2">
        <div class="text-sm font-medium">Actions</div>
        <div class="flex flex-col gap-2">
          <Button variant="outline" size="sm" onclick={onExport} class="justify-start">
            <Download class="mr-2 size-4" />
            Export Conversation
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onclick={() => {
              isOpen = false;
              onDelete?.();
            }}
            class="justify-start">
            <Trash2 class="mr-2 size-4" />
            Delete Conversation
          </Button>
        </div>
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (isOpen = false)}>Cancel</Button>
      <Button onclick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Changes'}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
