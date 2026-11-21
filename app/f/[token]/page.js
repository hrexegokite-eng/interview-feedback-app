import { Suspense } from 'react';
import { LoadingState } from '@/components/ui';
import { createShareMetadata } from '@/lib/share-metadata';
import Feedback from './Feedback';

export async function generateMetadata() {
  return createShareMetadata({
    title: 'Interview Feedback | Go Kite Travel & Tours',
    description: 'Share your interview feedback with the Go Kite recruitment team.',
  });
}

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
