"use client";

import { useState } from "react";

export function CoverInput({ initialUrl }: { initialUrl?: string }) {
  const [preview, setPreview] = useState<string | null>(initialUrl || null);

  return (
    <div className="space-y-2">
      {preview && (
        // A plain <img>, not next/image — next/image would need the
        // preview's blob: URL (client picks) and Supabase's storage domain
        // (already-saved covers) both configured as allowed sources; not
        // worth the config for a v1 cover preview.
        <img
          src={preview}
          alt="Cover preview"
          className="h-40 w-28 rounded border object-cover"
        />
      )}
      <input
        type="file"
        name="cover"
        accept="image/*"
        className="w-full rounded border p-2 text-sm"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // URL.createObjectURL builds a local, in-browser blob: URL for the
          // file — an instant preview with no network round trip, since the
          // file itself isn't uploaded until the surrounding form submits.
          // Falls back to whatever was already there (or nothing) if the
          // author opens the file picker and cancels out of it.
          setPreview(file ? URL.createObjectURL(file) : (initialUrl ?? null));
        }}
      />
    </div>
  );
}
