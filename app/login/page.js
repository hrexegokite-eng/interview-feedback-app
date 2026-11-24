'use client';
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo, Icon, LoadingState } from '@/components/ui';

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

function playWelcomeSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return false;

  const context = new AudioContextClass();
  const playNotes = () => {
    const notes = [
      { frequency: 523.25, start: 0, duration: 0.18 },
      { frequency: 659.25, start: 0.13, duration: 0.2 },
      { frequency: 783.99, start: 0.27, duration: 0.28 },
    ];

    notes.forEach(({ frequency, start, duration }) => {
      const oscillator = context.createOscillator();
      const volume = context.createGain();
      const noteStart = context.currentTime + start;
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      volume.gain.setValueAtTime(0, noteStart);
      volume.gain.linearRampToValueAtTime(0.12, noteStart + 0.025);
      volume.gain.exponentialRampToValueAtTime(0.001, noteStart + duration);
      oscillator.connect(volume).connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + duration);
    });

    window.setTimeout(() => { void context.close(); }, 900);
  };

  if (context.state === 'suspended') {
    context.resume().then(playNotes);
  } else {
    playNotes();
  }
  return true;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [err, setErr] = useState('');
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleStatus, setGoogleStatus] = useState(null);
  const [showDevGoogle, setShowDevGoogle] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('hrops@gokitetours.com');

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
      const soundPlayed = playWelcomeSound();
      setGoogleBusy(true);
      window.setTimeout(() => {
        window.location.href = '/api/auth/google';
      }, soundPlayed ? 600 : 0);
    } else {
      setShowDevGoogle(true);
    }
  }

  async function handleDevGoogleLogin(emailToUse) {
    const em = emailToUse || googleEmail;
    if (!em) return;
    playWelcomeSound();
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
        <section className="login-story" aria-label="Go Kite hiring workspace">
          <div className="login-story-brand">
            <Logo h={68} />
            <span>GO KITE <i /> TRAVEL &amp; TOURS</span>
          </div>
          <div className="login-story-label">
            <span className="login-kicker">PEOPLE-FIRST HIRING</span>
            <span className="login-story-index">01 <i /> 03</span>
          </div>
          <div className="login-story-copy">
            <h1>Great teams begin with <em>better conversations.</em></h1>
            <p>A more thoughtful way to interview, share feedback, and make confident hiring decisions.</p>
          </div>
          <div className="login-story-footer">
            <span>THOUGHTFUL INTERVIEWS</span>
            <i />
            <span>CLEARER DECISIONS</span>
          </div>
          <svg className="login-kite-art" viewBox="0 0 260 290" fill="none" aria-hidden="true">
            <path d="M44 21 222 29l22 136L34 226 44 21Z" fill="url(#kite-fill)" />
            <path d="m44 21 92 101 108 43M222 29l-86 93L34 226" stroke="url(#kite-stroke)" strokeWidth="2" />
            <path d="M34 226c-54 32-62 57-43 71 16 11 46-5 49 14 2 14-21 23-25 43" stroke="url(#kite-stroke)" strokeWidth="2" strokeLinecap="round" />
            <defs>
              <linearGradient id="kite-fill" x1="30" y1="18" x2="221" y2="230" gradientUnits="userSpaceOnUse">
                <stop stopColor="#85E1D2" stopOpacity=".16" />
                <stop offset="1" stopColor="#85E1D2" stopOpacity=".015" />
              </linearGradient>
              <linearGradient id="kite-stroke" x1="40" y1="18" x2="218" y2="284" gradientUnits="userSpaceOnUse">
                <stop stopColor="#9BE4D9" stopOpacity=".6" />
                <stop offset="1" stopColor="#9BE4D9" stopOpacity=".08" />
              </linearGradient>
            </defs>
          </svg>
        </section>

        <section className="login-content" aria-labelledby="login-title">
          <div className="login-content-inner">
            <div className="login-workspace-label">
              <span className="login-workspace-mark" aria-hidden="true"><i /><i /><i /></span>
              <span>HIRING WORKSPACE</span>
            </div>
            <div className="login-content-head">
              <h2 id="login-title">Welcome back.</h2>
              <p>Your next great hire starts with a thoughtful conversation.</p>
            </div>

            <button
              type="button"
              className="btn google full"
              disabled={googleBusy}
              onClick={handleGoogleClick}
            >
              {googleBusy ? (
                <><span className="btn-spinner" aria-hidden="true" />Connecting to Google…</>
              ) : (
                <><GoogleIcon />Continue with Google</>
              )}
            </button>

            <div className="login-assurance">
              <Icon n="lock" s={14} />
              <span>Secure sign-in with your Google account</span>
            </div>

            {err && <p className="err shake login-error" role="alert">{err}</p>}
          </div>
          <div className="login-content-footer">
            <span>GO KITE <i /> INTERVIEW FEEDBACK</span>
            <span>Thoughtful hiring, together.</span>
          </div>
        </section>

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
    <Suspense fallback={<LoadingState label="Preparing sign in" />}>
      <LoginForm />
    </Suspense>
  );
}
