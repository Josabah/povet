"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

/**
 * Fully opaque immersive shell on paper-white. The reader sits flush
 * against the same background as `/explore` so the hero/wall pair reads
 * as one continuous surface. Close, body scroll lock, and keyboard
 * handling live in ExploreReader so they stay tied to its lifecycle.
 */
export function ExploreModalShell({ children }: Props) {
  return (
    <div
      className="fixed inset-0 z-[90] bg-paper"
      role="dialog"
      aria-modal="true"
      aria-label="Photograph reader"
    >
      {children}
    </div>
  );
}
