<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import LoginIcon from '~icons/material-symbols/login-rounded';

  async function signIn() {
    console.log('Sign in clicked');
  }
</script>

<Button
  variant="ghost"
  size="sm"
  onclick={signIn}
  class="transition-all duration-200 hover:scale-105">
  <LoginIcon class="mr-2 h-4 w-4" />
  Sign in
</Button>
