"use client";

import { useEffect, useId, useRef, useState } from "react";
import { getPublicEnv } from "@/lib/env/public";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

/**
 * Cloudflare Turnstile widget. In non-production TURNSTILE_TEST_MODE paths,
 * the parent form may submit turnstile_token=TEST_PASS without a widget.
 */
export function TurnstileField({
  onToken,
  testMode = false,
}: {
  onToken: (token: string) => void;
  testMode?: boolean;
}) {
  const hostId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const siteKey = getPublicEnv().NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (testMode) {
      onToken("TEST_PASS");
      return;
    }
    if (!siteKey || !containerRef.current) return;

    let cancelled = false;

    function mount() {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey!,
        callback: (token) => {
          setError(null);
          onToken(token);
        },
        "error-callback": () => {
          setError("Security check failed to load. Please refresh and try again.");
          onToken("");
        },
        "expired-callback": () => onToken(""),
      });
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="challenges.cloudflare.com/turnstile"]',
    );
    if (window.turnstile) {
      mount();
    } else if (existing) {
      existing.addEventListener("load", mount);
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = mount;
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [onToken, siteKey, testMode]);

  if (testMode) {
    return (
      <p className="text-readable-sm text-[var(--color-text-muted)]">
        Security check is in local test mode.
      </p>
    );
  }

  if (!siteKey) {
    return (
      <p role="alert" className="text-readable-sm text-[var(--color-destructive)]">
        Registration security is not configured yet. Please try again later.
      </p>
    );
  }

  return (
    <div>
      <div id={hostId} ref={containerRef} />
      {error ? (
        <p role="alert" className="mt-2 text-readable-sm text-[var(--color-destructive)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
