'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo, Av, Icon, api } from '@/components/ui';

export default function Portal() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/auth/me')
      .then((data) => {
        setMe(data);
        setLoading(false);
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [router]);

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  if (loading) {
    return (
      <div className="wide center" style={{ paddingTop: 100 }}>
        <Logo h={60} style={{ margin: '0 auto 24px' }} />
        <p className="mut">Loading workspace modules…</p>
      </div>
    );
  }

  const displayName = me?.name || me?.email?.split('@')[0] || 'Admin';

  return (
    <div className="wide" style={{ maxWidth: 960, margin: '0 auto', paddingTop: 28 }}>
      {/* Top Bar */}
      <div className="bar" style={{ marginBottom: 36 }}>
        <div className="brand" style={{ margin: 0, gap: 14 }}>
          <Logo h={44} />
          <span style={{ fontWeight: 600, fontSize: 15, borderLeft: '1px solid var(--line)', paddingLeft: 14 }}>
            Go Kite Workspace
          </span>
        </div>
        <div className="me">
          <Av name={me?.name || me?.email} small />
          <span>{me?.email}</span>
          <button className="btn ghost" onClick={logout}>Sign out</button>
        </div>
      </div>

      {/* Hero Welcome */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'inline-block', padding: '4px 12px', background: 'var(--accb)', color: 'var(--acc)', borderRadius: 20, fontSize: 12.5, fontWeight: 600, marginBottom: 12 }}>
          Enterprise Portal
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
          Welcome back, {displayName}
        </h1>
        <p className="mut" style={{ fontSize: 15, marginTop: 8 }}>
          Select a workspace module below to access your tools and dashboards.
        </p>
      </div>

      {/* Modules Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Active Module: Interview Feedback */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => router.push('/admin')}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && router.push('/admin')}
          className="card"
          style={{
            cursor: 'pointer',
            padding: 26,
            borderRadius: 18,
            border: '1.5px solid color-mix(in srgb, var(--acc) 45%, var(--line))',
            background: 'linear-gradient(145deg, var(--card), color-mix(in srgb, var(--accb) 30%, var(--card)))',
            boxShadow: 'var(--sh-md)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
            position: 'relative',
            overflow: 'hidden',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 12px 36px rgba(79,70,229,0.18)';
            e.currentTarget.style.borderColor = 'var(--acc)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'var(--sh-md)';
            e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--acc) 45%, var(--line))';
          }}
        >
          {/* Header pill */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: 'linear-gradient(135deg, var(--acc), var(--acc2))',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
              }}
            >
              <Icon n="cal" s={24} />
            </div>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 99,
                fontSize: 11.5,
                fontWeight: 600,
                background: 'var(--okb)',
                color: 'var(--ok)',
                border: '1px solid color-mix(in srgb, var(--ok) 30%, transparent)',
              }}
            >
              ● Active Module
            </span>
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
            Interview Feedback
          </h2>

          <p className="mut" style={{ fontSize: 13.5, lineHeight: 1.55, margin: '0 0 22px' }}>
            Schedule multi-round interviews, generate secure feedback links, attach CVs, and track hiring decisions in real time.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--mut)' }}>
              Candidate pipeline & evaluations
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13.5,
                fontWeight: 600,
                color: 'var(--acc)',
              }}
            >
              Open Module →
            </span>
          </div>
        </div>

        {/* Future Module Placeholder 1: Employee Directory */}
        <div
          className="card"
          style={{
            padding: 26,
            borderRadius: 18,
            border: '1px dashed var(--line)',
            background: 'var(--card)',
            opacity: 0.65,
            cursor: 'not-allowed',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: 'var(--soft)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--mut)',
              }}
            >
              <Icon n="user" s={24} />
            </div>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 99,
                fontSize: 11.5,
                fontWeight: 500,
                background: 'var(--soft)',
                color: 'var(--mut)',
              }}
            >
              Coming Soon
            </span>
          </div>

          <h2 style={{ fontSize: 19, fontWeight: 600, margin: '0 0 8px', color: 'var(--ink2)' }}>
            Employee Directory
          </h2>

          <p className="mut" style={{ fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>
            Centralized team profiles, department rosters, reporting hierarchies, and staff contact information.
          </p>
        </div>

        {/* Future Module Placeholder 2: Performance Reviews */}
        <div
          className="card"
          style={{
            padding: 26,
            borderRadius: 18,
            border: '1px dashed var(--line)',
            background: 'var(--card)',
            opacity: 0.65,
            cursor: 'not-allowed',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: 'var(--soft)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--mut)',
              }}
            >
              <Icon n="check" s={24} />
            </div>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 99,
                fontSize: 11.5,
                fontWeight: 500,
                background: 'var(--soft)',
                color: 'var(--mut)',
              }}
            >
              Coming Soon
            </span>
          </div>

          <h2 style={{ fontSize: 19, fontWeight: 600, margin: '0 0 8px', color: 'var(--ink2)' }}>
            Performance Reviews
          </h2>

          <p className="mut" style={{ fontSize: 13.5, lineHeight: 1.55, margin: 0 }}>
            Quarterly goals, 360-degree feedback, performance appraisals, and employee growth milestones.
          </p>
        </div>
      </div>
    </div>
  );
}
