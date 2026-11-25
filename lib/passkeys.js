import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { sql } from '@/lib/db';

const CHALLENGE_COOKIE = 'passkey_challenge';
const CHALLENGE_TTL_SECONDS = 300;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getPasskeyConfig(request) {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0].trim();
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0].trim();
  const host = forwardedHost || request.headers.get('host');
  const requestOrigin = host
    ? `${forwardedProto || new URL(request.url).protocol.replace(':', '')}://${host}`
    : request.url;
  const appUrl = new URL(process.env.APP_URL || requestOrigin);
  const localHost = ['localhost', '127.0.0.1', '[::1]'].includes(appUrl.hostname);
  if (appUrl.protocol !== 'https:' && !localHost) {
    throw new Error('Passkey sign-in requires HTTPS. Configure APP_URL with the secure workspace URL.');
  }
  return { rpID: appUrl.hostname, origin: appUrl.origin };
}

export async function savePasskeyChallenge(challenge, purpose, email = null) {
  const cookieStore = await cookies();
  const previousId = cookieStore.get(CHALLENGE_COOKIE)?.value;
  if (previousId && UUID.test(previousId)) {
    await sql`DELETE FROM passkey_challenges WHERE id = ${previousId}::uuid`;
  }
  await sql`DELETE FROM passkey_challenges WHERE created_at < now() - interval '5 minutes'`;

  const id = randomUUID();
  await sql`
    INSERT INTO passkey_challenges (id, purpose, challenge, email)
    VALUES (${id}::uuid, ${purpose}, ${challenge}, ${email})
  `;
  cookieStore.set(CHALLENGE_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CHALLENGE_TTL_SECONDS,
  });
}

export async function consumePasskeyChallenge(purpose, email = null) {
  const cookieStore = await cookies();
  const id = cookieStore.get(CHALLENGE_COOKIE)?.value;
  cookieStore.delete(CHALLENGE_COOKIE);
  if (!id || !UUID.test(id)) return null;

  const rows = purpose === 'registration'
    ? await sql`
      DELETE FROM passkey_challenges
      WHERE id = ${id}::uuid AND purpose = 'registration' AND email = ${email}
        AND created_at >= now() - interval '5 minutes'
      RETURNING challenge
    `
    : await sql`
      DELETE FROM passkey_challenges
      WHERE id = ${id}::uuid AND purpose = 'authentication' AND email IS NULL
        AND created_at >= now() - interval '5 minutes'
      RETURNING challenge
    `;
  return rows[0]?.challenge || null;
}
