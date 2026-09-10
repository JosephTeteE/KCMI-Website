import type { WebsiteDocumentKey } from "@/content/website/keys";
import {
  aboutDocumentSchema,
  faqsDocumentSchema,
  globalDocumentSchema,
  homeDocumentSchema,
  sermonsPageDocumentSchema,
  servicesDocumentSchema,
  type AboutDocument,
  type FaqsDocument,
  type GlobalDocument,
  type HomeDocument,
  type SermonsPageDocument,
  type ServicesDocument,
} from "@/content/website/schemas";
import {
  defaultAboutDocument,
  defaultFaqsDocument,
  defaultGlobalDocument,
  defaultHomeDocument,
  defaultSermonsPageDocument,
  defaultServicesDocument,
} from "@/content/website/defaults";

function mergeParsed<T extends Record<string, unknown>>(
  defaults: T,
  parsed: Partial<T> | undefined,
): T {
  return { ...defaults, ...(parsed ?? {}) };
}

export function resolveHomeDocument(input: unknown): HomeDocument {
  const parsed = homeDocumentSchema.partial().safeParse(input);
  return mergeParsed(
    defaultHomeDocument,
    parsed.success ? parsed.data : undefined,
  );
}

export function resolveAboutDocument(input: unknown): AboutDocument {
  const parsed = aboutDocumentSchema.partial().safeParse(input);
  return mergeParsed(
    defaultAboutDocument,
    parsed.success ? parsed.data : undefined,
  );
}

export function resolveServicesDocument(input: unknown): ServicesDocument {
  const parsed = servicesDocumentSchema.partial().safeParse(input);
  return mergeParsed(
    defaultServicesDocument,
    parsed.success ? parsed.data : undefined,
  );
}

export function resolveGlobalDocument(input: unknown): GlobalDocument {
  const parsed = globalDocumentSchema.partial().safeParse(input);
  const merged = mergeParsed(
    defaultGlobalDocument,
    parsed.success ? parsed.data : undefined,
  );
  return merged;
}

export function resolveFaqsDocument(input: unknown): FaqsDocument {
  const parsed = faqsDocumentSchema.partial().safeParse(input);
  if (parsed.success && parsed.data.items && parsed.data.items.length > 0) {
    return { items: parsed.data.items };
  }
  return defaultFaqsDocument;
}

export function resolveSermonsPageDocument(input: unknown): SermonsPageDocument {
  const parsed = sermonsPageDocumentSchema.partial().safeParse(input);
  return mergeParsed(
    defaultSermonsPageDocument,
    parsed.success ? parsed.data : undefined,
  );
}

export function parseWebsiteDocumentSave(
  key: WebsiteDocumentKey,
  input: unknown,
):
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; error: string } {
  const schema =
    key === "home"
      ? homeDocumentSchema
      : key === "about"
        ? aboutDocumentSchema
        : key === "services"
          ? servicesDocumentSchema
          : key === "global"
            ? globalDocumentSchema
            : key === "faqs"
              ? faqsDocumentSchema
              : sermonsPageDocumentSchema;
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        "Please fill in the new wording before making this live. Leave a box empty only if you want to keep the current website text.",
    };
  }
  return { ok: true, payload: parsed.data as Record<string, unknown> };
}
