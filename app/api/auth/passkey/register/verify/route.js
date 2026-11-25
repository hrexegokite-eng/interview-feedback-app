import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { getAdmin } from '@/lib/auth';
import { sql } from '@/lib/db';
import { consumePasskeyChallenge, getPasskeyConfig } from '@/lib/passkeys';

export async function POST(request) {
  const admin = await getAdmin();
  if (!admin) return Response.json({ error: 'Sign in with Google before adding a passkey.' }, { status: 401 });

  const expectedChallenge = await consumePasskeyChallenge('registration', admin.email);
  if (!expectedChallenge) {
    return Response.json({ error: 'Passkey registration expired. Please try again.' }, { status: 400 });
  }

  let response;
  try {
    response = await request.json();
  } catch {
    return Response.json({ error: 'Invalid passkey registration response.' }, { status: 400 });
  }

  let config;
  try {
    config = getPasskeyConfig(request);
  } catch (error) {
    console.error('Passkey registration configuration failed:', error);
    return Response.json({ error: error.message }, { status: 503 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: config.origin,
      expectedRPID: config.rpID,
      requireUserVerification: true,
    });
  } catch (error) {
    console.warn('Passkey registration response rejected:', error.message);
    return Response.json({ error: 'Passkey registration could not be verified.' }, { status: 400 });
  }
  if (!verification.verified || !verification.registrationInfo) {
    return Response.json({ error: 'Passkey registration could not be verified.' }, { status: 400 });
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  try {
    const existing = await sql`
      SELECT email FROM passkey_credentials WHERE credential_id = ${credential.id}
    `;
    if (existing.length) {
      return Response.json({ error: 'This passkey is already registered.' }, { status: 409 });
    }

    await sql`
      INSERT INTO passkey_credentials
        (credential_id, email, public_key, counter, transports, device_type, backed_up)
      VALUES (
        ${credential.id},
        ${admin.email},
        ${Buffer.from(credential.publicKey).toString('base64url')},
        ${credential.counter},
        ${JSON.stringify(credential.transports || [])}::jsonb,
        ${credentialDeviceType},
        ${credentialBackedUp}
      )
    `;
    return Response.json({ ok: true });
  } catch (error) {
    console.error('Passkey registration verification failed:', error);
    return Response.json({ error: 'Unable to save this passkey. Please try again.' }, { status: 500 });
  }
}
