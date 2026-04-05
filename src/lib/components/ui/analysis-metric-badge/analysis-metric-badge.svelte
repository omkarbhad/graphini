<script lang="ts">
  import { cn } from '$lib/utils.js';
  import {
    Activity,
    AlertTriangle,
    BarChart3,
    CheckCircle,
    Clock,
    TrendingUp
  } from 'lucide-svelte';

  interface Props {
    class?: string;
    variant?: 'execution' | 'confidence' | 'complexity' | 'warning' | 'error' | 'success';
    size?: 'sm' | 'md' | 'lg';
    value?: string | number;
    label?: string;
    icon?: any;
  }

  let {
    class: className = '',
    variant = 'execution',
    size = 'md',
    value,
    label,
    icon,
    ...restProps
  }: Props = $props();

  // Default icons based on variant
  const defaultIcons = {
    execution: Clock,
    confidence: TrendingUp,
    complexity: BarChart3,
    warning: AlertTriangle,
    error: AlertTriangle,
    success: CheckCircle
  };

  const IconComponent = $derived(icon || defaultIcons[variant] || Activity);

  // Variant classes
  const variantClassMap = {
    execution:
      'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900',
    confidence:
      'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900',
    complexity:
      'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900',
    warning:
      'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900',
    error:
      'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900',
    success:
      'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900'
  };

  // Size classes
  const sizeClassMap = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  // Computed classes using $derived
  const baseClasses =
    'inline-flex items-center gap-2 rounded-full font-medium transition-all duration-200 hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
  const selectedVariantClasses = $derived(variantClassMap[variant]);
  const selectedSizeClasses = $derived(sizeClassMap[size]);

  const computedClasses = $derived(
    `${baseClasses} ${selectedVariantClasses} ${selectedSizeClasses}`
  );
</script>

<span class={cn(computedClasses, className)} {...restProps}>
  {#if IconComponent}
    <IconComponent class="h-3.5 w-3.5" aria-hidden="true" />
  {/if}

  {#if value}
    <span class="font-semibold">{value}</span>
  {/if}
</span>
