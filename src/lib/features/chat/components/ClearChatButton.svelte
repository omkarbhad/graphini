<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Trash2 } from 'lucide-svelte';

  interface Props {
    onClearChat: () => void;
  }

  let { onClearChat }: Props = $props();
  let open = $state(false);

  function handleClear() {
    onClearChat();
    open = false;
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger>
    <Button variant="ghost" title="Clear chat history">
      <Trash2 class="size-4" />
      Clear
    </Button>
  </Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Clear Chat History</Dialog.Title>
      <Dialog.Description>
        Are you sure you want to clear the chat history? This will delete all messages in the
        current conversation. This action cannot be undone.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
      <Button variant="destructive" onclick={handleClear}>
        <Trash2 class="mr-2 size-4" />
        Clear Chat
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
