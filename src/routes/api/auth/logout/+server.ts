import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSignoutUrl } from '$lib/server/auth';

export const GET: RequestHandler = async () => {
  throw redirect(302, getSignoutUrl());
};
