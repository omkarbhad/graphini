<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  import LoginIcon from '~icons/material-symbols/login-rounded';
  import LogoutIcon from '~icons/material-symbols/logout-rounded';

  let user = $state<{ email?: string; name?: string } | null>(null);
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
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0]
        };
      }

      // Listen for auth changes
      const {
        data: { subscription }
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          user = {
            email: session.user.email || undefined,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0]
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
          redirectTo: `${window.location.origin}`
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
  <div class="h-8 w-8 animate-pulse rounded-full bg-muted"></div>
{:else if user}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild let:builder>
      <Button
        variant="ghost"
        size="icon"
        class="relative h-8 w-8 rounded-full bg-primary text-primary-foreground transition-all duration-200 hover:scale-105 hover:bg-primary/90"
        builders={[builder]}
        title={user.name || user.email}>
        <span class="text-sm font-medium">{getUserInitials()}</span>
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
    size="sm"
    onclick={signIn}
    class="transition-all duration-200 hover:scale-105">
    <LoginIcon class="mr-2 h-4 w-4" />
    Sign in
  </Button>
{/if}
