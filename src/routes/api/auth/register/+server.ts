import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { register, createSessionCookie } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, password, display_name } = body;

    if (!email || !password) {
      return json({ error: 'Email and password are required' }, { status: 400 });
    }

    const { user, token } = await register(email, password, display_name);

    return json(
      {
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          role: user.role,
          created_at: user.created_at
        },
        token
      },
      {
        status: 201,
        headers: { 'Set-Cookie': createSessionCookie(token) }
      }
    );
  } catch (err: any) {
    const message = err?.message || 'Registration failed';
    const status = message.includes('already registered') ? 409 : 400;
    return json({ error: message }, { status });
  }
};
