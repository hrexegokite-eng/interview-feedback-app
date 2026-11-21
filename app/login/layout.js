import { createShareMetadata } from '@/lib/share-metadata';

export async function generateMetadata() {
  return createShareMetadata({
    title: 'Sign in | Go Kite Interview Feedback',
    description: 'Securely sign in to the Go Kite interview feedback workspace.',
  });
}

export default function LoginLayout({ children }) {
  return children;
}
