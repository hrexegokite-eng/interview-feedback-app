'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo, Icon } from '@/components/ui';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" style={{ flex: 'none' }}>
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [err, setErr] = useState('');
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleStatus, setGoogleStatus] = useState(null);
  const [showDevGoogle, setShowDevGoogle] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('admin@gokite.com');

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) setErr(errorParam);

    fetch('/api/auth/google/status')
      .then((r) => r.json())
      .then(setGoogleStatus)
      .catch(() => {});
  }, [searchParams]);

  async function handleGoogleClick() {
    setErr('');
    if (googleStatus?.configured) {
      setGoogleBusy(true);
      window.location.href = '/api/auth/google';
    } else {
      setShowDevGoogle(true);
    }
  }

  async function handleDevGoogleLogin(emailToUse) {
    const em = emailToUse || googleEmail;
    if (!em) return;
    setGoogleBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/auth/google/dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      router.replace('/portal');
    } catch (e) {
      setErr(e.message);
      setGoogleBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="shell-panel login-panel">
        <div className="center" style={{ paddingBottom: 24 }}>
          <Logo h={72} style={{ margin: '0 auto 26px' }} />
          <h1>Hiring dashboard</h1>
          <p className="mut" style={{ marginTop: 8 }}>Sign in to manage interviews.</p>
        </div>

        <div className="card" style={{ background: 'rgba(17, 24, 29, 0.9)' }}>
          {/* Google sign-in button */}
          <button
            type="button"
            className="btn google full"
            disabled={googleBusy}
            onClick={handleGoogleClick}
            style={{ margin: 0, justifyContent: 'center' }}
          >
            {googleBusy ? (
              <><span className="btn-spinner" aria-hidden="true" />Connecting to Google…</>
            ) : (
              <><GoogleIcon />Continue with Google</>
            )}
          </button>

          {err && <p className="err shake" style={{ marginTop: 16 }}>{err}</p>}
        </div>

      {/* Google Dev / Setup Dialog */}
      {showDevGoogle && (
        <div className="ov" onClick={(e) => e.target === e.currentTarget && setShowDevGoogle(false)}>
          <div className="pn" style={{ maxWidth: 460 }} role="dialog" aria-label="Google sign in">
            <div className="top">
              <span className="sm mut">Google authentication</span>
              <button className="btn ghost" onClick={() => setShowDevGoogle(false)}><Icon n="x" s={14} /></button>
            </div>
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--soft)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
                <GoogleIcon />
              </div>
              <h2 style={{ fontSize: 18 }}>Sign in with Google</h2>
              <p className="sm mut" style={{ marginTop: 6, lineHeight: 1.5 }}>
                {googleStatus?.configured
                  ? 'Sign in using your Google account.'
                  : 'For local testing, choose a Google account below or configure Google Cloud credentials in .env.local.'}
              </p>
            </div>

            <div style={{ marginTop: 20 }}>
              <label>Google account email</label>
              <input
                type="email"
                placeholder="your.email@gmail.com"
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
              />
              <button
                type="button"
                className="btn full primary"
                disabled={googleBusy}
                onClick={() => handleDevGoogleLogin()}
                style={{ marginTop: 14 }}
              >
                {googleBusy ? <><span className="btn-spinner" />Signing in…</> : 'Sign in with this Google account'}
              </button>
            </div>

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
              <p className="sm mut" style={{ fontSize: 11.5, lineHeight: 1.5 }}>
                💡 <b>To enable live Google OAuth redirect:</b><br />
                Add <code style={{ background: 'var(--soft)', padding: '2px 4px', borderRadius: 4 }}>GOOGLE_CLIENT_ID</code> and{' '}
                <code style={{ background: 'var(--soft)', padding: '2px 4px', borderRadius: 4 }}>GOOGLE_CLIENT_SECRET</code> to your <code style={{ background: 'var(--soft)', padding: '2px 4px', borderRadius: 4 }}>.env.local</code>.
              </p>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div className="narrow"><p className="mut center">Loading…</p></div>}>
      <LoginForm />
    </Suspense>
  );
}
