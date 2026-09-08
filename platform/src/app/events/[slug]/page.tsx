type Props = { params: Promise<{ slug: string }> };

export default async function EventSlugPage({ params }: Props) {
  await params;
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-[var(--color-text-body)]">
        Event
      </h1>
      <p className="mt-2 text-[var(--color-text-muted)]">
        Details for this gathering will appear here when they are published.
      </p>
    </div>
  );
}
