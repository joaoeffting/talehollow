"use client";

import { useRef, useState } from "react";
import { ImageUp, X } from "lucide-react";

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CoverInput({
  initialUrl,
  name = "cover",
  previewClassName = "h-20 w-14 shrink-0 rounded border object-cover",
}: {
  initialUrl?: string;
  name?: string;
  previewClassName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl || null);
  // Tracked separately from `preview` so we can tell "a file the user just
  // picked, not uploaded yet" (has a name/size to show) apart from "the
  // image already saved on the server" (only a URL, no local File object).
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function applyFile(file: File | undefined) {
    setPickedFile(file ?? null);
    // URL.createObjectURL builds a local, in-browser blob: URL for the
    // file — an instant preview with no network round trip, since the
    // file itself isn't uploaded until the surrounding form submits.
    setPreview(file ? URL.createObjectURL(file) : (initialUrl ?? null));
  }

  function clearSelection() {
    // Resetting a file input's value is the only way to actually clear its
    // selected file — React can't do it by re-rendering, since <input
    // type="file"> is uncontrolled.
    if (inputRef.current) inputRef.current.value = "";
    applyFile(undefined);
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && inputRef.current) {
          // A dropped file doesn't go through the <input>'s own change
          // event — it has to be assigned via DataTransfer so the same
          // input still carries it when the surrounding <form> submits.
          const dt = new DataTransfer();
          dt.items.add(file);
          inputRef.current.files = dt.files;
          applyFile(file);
        }
      }}
      className={`flex cursor-pointer items-center gap-4 rounded-lg border-2 border-dashed p-4 transition-colors ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*"
        className="sr-only"
        onChange={(e) => applyFile(e.target.files?.[0])}
      />

      {preview ? (
        <>
          {/* A plain <img>, not next/image — next/image would need the
              preview's blob: URL (client picks) and Supabase's storage
              domain (already-saved images) both configured as allowed
              sources; not worth the config for a preview thumbnail. */}
          <img src={preview} alt="Preview" className={previewClassName} />
          <div className="min-w-0 flex-1">
            {pickedFile ? (
              <>
                <p className="truncate text-sm font-medium">
                  {pickedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(pickedFile.size)} · Ready to upload
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Current image</p>
            )}
            <span className="text-sm font-medium text-primary underline underline-offset-4">
              {pickedFile ? "Choose a different image" : "Replace image"}
            </span>
          </div>
          {pickedFile && (
            <button
              type="button"
              onClick={(e) => {
                // Stop the click from bubbling up to the <label>, which
                // would otherwise reopen the file picker right after we
                // just cleared the selection.
                e.preventDefault();
                clearSelection();
              }}
              aria-label="Remove selected image"
              className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center gap-1 py-4 text-center">
          <ImageUp
            className="h-6 w-6 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="text-sm font-medium">Click to upload or drag and drop</p>
          <p className="text-xs text-muted-foreground">PNG or JPG</p>
        </div>
      )}
    </label>
  );
}
