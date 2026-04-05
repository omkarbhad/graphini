<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { authStore } from '$lib/stores/auth.svelte';
  import LoginIcon from '~icons/material-symbols/login-rounded';
  import LogoutIcon from '~icons/material-symbols/logout-rounded';

  function getUserInitials() {
    const user = authStore.user;
    if (user?.display_name) {
      return user.display_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  }

  function signIn() {
    // Login UI is handled by the application's login modal/page
    window.location.href = '/login';
  }

  async function signOut() {
    await authStore.logout();
  }
</script>

{#if authStore.isLoading && !authStore.isInitialized}
  <div class="h-7 w-7 animate-pulse rounded-full bg-muted"></div>
{:else if authStore.user}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild let:builder>
      <Button
        variant="ghost"
        size="icon"
        class="relative h-7 w-7 overflow-hidden rounded-full border border-border hover:bg-accent/50"
        builders={[builder]}
        title={authStore.user.display_name || authStore.user.email}>
        {#if authStore.user.avatar_url}
          <img
            src={authStore.user.avatar_url}
            alt={authStore.user.display_name || 'User avatar'}
            class="h-full w-full object-cover" />
        {:else}
          <div
            class="flex h-full w-full items-center justify-center bg-primary text-primary-foreground">
            <span class="text-[10px] font-medium">{getUserInitials()}</span>
          </div>
        {/if}
      </Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content class="w-56" align="end">
      <DropdownMenu.Label class="px-2 py-1.5 text-sm font-semibold">
        {authStore.user.display_name || 'User'}
      </DropdownMenu.Label>
      <DropdownMenu.Label class="px-2 py-1 text-xs text-muted-foreground">
        {authStore.user.email}
      </DropdownMenu.Label>
      <DropdownMenu.Separator />
      <DropdownMenu.Item class="cursor-pointer" onclick={signOut}>
        <LogoutIcon class="mr-2 h-4 w-4" />
        Sign out
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{:else}
  <Button
    variant="ghost"
    size="icon"
    onclick={signIn}
    class="relative h-7 w-7 rounded-full border border-border hover:bg-accent/50"
    title="Sign in">
    <LoginIcon class="h-3.5 w-3.5" />
  </Button>
{/if}
