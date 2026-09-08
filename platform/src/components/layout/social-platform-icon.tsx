type SocialIconProps = {
  className?: string;
};

function iconClass(className?: string) {
  return className ?? "site-footer-social-icon";
}

export function YouTubeIcon({ className }: SocialIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={iconClass(className)}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.8 15.5v-7l6.2 3.5-6.2 3.5z"
      />
    </svg>
  );
}

export function FacebookIcon({ className }: SocialIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={iconClass(className)}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M14.5 22v-8.2h2.8l.4-3.2h-3.2V8.6c0-.9.2-1.6 1.6-1.6h1.7V4.1c-.3 0-1.5-.1-2.8-.1-2.8 0-4.7 1.7-4.7 4.8v2.8H7.5v3.2h2.8V22h4.2z"
      />
    </svg>
  );
}

export function InstagramIcon({ className }: SocialIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={iconClass(className)}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H7zm11.2 1.3a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2zM12 8.2A3.8 3.8 0 1 1 12 15.8 3.8 3.8 0 0 1 12 8.2zm0 2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z"
      />
    </svg>
  );
}

export function XIcon({ className }: SocialIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={iconClass(className)}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M17.6 3h3.1l-6.8 7.7L22 21h-6.2l-4.8-6.3L5.5 21H2.4l7.2-8.3L2 3h6.4l4.4 5.8L17.6 3zm-1.1 16.2h1.7L7.6 4.7H5.8l10.7 14.5z"
      />
    </svg>
  );
}

export function TikTokIcon({ className }: SocialIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={iconClass(className)}
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M14.5 3h2.2c.3 2 1.5 3.6 3.5 4.2v2.3c-1.3 0-2.5-.4-3.5-1.1v6.4c0 3.4-2.8 6.2-6.3 6.2S4 18.2 4 14.8s2.8-6.2 6.3-6.2c.3 0 .7 0 1 .1v2.5c-.3-.1-.6-.2-1-.2-2 0-3.7 1.7-3.7 3.8s1.6 3.8 3.7 3.8 3.7-1.7 3.7-3.8V3z"
      />
    </svg>
  );
}

export function SocialPlatformIcon({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const key = label.toLowerCase();
  if (key.includes("youtube")) return <YouTubeIcon className={className} />;
  if (key.includes("facebook")) return <FacebookIcon className={className} />;
  if (key.includes("instagram")) return <InstagramIcon className={className} />;
  if (key.includes("tiktok")) return <TikTokIcon className={className} />;
  if (key === "x" || key.includes("twitter") || key.startsWith("x ")) {
    return <XIcon className={className} />;
  }
  return null;
}
