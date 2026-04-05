<script lang="ts">
  import {
    Task,
    TaskContent,
    TaskProgress,
    TaskStatus,
    TaskTrigger
  } from '$lib/features/chat/components/ai-elements/task';
  import type { DiagramEditorTask } from './types';
  import { getOperationTitle } from './types';

  export let task: DiagramEditorTask;

  // Map task status to Task component status
  $: taskStatus =
    task.status === 'completed'
      ? 'complete'
      : task.status === 'error'
        ? 'error'
        : task.status === 'in_progress'
          ? 'in-progress'
          : 'pending';

  // Use task title from metadata if available, otherwise use operation title
  $: taskTitle = task.metadata?.taskData?.title || task.title || getOperationTitle(task.operation);
  $: taskDetails = task.metadata?.taskData?.details || task.details;
  $: taskProgress = task.metadata?.taskData?.progress || task.progress || 0;
</script>

<Task>
  <TaskTrigger title={taskTitle}>
    <TaskStatus status={taskStatus} />
    <TaskProgress value={taskProgress} />
  </TaskTrigger>
  <TaskContent>
    <p>{taskDetails}</p>
    {#if task.error}
      <p class="mt-2 text-sm text-red-600">{task.error}</p>
    {/if}
  </TaskContent>
</Task>
