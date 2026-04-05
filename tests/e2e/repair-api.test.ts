import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { repairMermaidCode } from '$lib/util/mermaidRepair';

// Mock the fetch API
const server = setupServer(
  rest.post('http://localhost:5173/api/repair', async (req, res, ctx) => {
    const { code } = await req.json();

    // Simple repair logic for testing
    if (code.includes('-->')) {
      return res(
        ctx.json({
          success: true,
          code: code.replace('-->', ' --> '), // Add spaces around arrow as a simple repair
          originalLength: code.length,
          repairedLength: code.length + 2
        })
      );
    }

    return res(
      ctx.status(400),
      ctx.json({
        success: false,
        message: 'Invalid Mermaid code'
      })
    );
  })
);

// Enable API mocking before tests
beforeAll(() => server.listen());

// Reset any request handlers that we may add during tests
afterEach(() => server.resetHandlers());

// Clean up after tests
afterAll(() => server.close());

describe('Mermaid Repair API', () => {
  it('should repair simple Mermaid code', async () => {
    const brokenCode = 'graph TD;A-->B';
    const result = await repairMermaidCode(brokenCode);

    expect(result.success).toBe(true);
    expect(result.code).toBe('graph TD;A --> B');
    expect(result.originalLength).toBe(brokenCode.length);
    expect(result.repairedLength).toBeGreaterThan(brokenCode.length);
  });

  it('should handle API errors', async () => {
    // Force an error response
    server.use(
      rest.post('http://localhost:5173/api/repair', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({
            success: false,
            message: 'Internal server error'
          })
        );
      })
    );

    const result = await repairMermaidCode('invalid code');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle network errors', async () => {
    // Force a network error
    server.use(
      rest.post('http://localhost:5173/api/repair', (req, res) => {
        return res.networkError('Failed to connect');
      })
    );

    const result = await repairMermaidCode('graph TD;A-->B');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
