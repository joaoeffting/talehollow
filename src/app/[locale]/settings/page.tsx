import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { updateSiteLanguage, updateContentLanguage } from "./actions";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
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
        <button className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground">
          Save
        </button>
      </form>

      <form
        action={updateContentLanguage.bind(null, locale)}
        className="space-y-2"
      >
        <label className="block text-sm font-medium">Story language</label>
        <p className="text-xs text-muted-foreground">
          Which language of stories should we show you? This is separate from
          the site's own language above.
        </p>
        <select
          name="content_language"
          defaultValue={profile?.content_language}
          className="w-full rounded border p-2"
        >
          <option value="en">English</option>
          <option value="pt">Português</option>
        </select>
        <button className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground">
          Save
        </button>
      </form>
    </div>
  );
}
