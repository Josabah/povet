"use client";

import { useRouter } from "next/navigation";

type Props = {
  className?: string;
};

export function BackLink({ className }: Props) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (
          typeof window !== "undefined" &&
          window.history.length > 1 &&
          document.referrer.startsWith(window.location.origin)
        ) {
          router.back();
        } else {
          router.push("/");
        }
      }}
      aria-label="Go back"
      className={className}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  );
}
