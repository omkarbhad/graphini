<script lang="ts">
  import { onMount } from 'svelte';
  import { Button } from '$lib/components/ui/button';
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
  } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { Separator } from '$lib/components/ui/separator';
  import { theme, diagramColors, currentTheme } from '$lib/stores/diagram-theme';
  import { themeToMermaidConfig, generateMermaidCSS } from '$lib/mermaid-theme';
  import { Palette, Eye, Code, Download } from '@lucide/svelte';

  let mermaidCode = '';
  let cssOutput = '';
  let showCode = false;
  let showCSS = false;

  // Sample flowchart for demonstration
  const sampleFlowchart = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process 1]
    B -->|No| D[Process 2]
    C --> E[End]
    D --> E`;

  onMount(() => {
    updateOutputs();
  });

  $: if ($currentTheme) {
    updateOutputs();
  }

  function updateOutputs() {
    if (!$currentTheme) return;

    // Generate Mermaid configuration
    const mermaidConfig = themeToMermaidConfig($currentTheme);
    mermaidCode = JSON.stringify(mermaidConfig, null, 2);

    // Generate CSS
    cssOutput = generateMermaidCSS($currentTheme);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  function downloadJSON() {
    const blob = new Blob([mermaidCode], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mermaid-theme.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadCSS() {
    const blob = new Blob([cssOutput], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mermaid-theme.css';
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="mx-auto max-w-6xl space-y-6 p-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="flex items-center gap-2 text-3xl font-bold">
        <Palette class="h-8 w-8" />
        Advanced Color System
      </h1>
      <p class="mt-2 text-muted-foreground">
        Comprehensive theme management inspired by Mermaid's color architecture
      </p>
    </div>
    <div class="flex gap-2">
      <Button variant="outline" onclick={() => (showCode = !showCode)}>
        <Code class="mr-2 h-4 w-4" />
        {showCode ? 'Hide' : 'Show'} Config
      </Button>
      <Button variant="outline" onclick={() => (showCSS = !showCSS)}>
        <Eye class="mr-2 h-4 w-4" />
        {showCSS ? 'Hide' : 'Show'} CSS
      </Button>
    </div>
  </div>

  <!-- Color Scale Display -->
  <Card>
    <CardHeader>
      <CardTitle>Color Scale System</CardTitle>
      <CardDescription>
        12-color scale with peer colors for borders and label colors for text
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div class="space-y-4">
        <!-- Main Colors -->
        <div>
          <h4 class="mb-2 text-sm font-medium">Main Colors (cScale0-11)</h4>
          <div class="flex flex-wrap gap-2">
            {#each diagramColors.getNodeColors(12) as color, i}
              <div class="text-center">
                <div
                  class="h-12 w-12 rounded-lg border-2 border-border shadow-sm"
                  style="background-color: {color}"
                  title="cScale{i}">
                </div>
                <p class="mt-1 text-xs text-muted-foreground">{i}</p>
              </div>
            {/each}
          </div>
        </div>

        <!-- Peer Colors (Borders) -->
        <div>
          <h4 class="mb-2 text-sm font-medium">Border Colors (cScalePeer0-11)</h4>
          <div class="flex flex-wrap gap-2">
            {#each diagramColors.getBorderColors(12) as color, i}
              <div class="text-center">
                <div
                  class="h-12 w-12 rounded-lg border-2 shadow-sm"
                  style="background-color: {color}; border-color: {color}"
                  title="cScalePeer{i}">
                </div>
                <p class="mt-1 text-xs text-muted-foreground">{i}</p>
              </div>
            {/each}
          </div>
        </div>

        <!-- Surface Colors -->
        <div>
          <h4 class="mb-2 text-sm font-medium">Surface Colors (UI Elements)</h4>
          <div class="flex flex-wrap gap-2">
            {#each diagramColors.getSurfaceColors() as color, i}
              <div class="text-center">
                <div
                  class="h-12 w-12 rounded-lg border-2 border-border shadow-sm"
                  style="background-color: {color}"
                  title="surface{i}">
                </div>
                <p class="mt-1 text-xs text-muted-foreground">S{i}</p>
              </div>
            {/each}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>

  <!-- Diagram-Specific Colors -->
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
    <!-- Flowchart Colors -->
    <Card>
      <CardHeader>
        <CardTitle class="text-lg">Flowchart</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-3">
          {#each Object.entries(diagramColors.getFlowchartColors()) as [key, value]}
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">{key}</span>
              <div class="flex items-center gap-2">
                <div class="h-6 w-6 rounded border border-border" style="background-color: {value}">
                </div>
                <code class="text-xs text-muted-foreground">{value}</code>
              </div>
            </div>
          {/each}
        </div>
      </CardContent>
    </Card>

    <!-- Sequence Diagram Colors -->
    <Card>
      <CardHeader>
        <CardTitle class="text-lg">Sequence Diagram</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-3">
          {#each Object.entries(diagramColors.getSequenceColors()) as [key, value]}
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">{key}</span>
              <div class="flex items-center gap-2">
                <div class="h-6 w-6 rounded border border-border" style="background-color: {value}">
                </div>
                <code class="text-xs text-muted-foreground">{value}</code>
              </div>
            </div>
          {/each}
        </div>
      </CardContent>
    </Card>

    <!-- Gantt Chart Colors -->
    <Card>
      <CardHeader>
        <CardTitle class="text-lg">Gantt Chart</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-3">
          {#each Object.entries(diagramColors.getGanttColors()) as [key, value]}
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">{key}</span>
              <div class="flex items-center gap-2">
                <div class="h-6 w-6 rounded border border-border" style="background-color: {value}">
                </div>
                <code class="text-xs text-muted-foreground">{value}</code>
              </div>
            </div>
          {/each}
        </div>
      </CardContent>
    </Card>
  </div>

  <!-- Theme Configuration Output -->
  {#if showCode}
    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
          <div>
            <CardTitle>Mermaid Configuration</CardTitle>
            <CardDescription>JSON configuration for Mermaid.js integration</CardDescription>
          </div>
          <div class="flex gap-2">
            <Button size="sm" variant="outline" onclick={() => copyToClipboard(mermaidCode)}>
              Copy
            </Button>
            <Button size="sm" variant="outline" onclick={downloadJSON}>
              <Download class="mr-1 h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <pre class="overflow-x-auto rounded-lg bg-muted p-4 text-sm">{mermaidCode}</pre>
      </CardContent>
    </Card>
  {/if}

  <!-- CSS Output -->
  {#if showCSS}
    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
          <div>
            <CardTitle>CSS Variables</CardTitle>
            <CardDescription>Generated CSS for custom styling</CardDescription>
          </div>
          <div class="flex gap-2">
            <Button size="sm" variant="outline" onclick={() => copyToClipboard(cssOutput)}>
              Copy
            </Button>
            <Button size="sm" variant="outline" onclick={downloadCSS}>
              <Download class="mr-1 h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <pre class="overflow-x-auto rounded-lg bg-muted p-4 text-sm">{cssOutput}</pre>
      </CardContent>
    </Card>
  {/if}

  <!-- Features Overview -->
  <Card>
    <CardHeader>
      <CardTitle>System Features</CardTitle>
      <CardDescription>Comprehensive color management for all diagram types</CardDescription>
    </CardHeader>
    <CardContent>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div class="space-y-2">
          <h4 class="font-medium">🎨 Color Scale System</h4>
          <ul class="space-y-1 text-sm text-muted-foreground">
            <li>• 12-color automatic generation</li>
            <li>• Peer colors for borders</li>
            <li>• Label colors for text</li>
            <li>• Inverted color variants</li>
          </ul>
        </div>
        <div class="space-y-2">
          <h4 class="font-medium">🌓 Theme Support</h4>
          <ul class="space-y-1 text-sm text-muted-foreground">
            <li>• Light and dark modes</li>
            <li>• Automatic adaptation</li>
            <li>• Preset themes (Ocean, Sunset, etc.)</li>
            <li>• Custom color palettes</li>
          </ul>
        </div>
        <div class="space-y-2">
          <h4 class="font-medium">📊 Diagram Integration</h4>
          <ul class="space-y-1 text-sm text-muted-foreground">
            <li>• All Mermaid diagram types</li>
            <li>• Type-specific color sets</li>
            <li>• CSS variable generation</li>
            <li>• Real-time updates</li>
          </ul>
        </div>
        <div class="space-y-2">
          <h4 class="font-medium">🔧 Advanced Features</h4>
          <ul class="space-y-1 text-sm text-muted-foreground">
            <li>• Color manipulation utilities</li>
            <li>• Surface color generation</li>
            <li>• Accessibility support</li>
            <li>• Performance optimized</li>
          </ul>
        </div>
        <div class="space-y-2">
          <h4 class="font-medium">🎯 Developer Tools</h4>
          <ul class="space-y-1 text-sm text-muted-foreground">
            <li>• TypeScript support</li>
            <li>• Store integration</li>
            <li>• Export capabilities</li>
            <li>• Debug utilities</li>
          </ul>
        </div>
        <div class="space-y-2">
          <h4 class="font-medium">🚀 Performance</h4>
          <ul class="space-y-1 text-sm text-muted-foreground">
            <li>• Reactive updates</li>
            <li>• Minimal re-renders</li>
            <li>• Cached calculations</li>
            <li>• Optimized color math</li>
          </ul>
        </div>
      </div>
    </CardContent>
  </Card>
</div>
