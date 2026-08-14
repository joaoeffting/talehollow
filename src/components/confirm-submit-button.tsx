"use client";

import { useFormStatus } from "react-dom";

export function ConfirmSubmitButton({
  confirmMessage,
  className,
  ariaLabel,
  pendingLabel,
  children,
}: {
  confirmMessage: string;
  className?: string;
  ariaLabel?: string;
  // Swapped in for `children` while the action is running — optional
  // since several call sites are icon-only and the disabled/dimmed style
  // below is feedback enough on its own.
  pendingLabel?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={ariaLabel}
      // Appended rather than replacing the caller's className, so every
      // usage gets the disabled/dimmed state for free without having to
      // remember to add it themselves.
      className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-50`}
      // A <form action={serverAction}> submits the instant this button is
      // clicked. This is the one bit of client-side JS needed to interrupt
      // that with a confirmation prompt first — calling preventDefault()
      // inside onClick stops the submit if the author backs out. A
      // disabled button never fires onClick at all, which is what stops a
      // second click from re-prompting mid-submission.
      onClick={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
