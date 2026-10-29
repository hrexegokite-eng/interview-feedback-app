'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo, api } from '@/components/ui';

export default function ExitFormComingSoon() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/auth/me')
      .then(() => setLoading(false))
      .catch(() => router.replace('/login'));
  }, [router]);

  if (loading) {
    return (
      <div className="wide center" style={{ paddingTop: 100 }}>
        <Logo h={60} style={{ margin: '0 auto 24px' }} />
        <p className="mut">Loading workspace…</p>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="shell-panel" style={{ padding: 18 }}>
        <div className="bar">
          <div className="brand" style={{ margin: 0, gap: 14 }}>
            <Logo h={44} />
            <span style={{ fontWeight: 600, fontSize: 15, borderLeft: '1px solid var(--line)', paddingLeft: 14 }}>
              Exit Form
            </span>
          </div>
          <button className="btn ghost" onClick={() => router.push('/portal')}>
            Back to Workspace
          </button>
        </div>

        <div className="center" style={{ padding: '100px 20px' }}>
          <div style={{ color: 'var(--acc)', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 600, background: 'var(--accb)', borderRadius: 20, padding: '6px 12px' }}>
              Coming Soon
            </span>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
            Exit Form
          </h1>
          <p className="mut" style={{ fontSize: 16, margin: 0 }}>
            The employee offboarding module is coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
