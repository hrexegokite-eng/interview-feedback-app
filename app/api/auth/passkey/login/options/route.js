import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { configured } from '@/lib/auth';
import { getPasskeyConfig, savePasskeyChallenge } from '@/lib/passkeys';

export async function POST(request) {
  if (!configured()) {
    return Response.json({ error: 'Workspace authentication is not configured.' }, { status: 503 });
  }

  try {
    const { rpID } = getPasskeyConfig(request);
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'required',
    });
    await savePasskeyChallenge(options.challenge, 'authentication');
    return Response.json(options);
  } catch (error) {
    console.error('Passkey login options failed:', error);
    const status = error.message?.includes('requires HTTPS') ? 503 : 500;
    return Response.json({
      error: status === 503 ? error.message : 'Unable to start passkey sign-in.',
    }, { status });
  }
}
