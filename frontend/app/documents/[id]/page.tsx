import DocumentDetailClient from './DocumentDetailClient';

export function generateStaticParams() {
  return [{ id: '_' }];
}

export default function Page() {
  return <DocumentDetailClient />;
}
