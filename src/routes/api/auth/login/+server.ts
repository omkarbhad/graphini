import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { login, createSessionCookie } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return json({ error: 'Email and password are required' }, { status: 400 });
    }

    const ip_address =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const user_agent = request.headers.get('user-agent') || undefined;

    const { user, token } = await login(email, password, { ip_address, user_agent });

    return json(
      {
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          avatar_url: user.avatar_url,
          role: user.role,
          created_at: user.created_at
        },
        token
      },
      {
        headers: { 'Set-Cookie': createSessionCookie(token) }
      }
    );
  } catch (err: any) {
    const message = err?.message || 'Login failed';
    return json({ error: message }, { status: 401 });
  }
};
