<script lang="ts">
  import Actions from '$lib/components/Actions.svelte';
  import Preset from '$lib/components/Preset.svelte';
  import Privacy from '$lib/components/Privacy.svelte';
  import { Button } from '$lib/components/ui/button';
  import * as Popover from '$lib/components/ui/popover';
  import { Separator } from '$lib/components/ui/separator';
</script>

<div class="flex items-center gap-2">
  <Button variant="ghost" size="icon" title="Privacy & Security">
    <Privacy />
  </Button>

  <Separator orientation="vertical" />
  <Popover.Root>
    <Popover.Trigger class="flex items-center">
      <Button variant="ghost" size="sm" class="gap-2">Sample Diagrams</Button>
    </Popover.Trigger>
    <Popover.Content
      align="end"
      class="max-h-[min(28rem,80vh)] w-[min(22rem,90vw)] overflow-auto rounded-lg border border-border bg-popover p-2 text-popover-foreground">
      <Preset />
    </Popover.Content>
  </Popover.Root>

  <Popover.Root>
    <Popover.Trigger class="flex items-center">
      <Button variant="ghost" size="sm" class="gap-2">Actions</Button>
    </Popover.Trigger>
    <Popover.Content
      align="end"
      class="max-h-[min(32rem,80vh)] w-[min(24rem,90vw)] overflow-auto rounded-lg border border-border bg-popover p-2 text-popover-foreground">
      <Actions />
    </Popover.Content>
  </Popover.Root>

  <Separator orientation="vertical" />
</div>
