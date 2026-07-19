"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

export function SaveWithLoading({
  label = "Save chapter",
}: {
  label?: string;
}) {
  // useFormStatus only sees the nearest ancestor <form> — that's why this
  // has to be its own component rendered *inside* the form, rather than a
  // prop/hook call from page.tsx (which is a Server Component and can't use
  // hooks at all).
  const { pending } = useFormStatus();
  const [justSaved, setJustSaved] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    // Fires on the pending: true → false edge, i.e. exactly when a
    // submission just finished.
    if (wasPending.current && !pending) {
      setJustSaved(true);
      const timeout = setTimeout(() => setJustSaved(false), 1500);
      return () => clearTimeout(timeout);
    }
    wasPending.current = pending;
  }, [pending]);

  return (
    <button
      disabled={pending}
      className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-70"
    >
      {pending ? "Saving…" : justSaved ? "Saved" : label}
    </button>
  );
}
