<script lang="ts">
  import { autosaveStore } from '$/stores/autosave';
  import CheckIcon from '~icons/material-symbols/check-circle-outline-rounded';
  import ErrorIcon from '~icons/material-symbols/error-outline-rounded';
  import LoadingIcon from '~icons/material-symbols/refresh-outline-rounded';
  import SaveIcon from '~icons/material-symbols/save-outline-rounded';

  $: status = $autosaveStore.saveStatus;
  $: lastSaveTime = $autosaveStore.lastSaved;
  $: hasChanges = $autosaveStore.pendingChanges;

  function formatTime(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString();
  }

  function getStatusIcon() {
    switch (status) {
      case 'saving':
        return LoadingIcon;
      case 'saved':
        return CheckIcon;
      case 'error':
        return ErrorIcon;
      default:
        return SaveIcon;
    }
  }

  function getStatusText() {
    switch (status) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return lastSaveTime ? `Saved ${formatTime(lastSaveTime)}` : 'Saved';
      case 'error':
        return 'Save failed';
      default:
        return hasChanges
          ? 'Unsaved changes'
          : lastSaveTime
            ? `Saved ${formatTime(lastSaveTime)}`
            : 'Ready';
    }
  }

  function getStatusColor() {
    switch (status) {
      case 'saving':
        return 'text-blue-500';
      case 'saved':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return hasChanges ? 'text-orange-500' : 'text-muted-foreground';
    }
  }
</script>

<div class="flex items-center gap-2 text-sm {getStatusColor()}">
  {#if status === 'saving'}
    <LoadingIcon class="size-4 animate-spin" />
  {:else}
    <SaveIcon class="size-4" />
  {/if}
  <span class="text-xs font-medium">{getStatusText()}</span>
</div>
