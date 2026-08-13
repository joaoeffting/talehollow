"use client";

import { useState } from "react";
import { exportMyData } from "@/app/[locale]/settings/actions";

// Server Actions return data to the caller rather than an HTTP response, so
// there's no Content-Disposition header to trigger a "real" download —
// this builds the file client-side instead: stringify what the action
// returns, wrap it in a Blob, and click a throwaway <a download> to hand it
// to the browser's normal save flow.
export function ExportDataButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function handleClick() {
    setStatus("loading");
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `talehollow-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handleClick}
        disabled={status === "loading"}
        className="rounded border px-3 py-1 text-sm disabled:opacity-50"
      >
        {status === "loading" ? "Preparing…" : "Download my data"}
      </button>
      {status === "error" && (
        <p className="text-sm text-destructive">
          Couldn&apos;t prepare your data — please try again.
        </p>
      )}
    </div>
  );
}
