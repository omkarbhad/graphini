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
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
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
      <div class="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl">
        <!-- Close -->
        <button
          type="button"
          class="absolute top-3 right-3 z-10 rounded-lg p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
          onclick={onClose}>
          <X class="size-4" />
        </button>

        <!-- Gradient header -->
        <div
          class="relative overflow-hidden bg-gradient-to-br from-purple-600/10 via-indigo-500/5 to-transparent px-5 pt-6 pb-4">
          <div
            class="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(147,51,234,0.08),transparent_60%)]">
          </div>
          <div class="relative flex flex-col items-center gap-2.5 text-center">
            <div
              class="gem-float flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 shadow-lg shadow-purple-500/10">
              <Gem class="size-6 text-purple-400" />
            </div>
            <div>
              <h2 class="text-lg font-bold tracking-tight text-foreground">Refill Gems</h2>
              <div class="mt-1 flex items-center justify-center gap-1.5">
                <Gem class="size-3 text-purple-400" />
                <span class="text-sm font-semibold text-purple-400"
                  >{authStore.credits?.balance ?? 0}</span>
                <span class="text-xs text-muted-foreground">gems remaining</span>
              </div>
            </div>
          </div>
        </div>

        <div class="px-5 pb-5">
          {#if purchaseSuccess}
            <div class="flex flex-col items-center gap-3 py-8 text-center">
              <div class="success-check">
                <div class="success-check__pulse"></div>
                <div class="success-check__ring"></div>
                <div class="success-check__icon">
                  <Check class="size-7" />
                </div>
              </div>
              <p class="text-lg font-semibold text-foreground">Gems added!</p>
              <p class="text-xs text-muted-foreground">Your balance has been updated.</p>
            </div>
          {:else}
            <!-- Plans -->
            <div class="mt-4 space-y-2.5">
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
                  class="group relative flex w-full items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left transition-all duration-200 hover:scale-[1.01] hover:shadow-md active:scale-[0.99] disabled:opacity-50
                    {plan.popular
                    ? 'border-purple-500/50 bg-gradient-to-r from-purple-500/[0.08] to-indigo-500/[0.04] shadow-sm shadow-purple-500/5'
                    : 'border-border/50 bg-card hover:border-purple-500/30'}"
                  onclick={() => handlePurchase(plan.id)}>
                  {#if plan.popular}
                    <span
                      class="absolute -top-2.5 right-3 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-white uppercase shadow-sm"
                      >Most Popular</span>
                  {/if}
                  <div
                    class="flex size-10 shrink-0 items-center justify-center rounded-xl {plan.popular
                      ? 'bg-gradient-to-br from-purple-500/20 to-indigo-500/20'
                      : 'bg-purple-500/10'}">
                    <plan.icon class="size-4.5 text-purple-400" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <span class="text-[13px] font-bold text-foreground">{plan.name}</span>
                      <span
                        class="rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-400"
                        >{plan.gems} gems</span>
                      {#if savings > 0}
                        <span
                          class="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-500"
                          >Save {savings}%</span>
                      {/if}
                    </div>
                    <div class="mt-0.5 flex items-baseline gap-1.5">
                      <span class="text-sm font-bold text-foreground"
                        >${plan.price.toFixed(2)}</span>
                      <span class="text-[10px] text-muted-foreground/50"
                        >${((plan.price / plan.gems) * 100).toFixed(1)}¢ per gem</span>
                    </div>
                  </div>
                  <div
                    class="shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all {plan.popular
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-sm shadow-purple-500/20 group-hover:shadow-md group-hover:shadow-purple-500/30'
                      : 'border border-border/50 bg-background text-foreground group-hover:border-purple-500/40 group-hover:bg-purple-500/10 group-hover:text-purple-400'}">
                    Add
                  </div>
                </button>
              {/each}
            </div>

            {#if purchaseError}
              <div
                class="mt-3 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs text-red-400">
                {purchaseError}
              </div>
            {/if}

            <p class="mt-4 text-center text-[10px] text-muted-foreground/40">
              Processed securely. Gems are non-refundable.
            </p>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .success-check {
    position: relative;
    width: 4rem;
    height: 4rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .success-check__pulse,
  .success-check__ring {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background: rgba(147, 51, 234, 0.2);
    animation: success-pulse 1.2s ease-out forwards;
  }

  .success-check__ring {
    background: transparent;
    border: 2px solid rgba(147, 51, 234, 0.4);
    animation: success-ring 0.8s ease-out forwards;
  }

  .success-check__icon {
    position: relative;
    z-index: 1;
    background: rgba(147, 51, 234, 0.12);
    border-radius: 999px;
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgb(168, 85, 247);
    animation: success-pop 0.45s cubic-bezier(0.2, 1.1, 0.4, 1) forwards;
  }

  @keyframes success-pulse {
    0% {
      transform: scale(0.4);
      opacity: 0.75;
    }
    100% {
      transform: scale(1.4);
      opacity: 0;
    }
  }

  @keyframes success-ring {
    0% {
      transform: scale(0.5);
      opacity: 0.9;
    }
    100% {
      transform: scale(1.2);
      opacity: 0;
    }
  }

  @keyframes success-pop {
    0% {
      transform: scale(0.4);
      opacity: 0;
    }
    70% {
      transform: scale(1.08);
      opacity: 1;
    }
    100% {
      transform: scale(1);
    }
  }

  .gem-float {
    animation: gem-float 3s ease-in-out infinite;
  }

  @keyframes gem-float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-4px);
    }
  }
</style>
