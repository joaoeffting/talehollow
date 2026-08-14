import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ExportDataButton } from "@/components/export-data-button";
import { SaveWithLoading } from "@/components/save-with-loading";
import {
  updateSiteLanguage,
  updateContentLanguage,
  deleteAccount,
} from "./actions";

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect(`/${locale}/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("ui_language, content_language")
    .eq("id", data.claims.sub)
    .single();

  return (
    <div className="mx-auto max-w-md space-y-8 py-12">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <form
        action={updateSiteLanguage.bind(null, locale)}
        className="space-y-2"
      >
        <label className="block text-sm font-medium">Site language</label>
        <select
          name="ui_language"
          defaultValue={profile?.ui_language}
          className="w-full rounded border p-2"
        >
          <option value="en">English</option>
          {/* Disabled, not omitted — the structure is visibly there without
              being functional yet, since messages/pt.json doesn't exist. */}
          <option value="pt" disabled>
            Português (coming soon)
          </option>
        </select>
        <SaveWithLoading label="Save" />
      </form>

      <form
        action={updateContentLanguage.bind(null, locale)}
        className="space-y-2"
      >
        <label className="block text-sm font-medium">Story language</label>
        <p className="text-xs text-muted-foreground">
          Which language of stories should we show you? This is separate from
          the site&apos;s own language above.
        </p>
        <select
          name="content_language"
          defaultValue={profile?.content_language}
          className="w-full rounded border p-2"
        >
          <option value="en">English</option>
          <option value="pt">Português</option>
        </select>
        <SaveWithLoading label="Save" />
      </form>

      <div className="space-y-2 rounded border p-4">
        <h2 className="font-medium">Your data</h2>
        <p className="text-sm text-muted-foreground">
          Download a copy of your data — your profile, books and chapters,
          comments, likes, views, follows, notifications, reports
          you&apos;ve filed, scrapbook posts, and saved books — as a JSON
          file.
        </p>
        <ExportDataButton />
      </div>

      <div className="space-y-2 rounded border border-destructive p-4">
        <h2 className="font-medium text-destructive">Danger zone</h2>
        <p className="text-sm text-muted-foreground">
          Permanently delete your account — your profile, published books and
          chapters, comments, likes, follows, and everything else tied to it.
          This can&apos;t be undone.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <form action={deleteAccount.bind(null, locale)}>
          <ConfirmSubmitButton
            confirmMessage="Delete your account and everything you've posted? This can't be undone."
            pendingLabel="Deleting…"
            className="rounded border border-destructive px-3 py-1 text-sm text-destructive"
          >
            Delete account
          </ConfirmSubmitButton>
        </form>
      </div>
    </div>
  );
}
