import { createShareMetadata } from '@/lib/share-metadata';

export async function generateMetadata() {
  return createShareMetadata({
    title: 'Go Kite Workspace',
    description: 'Access Go Kite workspace tools for interview feedback and employee offboarding.',
  });
}

export default function PortalLayout({ children }) {
  return children;
}
