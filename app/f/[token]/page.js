import { Suspense } from 'react';
import { LoadingState } from '@/components/ui';
import Feedback from './Feedback';

async function Inner({ params }) {
  const { token } = await params;
  return <Feedback token={token} />;
}

export default function Page({ params }) {
  return (
    <Suspense fallback={<LoadingState label="Opening interview feedback" />}>
      <Inner params={params} />
    </Suspense>
  );
}
