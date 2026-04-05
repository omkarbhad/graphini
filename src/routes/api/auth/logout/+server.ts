import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logout, extractToken, clearSessionCookie } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const token = extractToken(request);
    if (token) {
      await logout(token);
    }
    return json({ success: true }, { headers: { 'Set-Cookie': clearSessionCookie() } });
  } catch {
    return json({ success: true }, { headers: { 'Set-Cookie': clearSessionCookie() } });
  }
};
