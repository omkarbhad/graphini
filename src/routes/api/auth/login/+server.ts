import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAuthUrl } from '$lib/server/auth';

export const GET: RequestHandler = async ({ url }) => {
  const returnTo = url.searchParams.get('returnTo') || undefined;
  throw redirect(302, getAuthUrl(returnTo));
};
