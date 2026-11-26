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
      <div className="shell-panel workspace-panel">
        <div className="bar">
          <div className="brand" style={{ margin: 0, gap: 14 }}>
            <Logo h={44} />
            <span className="hrops-brand-title">HROps</span>
          </div>
          <div className="me">
            <button className="btn ghost" onClick={() => router.push('/portal')}>Workspace</button>
            {isSuperAdmin && <button className="btn ghost" onClick={() => router.push('/super-admin')}>Super admin</button>}
          </div>
        </div>

        <header className="hrops-heading">
          <div>
            <h1>HROps</h1>
            <p className="sm mut">Choose an employee operations tool.</p>
          </div>
        </header>

        {error && <p className="err" role="alert">{error}</p>}

        <section className="hrops-tools-grid" aria-label="HROps tools">
          {tools.map((tool) => (
            <button key={tool.route} className="card hrops-tool-card" onClick={() => router.push(tool.route)}>
              <span className="hrops-tool-icon"><Icon n={tool.icon} s={23} /></span>
              <span className="hrops-tool-label">{tool.shortName}</span>
              <strong>{tool.title}</strong>
              <span className="sm mut">{tool.description}</span>
              <span className="hrops-tool-open">Open tool →</span>
            </button>
          ))}
        </section>
      </div>
    </div>
  );
}
