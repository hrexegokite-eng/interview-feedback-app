import { Suspense } from 'react';
import Feedback from './Feedback';

async function Inner({ params }) {
  const { token } = await params;
  return <Feedback token={token} />;
}

export default function Page({ params }) {
  return (
    <Suspense fallback={<div className="narrow"><p className="mut center">Loading…</p></div>}>
      <Inner params={params} />
    </Suspense>
  );
}
