'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon, LoadingState, Logo, api } from '@/components/ui';
import './hrops.css';

const tools = [
  {
    title: 'Full & Final Settlement',
    shortName: 'FNF',
    description: 'Prepare settlements, organize statements by employee, and print or save them as PDF.',
    route: '/fnf',
    icon: 'file',
  },
  {
    title: 'Payslip Generator',
    shortName: 'Payslips',
    description: 'Create attendance-based salary slips and save them in an employee folder.',
    route: '/payslip',
    icon: 'cal',
  },
];

export default function HropsHome() {
  const router = useRouter();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/api/auth/me'), api('/api/workspace-modules')])
      .then(([admin, modules]) => {
        setIsSuperAdmin(admin.role === 'superadmin');
        if (!modules.some((module) => module.key === 'hrops' && module.enabled)) {
          router.replace('/portal');
          return;
        }
        setLoading(false);
      })
      .catch((error) => {
        if (error.status === 401) router.replace('/login');
        else {
          setError(error.message || 'Could not load HROps tools.');
          setLoading(false);
        }
      });
  }, [router]);

  if (loading) return <LoadingState label="Loading HROps" />;

  return (
    <div className="page-shell hrops-page-shell">
      <div className="shell-panel workspace-panel hrops-workspace-panel">
        <div className="bar hrops-topbar">
          <div className="hrops-brand">
            <Logo h={44} />
            <span className="hrops-brand-divider" aria-hidden="true" />
            <span className="hrops-brand-title">People operations</span>
          </div>
          <div className="me hrops-topbar-actions">
            <button className="btn ghost hrops-nav-button" aria-label="Go to workspace home" onClick={() => router.push('/portal')}>
              <Icon n="home" s={15} />Home
            </button>
            {isSuperAdmin && <button className="btn ghost hrops-nav-button" onClick={() => router.push('/super-admin')}>Super admin</button>}
          </div>
        </div>

        <header className="hrops-heading">
          <div className="hrops-heading-copy">
            <span className="hrops-eyebrow">GO KITE <span aria-hidden="true">/</span> EMPLOYEE SERVICES</span>
            <h1>Your HROps workspace</h1>
            <p>Choose a workflow to manage employee documents and payroll.</p>
          </div>
          <div className="hrops-heading-note">
            <span className="hrops-heading-note-icon"><Icon n="user" s={18} /></span>
            <span><strong>People, made simpler</strong><small>Everyday employee operations in one place</small></span>
          </div>
        </header>

        {error && <p className="err" role="alert">{error}</p>}

        <section className="hrops-tools-grid" aria-label="HROps tools">
          {tools.map((tool, index) => (
            <button
              key={tool.route}
              className={`card hrops-tool-card hrops-tool-card-${index + 1}`}
              onClick={() => router.push(tool.route)}
            >
              <span className="hrops-tool-card-top">
                <span className="hrops-tool-icon"><Icon n={tool.icon} s={22} /></span>
                <span className="hrops-tool-number">0{index + 1}</span>
              </span>
              <span className="hrops-tool-label">{tool.shortName}</span>
              <strong>{tool.title}</strong>
              <span className="hrops-tool-description">{tool.description}</span>
              <span className="hrops-tool-open">
                <span>Open workspace</span>
                <span className="hrops-tool-arrow" aria-hidden="true">→</span>
              </span>
            </button>
          ))}
        </section>
        <footer className="hrops-footer">
          <span>GO KITE TRAVEL &amp; TOURS</span>
          <span>Employee operations</span>
        </footer>
      </div>
    </div>
  );
}
