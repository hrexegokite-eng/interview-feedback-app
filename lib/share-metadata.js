import { headers } from 'next/headers';

export async function createShareMetadata({ title, description }) {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get('x-forwarded-host');
  const host = (forwardedHost || requestHeaders.get('host'))?.split(',')[0].trim();
  if (!host) throw new Error('Could not determine the site host for link preview metadata.');

  const forwardedProtocol = requestHeaders.get('x-forwarded-proto')?.split(',')[0].trim();
  const protocol = forwardedProtocol === 'http' || forwardedProtocol === 'https'
    ? forwardedProtocol
    : host.startsWith('localhost') ? 'http' : 'https';
  const image = {
    url: '/kite-icon-v3.png',
    width: 512,
    height: 512,
    alt: 'Go Kite kite icon',
  };

  return {
    metadataBase: new URL(`${protocol}://${host}`),
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
