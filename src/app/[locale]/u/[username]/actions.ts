"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

// Same shape as uploadBookCover/deleteBookCoverFiles (dashboard/books/actions.ts) —
// keyed by user_id instead of book_id, so "delete whatever's in this user's
// avatar folder, then upload the new file" is the same "replace" strategy.
async function uploadAvatar(
  supabase: SupabaseClient,
  userId: string,
  avatar: File,
) {
  const ext = avatar.name.split(".").pop();
  const path = `${userId}/avatar.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, avatar);
  if (error) throw error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

async function deleteAvatarFiles(supabase: SupabaseClient, userId: string) {
  const { data: existing } = await supabase.storage
    .from("avatars")
    .list(userId);
  if (existing && existing.length > 0) {
    await supabase.storage
      .from("avatars")
      .remove(existing.map((file) => `${userId}/${file.name}`));
  }
}

export async function updateProfile(
  username: string,
  locale: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return;
  const userId = data.claims.sub;

  // Only touch avatar_url if a new file was actually submitted — the
  // CoverInput preview always renders, so a save with no new picked file
  // still posts the field, just empty.
  const avatar = formData.get("avatar") as File | null;
  const avatarUpdate: { avatar_url?: string } = {};
  if (avatar && avatar.size > 0) {
    await deleteAvatarFiles(supabase, userId);
    avatarUpdate.avatar_url = await uploadAvatar(supabase, userId, avatar);
  }

  // No target id passed in from the client at all — we always update
  // "whoever is currently signed in," which is also all the RLS policy
  // from Phase 2 permits, so there's no way to smuggle in someone else's id.
  await supabase
    .from("profiles")
    .update({
      display_name: formData.get("display_name") as string,
      bio: formData.get("bio") as string,
      ...avatarUpdate,
    })
    .eq("id", userId);

  revalidatePath(`/${locale}/u/${username}`);
}

export async function postScrapbookEntry(
  profileId: string,
  username: string,
  locale: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return;

  await supabase.from("scrapbook_entries").insert({
    profile_id: profileId, // whose wall this post lands on
    author_id: data.claims.sub, // who's actually posting it
    content: formData.get("content") as string,
  });

  revalidatePath(`/${locale}/u/${username}`);
}

export async function deleteScrapbookEntry(
  entryId: string,
  username: string,
  locale: string,
) {
  const supabase = await createClient();
  // No ownership check written here in app code — the RLS delete policy
  // is what actually decides whether this succeeds, for either of the
  // two allowed roles (poster or wall owner).
  await supabase.from("scrapbook_entries").delete().eq("id", entryId);
  revalidatePath(`/${locale}/u/${username}`);
}
