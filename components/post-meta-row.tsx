import type { ReactNode } from "react";

type Props = {
  left: ReactNode;
  right?: ReactNode;
  className?: string;
};

/**
 * Balanced photographer / location row — both sides share space and truncate equally.
 */
export function PostMetaRow({ left, right, className = "" }: Props) {
  return (
    <div
      className={`flex min-w-0 items-baseline justify-between gap-3 text-slate-500 ${className}`}
    >
      <div className="min-w-0 flex-1 basis-0 overflow-hidden">{left}</div>
      {right ? (
        <div className="min-w-0 flex-1 basis-0 overflow-hidden text-right">
          {right}
        </div>
      ) : null}
    </div>
  );
}
