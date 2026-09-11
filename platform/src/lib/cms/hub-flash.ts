import { redirect } from "next/navigation";

/** Redirect with a success flash message in the query string. */
export function redirectWithMessage(path: string, message: string): never {
  const url = new URL(path, "http://local.invalid");
  url.searchParams.set("message", message);
  redirect(`${url.pathname}${url.search}`);
}

/** Redirect with an error flash message in the query string. */
export function redirectWithError(path: string, error: string): never {
  const url = new URL(path, "http://local.invalid");
  url.searchParams.set("error", error);
  redirect(`${url.pathname}${url.search}`);
}

/** Redirect carrying extra Hub state (for example a staged photo) plus a flash message. */
export function redirectWithParams(
  path: string,
  params: Record<string, string>,
): never {
  const url = new URL(path, "http://local.invalid");
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }
  redirect(`${url.pathname}${url.search}`);
}
