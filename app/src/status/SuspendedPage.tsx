export function SuspendedPage({ reason }: { reason: 'leech' | 'flag' }) {
  return <div data-reason={reason} />;
}
