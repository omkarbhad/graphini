<script lang="ts">
  import { authStore } from '$lib/stores/auth.svelte';
  import { Check, Crown, Gem, X, Zap } from 'lucide-svelte';

  interface Props {
    open: boolean;
    onClose: () => void;
  }

  let { open, onClose }: Props = $props();

  let purchasing = $state(false);
  let purchaseError = $state('');
  let purchaseSuccess = $state(false);

  const plans = [
    { id: 'starter', name: 'Starter', gems: 100, price: 4.99, popular: false, icon: Gem },
    { id: 'pro', name: 'Pro', gems: 500, price: 19.99, popular: true, icon: Zap },
    { id: 'unlimited', name: 'Power', gems: 2000, price: 49.99, popular: false, icon: Crown }
  ];

  async function handlePurchase(planId: string) {
    purchasing = true;
    purchaseError = '';
    purchaseSuccess = false;
    try {
      const res = await fetch('/api/credits/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId }),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        purchaseSuccess = true;
        await authStore.refreshCredits();
        setTimeout(() => {
          purchaseSuccess = false;
          onClose();
        }, 1500);
      } else {
        purchaseError = data.error || 'Purchase failed';
      }
    } catch (e: any) {
      purchaseError = e?.message || 'Network error';
    } finally {
      purchasing = false;
    }
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape') onClose();
    }}>
    <div class="relative mx-4 w-full max-w-md animate-in duration-200 zoom-in-95 fade-in">
      <div class="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        <!-- Close -->
        <button
          type="button"
          class="absolute top-3 right-3 z-10 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onclick={onClose}>
          <X class="size-4" />
        </button>

        <!-- Header -->
        <div class="border-b border-border px-5 pt-5 pb-4">
          <div class="flex items-center gap-3">
            <div
              class="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Gem class="size-5 text-muted-foreground" />
            </div>
            <div>
              <h2 class="text-base font-semibold text-foreground">Refill Gems</h2>
              <div class="mt-0.5 flex items-center gap-1.5">
                <span class="text-sm font-medium text-foreground"
                  >{authStore.credits?.balance ?? 0}</span>
                <span class="text-xs text-muted-foreground">gems remaining</span>
              </div>
            </div>
          </div>
        </div>

        <div class="px-5 pb-5">
          {#if purchaseSuccess}
            <div class="flex flex-col items-center gap-3 py-8 text-center">
              <div
                class="flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
                <Check class="size-6 text-emerald-500" />
              </div>
              <p class="text-base font-semibold text-foreground">Gems added!</p>
              <p class="text-xs text-muted-foreground">Your balance has been updated.</p>
            </div>
          {:else}
            <!-- Plans -->
            <div class="mt-4 space-y-2">
              {#each plans as plan, i}
                {@const savings =
                  i === 0
                    ? 0
                    : Math.round(
                        (1 - plan.price / plan.gems / (plans[0].price / plans[0].gems)) * 100
                      )}
                <button
                  type="button"
                  disabled={purchasing}
                  class="group relative flex w-full items-center gap-3.5 rounded-lg border px-4 py-3 text-left transition-colors duration-150 disabled:opacity-50
                    {plan.popular
                    ? 'border-primary/30 bg-accent/50'
                    : 'border-border bg-card hover:border-primary/20 hover:bg-accent/30'}"
                  onclick={() => handlePurchase(plan.id)}>
                  {#if plan.popular}
                    <span
                      class="absolute -top-2 right-3 rounded-md bg-primary px-2 py-0.5 text-[9px] font-semibold tracking-wider text-primary-foreground uppercase"
                      >Popular</span>
                  {/if}
                  <div
                    class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <plan.icon class="size-4 text-muted-foreground" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <span class="text-[13px] font-semibold text-foreground">{plan.name}</span>
                      <span
                        class="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                        >{plan.gems} gems</span>
                      {#if savings > 0}
                        <span
                          class="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400"
                          >Save {savings}%</span>
                      {/if}
                    </div>
                    <div class="mt-0.5 flex items-baseline gap-1.5">
                      <span class="text-sm font-semibold text-foreground"
                        >${plan.price.toFixed(2)}</span>
                      <span class="text-[10px] text-muted-foreground"
                        >${((plan.price / plan.gems) * 100).toFixed(1)}¢ per gem</span>
                    </div>
                  </div>
                  <div
                    class="shrink-0 rounded-md border border-border px-3 py-1.5 text-[11px] font-semibold text-foreground transition-colors group-hover:bg-accent">
                    Add
                  </div>
                </button>
              {/each}
            </div>

            {#if purchaseError}
              <div
                class="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {purchaseError}
              </div>
            {/if}

            <p class="mt-4 text-center text-[10px] text-muted-foreground">
              Processed securely. Gems are non-refundable.
            </p>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
