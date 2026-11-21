import { Suspense } from 'react';
import { headers } from 'next/headers';
import { LoadingState } from '@/components/ui';
import Feedback from './Feedback';

export async function generateMetadata() {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get('x-forwarded-host');
  const host = (forwardedHost || requestHeaders.get('host'))?.split(',')[0].trim();
  if (!host) throw new Error('Could not determine the site host for feedback link metadata.');

  const forwardedProtocol = requestHeaders.get('x-forwarded-proto')?.split(',')[0].trim();
  const protocol = forwardedProtocol === 'http' || forwardedProtocol === 'https'
    ? forwardedProtocol
    : host.startsWith('localhost') ? 'http' : 'https';
  const metadataBase = new URL(`${protocol}://${host}`);
  const title = 'Interview Feedback | Go Kite Travel & Tours';
  const description = 'Share your interview feedback with the Go Kite recruitment team.';
  const image = {
    url: '/logo.png',
    width: 512,
    height: 512,
    alt: 'Go Kite Travel & Tours',
  };

  return {
    metadataBase,
    title,
    description,
    openGraph: {
      type: 'website',
      title,
      description,
      siteName: 'Go Kite Travel & Tours',
      images: [image],
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: [image.url],
    },
  };
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
