import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { prompt, diagramType, complexity } = await request.json();

    if (!prompt || !diagramType || !complexity) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: prompt, diagramType, complexity' }),
        { status: 400 }
      );
    }

    console.log('[Large Diagram API] Generating diagram:', { prompt, diagramType, complexity });

    // Call the Python backend
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';
    const response = await fetch(`${pythonBackendUrl}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        diagram_type: diagramType,
        complexity
      }),
      signal: AbortSignal.timeout(300000)
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const result = await response.json();
    const mermaidCode = result.mermaid_code;
    const nodeCount = (mermaidCode.match(/\[.*?\]/g) || []).length;

    return new Response(
      JSON.stringify({
        success: true,
        mermaid_code: mermaidCode,
        diagram_type: result.diagram_type,
        complexity: result.complexity,
        generation_time: result.generation_time,
        node_count: nodeCount,
        tool_type: 'large_diagram'
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('[Large Diagram API] Generation failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500 }
    );
  }
};
