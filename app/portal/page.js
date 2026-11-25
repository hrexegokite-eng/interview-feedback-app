'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo, Av, Icon, LoadingState, api } from '@/components/ui';

export default function Portal() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState({});
  const [moduleError, setModuleError] = useState('');

  useEffect(() => {
    api('/api/auth/me')
      .then((data) => {
        setMe(data);
        return api('/api/workspace-modules').then((items) => {
          setModules(Object.fromEntries(items.map((item) => [item.key, item.enabled])));
          setModuleError('');
          setLoading(false);
        }).catch((error) => {
          setModuleError(error.message);
          setLoading(false);
        });
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
    return <LoadingState label="Loading workspace modules" />;
  }

  const displayName = me?.name || me?.email?.split('@')[0] || 'Admin';
  const activeModuleCount = Object.values(modules).filter(Boolean).length;

  return (
    <div className="page-shell">
      <div className="shell-panel workspace-panel">
        <div className="bar">
          <div className="brand" style={{ margin: 0, gap: 14 }}>
            <Logo h={44} />
            <span style={{ fontWeight: 600, fontSize: 15, borderLeft: '1px solid var(--line)', paddingLeft: 14 }}>
              Go Kite Workspace
            </span>
          </div>
          <div className="me">
            <Av name={me?.name || me?.email} small />
            <span>{me?.email}</span>
            {me?.role === 'superadmin' && <button className="btn ghost" onClick={() => router.push('/super-admin')}>Super admin</button>}
            <button className="btn ghost" onClick={logout}>Sign out</button>
          </div>
        </div>

        <section className="dashboard-hero">
          <div className="dashboard-hero-copy">
            <span className="dashboard-eyebrow"><span /> YOUR WORKSPACE</span>
            <h1>Welcome back, {displayName}</h1>
            <p>Your tools, thoughtfully brought together. Choose a module to continue.</p>
          </div>
          <div className="dashboard-hero-action">
            {!moduleError && <span className="dashboard-live"><i /> {activeModuleCount} active {activeModuleCount === 1 ? 'module' : 'modules'}</span>}
            <a className="btn primary" href="#workspace-modules">Explore modules</a>
          </div>
        </section>

        <div className="portal-grid" id="workspace-modules">
        {moduleError && <p className="err" role="alert">{moduleError}</p>}
        {/* Active Module: Interview Feedback */}
        {modules['interview-feedback'] && <div
          role="button"
          tabIndex={0}
          onClick={() => router.push('/admin')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              router.push('/admin');
            }
          }}
          className="card portal-module"
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
        </div>}

        {/* Workspace module: Exit Form */}
        {modules['exit-form'] && <div
          role="button"
          tabIndex={0}
          onClick={() => router.push('/exit-form')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              router.push('/exit-form');
            }
          }}
          className="card portal-module"
        >
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
              }}
            >
              <Icon n="file" s={24} />
            </div>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 99,
                fontSize: 11.5,
                fontWeight: 600,
                background: 'var(--okb)',
                color: 'var(--ok)',
              }}
            >
              ● Active Module
            </span>
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
            Exit Form
          </h2>

          <p className="mut" style={{ fontSize: 13.5, lineHeight: 1.55, margin: '0 0 22px' }}>
            Manage employee exit requests, offboarding details, and clearance workflows.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, borderTop: '1px solid var(--line)' }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--mut)' }}>
              Employee offboarding & feedback
            </span>
            <span style={{ color: 'var(--acc)', fontWeight: 600 }}>Open Module →</span>
          </div>
        </div>}

        {/* Future Module Placeholder 1: Employee Directory */}
        <div
          className="card portal-module-coming"
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
          className="card portal-module-coming"
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
    </div>
  );
}
