import { notFound } from "next/navigation";
import { publicPageMetadata } from "@/lib/seo/public-metadata";
import { resolvePublicEventSlug } from "@/lib/events/public-event";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const event = resolvePublicEventSlug(slug);
  if (!event) notFound();
  return publicPageMetadata({
    title: event.title,
    description: event.description,
    path: `/events/${event.slug}`,
  });
}

export default async function EventSlugPage({ params }: Props) {
  const { slug } = await params;
  if (!resolvePublicEventSlug(slug)) notFound();
  notFound();
}
