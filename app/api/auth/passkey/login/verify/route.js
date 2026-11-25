import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { configured, createSession, isAdminEmail, sessionCookieOptions } from '@/lib/auth';
import { sql } from '@/lib/db';
import { consumePasskeyChallenge, getPasskeyConfig } from '@/lib/passkeys';

export async function POST(request) {
  if (!configured()) {
    return Response.json({ error: 'Workspace authentication is not configured.' }, { status: 503 });
  }

  const expectedChallenge = await consumePasskeyChallenge('authentication');
  if (!expectedChallenge) {
    return Response.json({ error: 'Passkey sign-in expired. Please try again.' }, { status: 400 });
  }

  let response;
  try {
    response = await request.json();
  } catch {
    return Response.json({ error: 'Invalid passkey response. Please try again.' }, { status: 400 });
  }
  if (!response || typeof response.id !== 'string' || !response.id) {
    return Response.json({ error: 'Invalid passkey response. Please try again.' }, { status: 400 });
  }

  let config;
  try {
    config = getPasskeyConfig(request);
  } catch (error) {
    console.error('Passkey login configuration failed:', error);
    return Response.json({ error: error.message }, { status: 503 });
  }

  let credentials;
  let authorized;
  try {
    credentials = await sql`
      SELECT credential_id, email, public_key, counter, transports
      FROM passkey_credentials
      WHERE credential_id = ${response.id}
    `;
    const storedCredential = credentials[0];
    authorized = storedCredential && await isAdminEmail(storedCredential.email);
  } catch (error) {
    console.error('Passkey credential lookup failed:', error);
    return Response.json({ error: 'Unable to verify this passkey right now.' }, { status: 500 });
  }
  const credential = credentials[0];
  if (!credential || !authorized) {
    return Response.json({ error: 'This passkey is not authorized for workspace access.' }, { status: 401 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: config.origin,
      expectedRPID: config.rpID,
      credential: {
        id: credential.credential_id,
        publicKey: new Uint8Array(Buffer.from(credential.public_key, 'base64url')),
        counter: Number(credential.counter),
        transports: credential.transports,
      },
      requireUserVerification: true,
    });
  } catch (error) {
    console.warn('Passkey authentication response rejected:', error.message);
    return Response.json({ error: 'Passkey sign-in could not be verified.' }, { status: 401 });
  }
  if (!verification.verified) {
    return Response.json({ error: 'Passkey sign-in could not be verified.' }, { status: 401 });
  }

  try {
    await sql`
      UPDATE passkey_credentials
      SET counter = ${verification.authenticationInfo.newCounter},
          device_type = ${verification.authenticationInfo.credentialDeviceType},
          backed_up = ${verification.authenticationInfo.credentialBackedUp},
          last_used_at = now()
      WHERE credential_id = ${credential.credential_id}
    `;
    const token = await createSession(credential.email);
    const responseWithSession = NextResponse.json({ ok: true });
    responseWithSession.cookies.set('session', token, sessionCookieOptions());
    return responseWithSession;
  } catch (error) {
    console.error('Passkey session creation failed:', error);
    return Response.json({ error: 'Unable to complete passkey sign-in right now.' }, { status: 500 });
  }
}
