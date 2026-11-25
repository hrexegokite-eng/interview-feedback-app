import { generateRegistrationOptions } from '@simplewebauthn/server';
import { getAdmin } from '@/lib/auth';
import { sql } from '@/lib/db';
import { getPasskeyConfig, savePasskeyChallenge } from '@/lib/passkeys';

export async function POST(request) {
  const admin = await getAdmin();
  if (!admin) return Response.json({ error: 'Sign in with Google before adding a passkey.' }, { status: 401 });

  try {
    const { rpID } = getPasskeyConfig(request);
    const users = await sql`
      INSERT INTO passkey_users (email) VALUES (${admin.email})
      ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
      RETURNING webauthn_user_id
    `;
    const credentials = await sql`
      SELECT credential_id, transports
      FROM passkey_credentials
      WHERE email = ${admin.email}
    `;
    const options = await generateRegistrationOptions({
      rpName: 'Go Kite Workspace',
      rpID,
      userID: new TextEncoder().encode(users[0].webauthn_user_id),
      userName: admin.email,
      userDisplayName: typeof admin.name === 'string' && admin.name ? admin.name : admin.email,
      attestationType: 'none',
      excludeCredentials: credentials.map((credential) => ({
        id: credential.credential_id,
        transports: credential.transports,
      })),
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required',
      },
    });

    await savePasskeyChallenge(options.challenge, 'registration', admin.email);
    return Response.json(options);
  } catch (error) {
    console.error('Passkey registration options failed:', error);
    const status = error.message?.includes('requires HTTPS') ? 503 : 500;
    return Response.json({
      error: status === 503 ? error.message : 'Unable to start passkey registration.',
    }, { status });
  }
}
