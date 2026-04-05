<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import LoginIcon from '~icons/material-symbols/login-rounded';
  import LogoutIcon from '~icons/material-symbols/logout-rounded';

  let user = $state<{ email?: string; name?: string; avatar_url?: string } | null>(null);
  let loading = $state(true);

  onMount(async () => {
    try {
      // Get initial session
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (session?.user) {
        user = {
          email: session.user.email || undefined,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
          avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture
        };
      }

      // Listen for auth changes
      const {
        data: { subscription }
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          user = {
            email: session.user.email || undefined,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0],
            avatar_url:
              session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture
          };
        } else {
          user = null;
        }
        loading = false;
      });

      loading = false;

      return () => subscription.unsubscribe();
    } catch (error) {
      console.error('Auth initialization error:', error);
      loading = false;
    }
  });

  async function signIn() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) {
        console.error('Error signing in:', error);
      }
    } catch (error) {
      console.error('Sign in error:', error);
    }
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  function getUserInitials() {
    if (user?.name) {
      return user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  }
</script>

{#if loading}
  <div class="h-7 w-7 animate-pulse rounded-full bg-muted"></div>
{:else if user}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild let:builder>
      <Button
        variant="ghost"
        size="icon"
        class="relative h-7 w-7 overflow-hidden rounded-full border border-border hover:bg-accent/50"
        builders={[builder]}
        title={user.name || user.email}>
        {#if user.avatar_url}
          <img
            src={user.avatar_url}
            alt={user.name || 'User avatar'}
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
        {user.name || 'User'}
      </DropdownMenu.Label>
      <DropdownMenu.Label class="px-2 py-1 text-xs text-muted-foreground">
        {user.email}
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
    title="Sign in with Google">
    <LoginIcon class="h-3.5 w-3.5" />
  </Button>
{/if}
