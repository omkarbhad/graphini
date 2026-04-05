import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSignoutUrl } from '$lib/server/auth';

export const GET: RequestHandler = async () => {
  // Clear local session cookie, then redirect to magnova-auth signout
  throw redirect(302, getSignoutUrl());
};

export const POST: RequestHandler = async () => {
  // Local logout — clear graphini_session cookie and redirect to home
  return new Response(null, {
    status: 302,
    headers: {
      'Set-Cookie': 'graphini_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
      Location: '/'
    }
  });
};
