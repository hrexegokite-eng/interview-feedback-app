import ExitForm from './ExitForm';

export default async function ExitFormPage({ params }) {
  const { token } = await params;
  return <ExitForm token={token} />;
}
