import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffSession, staffHasPermission } from "@/lib/auth/session";
import { HubPageHeader } from "@/components/hub/hub-page-header";
import { HubFlash } from "@/components/hub/hub-flash";
import {
  HubSelectField,
  HubStatusBadge,
  HubSubmitButton,
  HubTextAreaField,
  HubTextField,
} from "@/components/hub/hub-form-fields";
import {
  setProgramStatus,
  updateProgram,
} from "@/app/admin/programs/actions";

type SearchParams = Promise<{ message?: string; error?: string }>;
type Params = Promise<{ id: string }>;

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EditProgramPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const flash = await searchParams;
  const session = await getStaffSession();
  const canPublish =
    !!session && staffHasPermission(session.profile, "programs.publish");

  const supabase = await createClient();
  const { data: program } = await supabase
    .from("programs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!program) notFound();

  const { data: media } = await supabase
    .from("media_assets")
    .select("id, alt_text, original_filename")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return (
    <div>
      <HubPageHeader
        title={program.title}
        description="Edit details, then use the actions below to change status."
        backHref="/admin/programs"
        backLabel="All programs"
        actions={<HubStatusBadge status={program.status} />}
      />
      <HubFlash message={flash.message} error={flash.error} />

      <p className="mb-6">
        <Link
          href={`/admin/programs/${program.id}/preview`}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-action-primary)] underline-offset-2 hover:underline"
        >
          Open Hub preview
        </Link>
      </p>

      <form action={updateProgram} className="max-w-2xl space-y-6">
        <input type="hidden" name="id" value={program.id} />
        <HubTextField
          id="title"
          label="Title"
          required
          defaultValue={program.title}
        />
        <HubTextAreaField
          id="short_description"
          label="Short description"
          rows={3}
          defaultValue={program.short_description}
        />
        <HubTextAreaField
          id="body_text"
          label="Full details"
          rows={6}
          defaultValue={program.body_text}
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <HubTextField
            id="starts_at"
            label="Starts"
            type="datetime-local"
            defaultValue={toDatetimeLocal(program.starts_at)}
          />
          <HubTextField
            id="ends_at"
            label="Ends"
            type="datetime-local"
            defaultValue={toDatetimeLocal(program.ends_at)}
          />
        </div>
        <HubTextField
          id="cta_label"
          label="Button label"
          defaultValue={program.cta_label ?? ""}
        />
        <HubTextField
          id="cta_url"
          label="Button link"
          defaultValue={program.cta_url ?? ""}
          hint="Use https://… or a site path like /events"
        />
        <HubSelectField
          id="placement"
          label="Home page placement"
          defaultValue={program.placement}
        >
          <option value="none">None</option>
          <option value="featured">Featured</option>
          <option value="banner">Banner</option>
          <option value="card">Card</option>
        </HubSelectField>
        <HubSelectField
          id="featured_media_id"
          label="Featured image (optional)"
          defaultValue={program.featured_media_id ?? ""}
        >
          <option value="">No image</option>
          {(media ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.alt_text || item.original_filename || item.id.slice(0, 8)}
            </option>
          ))}
        </HubSelectField>
        <HubSubmitButton>Save</HubSubmitButton>
      </form>

      <div className="mt-10 max-w-2xl space-y-3 border-t border-[var(--color-border)] pt-8">
        <h2 className="text-lg font-semibold">Status actions</h2>
        <div className="flex flex-wrap gap-3">
          <form action={setProgramStatus}>
            <input type="hidden" name="id" value={program.id} />
            <input type="hidden" name="status" value="draft" />
            <HubSubmitButton variant="quiet">Save as draft</HubSubmitButton>
          </form>
          <form action={setProgramStatus}>
            <input type="hidden" name="id" value={program.id} />
            <input type="hidden" name="status" value="preview" />
            <HubSubmitButton variant="quiet">
              Mark ready for preview
            </HubSubmitButton>
          </form>
          {canPublish ? (
            <form action={setProgramStatus}>
              <input type="hidden" name="id" value={program.id} />
              <input type="hidden" name="status" value="published" />
              <HubSubmitButton variant="secondary">Publish</HubSubmitButton>
            </form>
          ) : null}
          {canPublish && program.status !== "archived" ? (
            <form action={setProgramStatus}>
              <input type="hidden" name="id" value={program.id} />
              <input type="hidden" name="status" value="archived" />
              <HubSubmitButton variant="danger">Archive</HubSubmitButton>
            </form>
          ) : null}
          {canPublish && program.status === "archived" ? (
            <form action={setProgramStatus}>
              <input type="hidden" name="id" value={program.id} />
              <input type="hidden" name="status" value="draft" />
              <HubSubmitButton variant="quiet">Restore to draft</HubSubmitButton>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
