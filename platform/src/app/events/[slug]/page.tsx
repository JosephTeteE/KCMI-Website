import { notFound } from "next/navigation";
import { EventDetail } from "@/components/events/event-detail";
import { fetchPublishedEventBySlug } from "@/lib/events/public-event";
import { publicPageMetadata } from "@/lib/seo/public-metadata";

type Props = { params: Promise<{ slug: string }> };

/** Cache each event page on first visit. Publish calls revalidatePath. */
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const event = await fetchPublishedEventBySlug(slug);
  // Unpublished / unknown: generic title only — never leak draft content.
  if (!event) {
    return { title: "Event" };
  }
  return publicPageMetadata({
    title: event.title,
    description:
      event.summary ||
      `${event.title} — Kingdom Covenant Ministries International.`,
    path: `/events/${event.slug}`,
  });
}

export default async function EventSlugPage({ params }: Props) {
  const { slug } = await params;
  const event = await fetchPublishedEventBySlug(slug);
  if (!event) notFound();
  return <EventDetail event={event} />;
}
