#!/bin/bash

# Script to convert Svelte 5 syntax to Svelte 4

echo "Converting Svelte 5 syntax to Svelte 4..."

# Find all .svelte files
find /Users/omkarbhad/mermas/src -name "*.svelte" | while read file; do
    echo "Processing: $file"
    
    # Convert $props() to export let
    sed -i '' 's/let {\([^}]*\)} = \$props();/export let \1;/g' "$file"
    sed -i '' 's/let {\([^}]*\): \([^}]*\)} = \$props();/export let \1; \/\/ type: \2/g' "$file"
    
    # Convert $state() to regular variables
    sed -i '' 's/let \([^=]*\) = \$state(\([^)]*\));/let \1 = \2;/g' "$file"
    
    # Convert {@render children()} to <slot />
    sed -i '' 's/{@render \([^}]*\)}/<slot \/>/g' "$file"
    
    # Remove lang="ts" from script tags to avoid preprocessing errors
    sed -i '' 's/<script lang="ts">/<script>/g' "$file"
    
    # Convert on:click to onclick (if any)
    sed -i '' 's/on:click=/onclick=/g' "$file"
done

echo "Conversion complete!"
