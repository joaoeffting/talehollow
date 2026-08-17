import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/server";

// reports.target_id is a polymorphic reference (Phase 16 uses a check
// constraint on target_type instead of a real foreign key, since a report
// can point at three different tables) — so there's no join Supabase can
// follow automatically. Resolving these takes one extra lookup per target
// type, batched by id rather than one query per report row.
//
// supabase typed via the app's own createClient return type, not the bare
// SupabaseClient from @supabase/supabase-js — the untyped generic drops the
// Database generic entirely, which is what made a to-one profiles embed
// infer as an array below (TypeScript couldn't see the FK's uniqueness
// without it).
async function resolveTargetLinks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  reports: { target_type: string; target_id: string }[],
) {
  const links = new Map<string, string>();

  const bookIds = reports
    .filter((r) => r.target_type === "book")
    .map((r) => r.target_id);
  for (const id of bookIds) links.set(id, `/books/${id}`);

  const chapterIds = reports
    .filter((r) => r.target_type === "chapter")
    .map((r) => r.target_id);
  if (chapterIds.length > 0) {
    const { data: chapters } = await supabase
      .from("chapters")
      .select("id, book_id")
      .in("id", chapterIds);
    chapters?.forEach((c) =>
      links.set(c.id, `/books/${c.book_id}/chapters/${c.id}`),
    );
  }

  const scrapbookIds = reports
    .filter((r) => r.target_type === "scrapbook_entry")
    .map((r) => r.target_id);
  if (scrapbookIds.length > 0) {
    const { data: entries } = await supabase
      .from("scrapbook_entries")
      .select("id, profiles!scrapbook_entries_profile_id_fkey(username)")
      .in("id", scrapbookIds);
    entries?.forEach((e) => {
      if (e.profiles) links.set(e.id, `/u/${e.profiles.username}?tab=scrapbook`);
    });
  }

  return links;
}

export default async function AdminReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect(`/${locale}/login`);

  // An explicit is_admin check, not "did the query come back null" — a
  // select blocked entirely by RLS still resolves as an empty array with
  // no error, not null, so that signal never actually distinguished "you're
  // not an admin" from "there's genuinely nothing here yet." Same latent
  // gap already found and fixed on the admin feedback page: a non-admin
  // visiting this page saw "no reports" instead of being redirected — no
  // data leaked (RLS still hid every row's content), but the page wasn't
  // behaving as an actual gate.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", data.claims.sub)
    .single();
  if (!profile?.is_admin) redirect(`/${locale}`);

  const { data: reports } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });

  const targetLinks = await resolveTargetLinks(supabase, reports ?? []);

  return (
    <div className="space-y-4 py-12">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <ul className="divide-y rounded border">
        {(reports ?? []).map((report) => {
          const href = targetLinks.get(report.target_id);
          return (
            <li key={report.id} className="p-4 text-sm">
              <p>
                <strong>{report.target_type}</strong>{" "}
                {href ? (
                  <Link
                    href={href}
                    className="text-primary underline underline-offset-4 hover:text-accent"
                  >
                    View
                  </Link>
                ) : (
                  // Most likely the reported content was deleted since —
                  // nothing to link to, so fall back to the raw id.
                  <span className="text-muted-foreground">
                    ({report.target_id})
                  </span>
                )}
              </p>
              <p>{report.reason}</p>
              <p className="text-muted-foreground">
                {report.created_at
                  ? new Date(report.created_at).toLocaleString()
                  : null}
              </p>
            </li>
          );
        })}
        {(reports ?? []).length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">No reports.</li>
        )}
      </ul>
    </div>
  );
}
