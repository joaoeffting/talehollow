"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CoverInput } from "@/components/cover-input";
import { SaveWithLoading } from "@/components/save-with-loading";

export function EditableProfileHeader({
  profile,
  isOwner,
  onSave,
}: {
  profile: {
    username: string;
    display_name: string | null;
    bio: string | null;
    avatar_url: string | null;
  };
  isOwner: boolean;
  onSave: (formData: FormData) => void;
}) {
  // This state has to live in a Client Component — a Server Component has
  // no concept of "currently mid-edit," it only ever renders once per request.
  const [editing, setEditing] = useState(false);

  const initials = (profile.display_name ?? profile.username ?? "?")
    .slice(0, 2)
    .toUpperCase();

  if (!editing) {
    return (
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage
            src={profile.avatar_url ?? undefined}
            alt={profile.display_name ?? profile.username}
          />
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-semibold">
            {profile.display_name ?? profile.username}
          </h1>
          <p className="text-muted-foreground">@{profile.username}</p>
          {profile.bio && <p>{profile.bio}</p>}
          {isOwner && (
            <button
              onClick={() => setEditing(true)}
              className="text-sm underline"
            >
              Edit profile
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      action={(formData) => {
        // Call the Server Action, then flip back out of edit mode — the
        // revalidatePath inside onSave means the next render already has
        // the updated data by the time this component re-renders.
        onSave(formData);
        setEditing(false);
      }}
      className="space-y-3"
    >
      <CoverInput
        initialUrl={profile.avatar_url ?? undefined}
        name="avatar"
        previewClassName="h-16 w-16 rounded-full object-cover"
      />
      <input
        name="display_name"
        defaultValue={profile.display_name ?? ""}
        className="w-full rounded border p-2"
      />
      <textarea
        name="bio"
        defaultValue={profile.bio ?? ""}
        className="w-full rounded border p-2"
      />
      <div className="flex gap-2">
        <SaveWithLoading label="Save profile" />
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded border px-3 py-1 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
