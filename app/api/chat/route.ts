export const runtime = 'edge';

const SYSTEM_PROMPT = `You are a helpful AI assistant specializing in creating high-quality diagrams and technical explanations.

IMPORTANT:
- Generate ONLY ONE diagram per response. Do not create multiple diagrams in a single response.
- Diagrams are automatically added to the canvas and not displayed in the chat interface.
- Focus on providing clear explanations and context for the diagram.
- Always show your thinking process using <think> tags before providing your response.

When creating Mermaid diagrams:
1. Use proper Mermaid syntax with clear, readable structure
2. Include meaningful labels and connections
3. Use appropriate diagram types (flowchart, sequence, class, etc.)
4. Make diagrams visually appealing and well-organized
5. **NEVER use parentheses () in node labels** - Use dashes or commas instead
6. **NEVER use style, class, classdef, or classDef commands** - They cause errors
7. Use subgraph for grouping, NOT cluster
8. Keep node IDs simple: A, B, C, node1, etc (no spaces or special chars)
9. **NEVER use "componentDiagram"** - Use "graph" or "flowchart" instead
10. Always wrap Mermaid code in proper code blocks:

\`\`\`mermaid
[mermaid diagram code]
\`\`\`

For flowcharts, use clear node shapes:
- Rectangles [text] for processes
- Diamonds {text} for decisions
- Circles ((text)) for start/end
- Stadium-shaped ([text]) for inputs/outputs

CORRECT Examples:
\`\`\`mermaid
flowchart TD
    A[Start Process] --> B{Check Status}
    B -->|Success| C[Continue]
    B -->|Fail| D[Retry - Max 3 times]
\`\`\`

WRONG Examples to AVOID:
- [Process (active)] ❌ Use: [Process - active] ✓
- style A fill:#ff0000 ❌ (No style commands) ✓
- cluster MyGroup ❌ Use: subgraph MyGroup ✓
- componentDiagram ❌ Use: graph TD or flowchart TD ✓

THINKING PROCESS:
Always start your response with your thinking process wrapped in <think> tags, like this:
<think>
Let me analyze this request...
I need to create a diagram that shows...
The best approach would be...
</think>

Then provide your main response with the diagram.

Be helpful, accurate, and provide clear explanations with well-structured diagrams.`;

export async function POST(req: Request) {
  try {
    const { messages, model = 'qwen/qwen3-coder:free' } = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      console.error('OpenRouter API key not configured');
      return new Response('OpenRouter API key not configured. Please add OPENROUTER_API_KEY to your .env.local file.', { status: 500 });
    }


    // Retry logic for better reliability
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
            'X-Title': 'Graphini Chat',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              ...messages,
            ],
            stream: true,
            max_tokens: 2048,
            temperature: 0.7,
            top_p: 0.9,
            frequency_penalty: 0,
            presence_penalty: 0,
          }),
          // Add timeout to prevent hanging requests
          signal: AbortSignal.timeout(45000), // 45 second timeout to prevent connection resets
        });

        if (!response.ok) {
          const error = await response.text();
          console.error(`OpenRouter API error (attempt ${attempt}):`, {
            status: response.status,
            statusText: response.statusText,
            error: error,
            model: model
          });
          
          // If it's a server error and we have retries left, try again
          if (response.status >= 500 && attempt < 2) {
            lastError = new Error(`Server error: ${response.status} - ${error}`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
            continue;
          }
          
          // Provide more specific error messages with full details
          let errorMessage = 'Unknown API error';
          if (response.status === 401) {
            errorMessage = `Invalid API key (401): ${error || 'Please check your OpenRouter API key configuration.'}`;
          } else if (response.status === 429) {
            errorMessage = `Rate limit exceeded (429): ${error || 'Please try again in a moment.'}`;
          } else if (response.status === 400) {
            errorMessage = `Invalid request (400): ${error || 'Please check your input and try again.'}`;
          } else if (response.status === 403) {
            errorMessage = `Forbidden (403): ${error || 'Access denied. Check your API key permissions.'}`;
          } else if (response.status === 404) {
            errorMessage = `Model not found (404): ${error || 'The requested model may not be available.'}`;
          } else if (response.status >= 500) {
            errorMessage = `OpenRouter service error (${response.status}): ${error || 'Service temporarily unavailable.'}`;
          } else {
            errorMessage = `API error (${response.status}): ${error || response.statusText}`;
          }
          
          return new Response(errorMessage, { status: response.status });
        }

        // Create a TransformStream to handle the OpenRouter response format
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
          async start(controller) {
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let controllerClosed = false;

            if (!reader) {
              if (!controllerClosed) {
                try {
                  controller.close();
                  controllerClosed = true;
                } catch (closeError) {
                  // Controller might already be closed, ignore the error
                  controllerClosed = true;
                }
              }
              return;
            }

            let accumulatedContent = '';
            let mermaidCode = '';
            let inMermaidBlock = false;
            let artifactId = '';
            let artifactTitle = '';
            let mermaidDeltaCount = 0;
            const MAX_MERMAID_DELTAS = 50; // Prevent infinite loops

            try {
              while (true) {
                const { done, value } = await reader.read();

                if (done) {
                  // Send final artifact data if we have mermaid code
                  if (mermaidCode && artifactId) {
                    const artifactData = JSON.stringify({
                      type: 'data-mermaidDelta',
                      data: mermaidCode
                    });
                    controller.enqueue(encoder.encode(`data: ${artifactData}\n\n`));
                  }
                  
                  // Always send finish signal at the end of stream
                  const finishData = JSON.stringify({
                    type: 'finish',
                    data: null
                  });
                  controller.enqueue(encoder.encode(`data: ${finishData}\n\n`));
                  
                  if (!controllerClosed) {
                    try {
                      controller.close();
                      controllerClosed = true;
                    } catch (closeError) {
                      // Controller might already be closed, ignore the error
                      controllerClosed = true;
                    }
                  }
                  break;
                }

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6);

                    if (data === '[DONE]') {
                      continue;
                    }

                    try {
                      const parsed = JSON.parse(data);
                      const content = parsed.choices[0]?.delta?.content;

                      if (content) {
                        accumulatedContent += content;
                        
                        // Check for mermaid code blocks with improved regex
                        const mermaidMatch = accumulatedContent.match(/```mermaid\s*\n([\s\S]*?)(?=\n```|$)/);
                        
                        if (mermaidMatch && !inMermaidBlock) {
                          // Start of mermaid block detected
                          inMermaidBlock = true;
                          artifactId = `artifact-${Date.now()}`;
                          artifactTitle = 'Mermaid Diagram';
                          
                          // Send artifact initialization
                          const initData = JSON.stringify({
                            type: 'data-id',
                            data: artifactId
                          });
                          controller.enqueue(encoder.encode(`data: ${initData}\n\n`));
                          
                          const titleData = JSON.stringify({
                            type: 'data-title',
                            data: artifactTitle
                          });
                          controller.enqueue(encoder.encode(`data: ${titleData}\n\n`));
                          
                          const kindData = JSON.stringify({
                            type: 'data-kind',
                            data: 'mermaid'
                          });
                          controller.enqueue(encoder.encode(`data: ${kindData}\n\n`));
                        }
                        
                        if (inMermaidBlock) {
                          // Extract mermaid code from the accumulated content
                          const mermaidMatch = accumulatedContent.match(/```mermaid\s*\n([\s\S]*?)(?=\n```|$)/);
                          if (mermaidMatch) {
                            const newMermaidCode = mermaidMatch[1].trim();
                            // Only send if the code has actually changed and is not empty
                            if (newMermaidCode !== mermaidCode && newMermaidCode.length > 0 && mermaidDeltaCount < MAX_MERMAID_DELTAS) {
                              mermaidCode = newMermaidCode;
                              mermaidDeltaCount++;
                              
                              // Send mermaid delta
                              const mermaidData = JSON.stringify({
                                type: 'data-mermaidDelta',
                                data: mermaidCode
                              });
                              controller.enqueue(encoder.encode(`data: ${mermaidData}\n\n`));
                            } else if (mermaidDeltaCount >= MAX_MERMAID_DELTAS) {
                              // Force completion to prevent infinite loop
                              inMermaidBlock = false;
                              mermaidCode = '';
                              mermaidDeltaCount = 0;
                            }
                          }
                          
                          // Check if mermaid block is complete (look for closing ```)
                          if (accumulatedContent.includes('```')) {
                            // Check if we have a complete mermaid block
                            const completeMatch = accumulatedContent.match(/```mermaid\s*\n([\s\S]*?)\n```/);
                            if (completeMatch) {
                              inMermaidBlock = false;
                              mermaidCode = '';
                              mermaidDeltaCount = 0; // Reset counter for next diagram
                              // keep only the content after the finished block so we can detect subsequent diagrams
                              const lastFenceIndex = accumulatedContent.lastIndexOf('```');
                              if (lastFenceIndex !== -1) {
                                accumulatedContent = accumulatedContent.slice(lastFenceIndex + 3);
                              } else {
                                accumulatedContent = '';
                              }
                            }
                          }
                        }
                        
                        // Send regular content
                        const contentEvent = JSON.stringify({
                          type: 'content',
                          data: content,
                        });
                        controller.enqueue(encoder.encode(`data: ${contentEvent}\n\n`));
                      }
                    } catch (e) {
                      // Skip invalid JSON - this is common with streaming responses
                      continue;
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Stream error:', {
                error: error,
                message: error instanceof Error ? error.message : String(error),
                code: (error as any)?.code,
                name: error instanceof Error ? error.name : 'Unknown'
              });
              
              // Handle connection reset errors gracefully
              if (error instanceof Error && 
                  (error.message.includes('ECONNRESET') || 
                   (error as any)?.code === 'ECONNRESET' ||
                   error.message.includes('aborted'))) {
                if (!controllerClosed) {
                  try {
                    controller.close();
                    controllerClosed = true;
                  } catch (closeError) {
                    // Controller might already be closed, ignore the error
                    controllerClosed = true;
                  }
                }
              } else {
                if (!controllerClosed) {
                  try {
                    controller.error(error);
                    controllerClosed = true;
                  } catch (errorError) {
                    // Controller might already be closed, try to close it instead
                    try {
                      controller.close();
                      controllerClosed = true;
                    } catch (closeError) {
                      // Controller already closed, ignore
                      controllerClosed = true;
                    }
                  }
                }
              }
            }
          },
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Transfer-Encoding': 'chunked',
          },
        });
      } catch (error) {
        lastError = error as Error;
        console.error(`Request attempt ${attempt} failed:`, {
          error: error,
          message: error instanceof Error ? error.message : String(error),
          code: (error as any)?.code,
          name: error instanceof Error ? error.name : 'Unknown'
        });
        
        // Handle specific connection errors
        if (error instanceof Error) {
          if (error.message.includes('ECONNRESET') || (error as any)?.code === 'ECONNRESET') {
            console.error('Connection reset detected, will retry...');
          } else if (error.message.includes('aborted') || error.name === 'AbortError') {
            console.error('Request aborted, will retry...');
          } else if (error.message.includes('fetch')) {
            console.error('Fetch error detected, will retry...');
          }
        }
        
        // If this is the last attempt, throw the error
        if (attempt === 2) {
          throw error;
        }
        
        // Wait before retrying with exponential backoff
        const delay = 1000 * attempt + Math.random() * 1000; // Add jitter
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // If we get here, all attempts failed
    throw lastError || new Error('All retry attempts failed');
  } catch (error) {
    console.error('Chat API error:', {
      error: error,
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Provide more specific error messages based on error type
    let errorMessage = 'Internal server error';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('ECONNRESET') || (error as any)?.code === 'ECONNRESET') {
        errorMessage = 'Connection reset by server. The AI service connection was interrupted. Please try again.';
        statusCode = 503;
      } else if (error.name === 'AbortError' || error.message.includes('timeout')) {
        errorMessage = 'Request timeout. The AI service is taking too long to respond. Please try again.';
        statusCode = 408;
      } else if (error.message.includes('aborted')) {
        errorMessage = 'Request was aborted. Please try again.';
        statusCode = 408;
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
        statusCode = 503;
      } else if (error.message.includes('API key')) {
        errorMessage = 'API key configuration error. Please check your environment variables.';
        statusCode = 500;
      } else if (error.message.includes('All retry attempts failed')) {
        errorMessage = 'Service temporarily unavailable after multiple attempts. Please try again in a moment.';
        statusCode = 503;
      } else {
        errorMessage = `Error: ${error.message}`;
      }
    }
    
    return new Response(errorMessage, { status: statusCode });
  }
}
