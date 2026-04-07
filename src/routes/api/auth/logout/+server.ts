import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clearLocalSessionCookie, getSignoutUrl } from '$lib/server/auth';

export const GET: RequestHandler = async () => {
  // Clear local session cookie, then redirect to magnova-auth signout
  throw redirect(302, getSignoutUrl());
};

export const POST: RequestHandler = async ({ url }) => {
  // Local logout — clear graphini_session cookie and redirect to home
  const secureCookie = url.protocol === 'https:';
  return new Response(null, {
    status: 302,
    headers: {
      'Set-Cookie': clearLocalSessionCookie(secureCookie),
      Location: '/'
    }
  });
};
