import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { SaveWithLoading } from "@/components/save-with-loading";
import { toggleFeedbackReviewed } from "./actions";

export default async function AdminFeedbackPage({
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
  // no error, not null, so that signal (copied from the reports page,
  // which has the same latent gap) never actually distinguishes "you're
  // not an admin" from "there's genuinely nothing here yet." Confirmed
  // live: a non-admin visiting this page saw "No feedback yet." instead of
  // being redirected — no data leaked (RLS still hid every row's content),
  // but the page wasn't behaving as an actual gate.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", data.claims.sub)
    .single();
  if (!profile?.is_admin) redirect(`/${locale}`);

  const { data: feedback } = await supabase
    .from("feedback")
    .select("id, content, created_at, reviewed_at, profiles(username, display_name)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4 py-12">
      <h1 className="text-2xl font-semibold">Feedback</h1>
      <ul className="divide-y rounded border">
        {(feedback ?? []).map((entry) => {
          const isReviewed = !!entry.reviewed_at;
          const toggleWithIds = toggleFeedbackReviewed.bind(
            null,
            entry.id,
            locale,
            isReviewed,
          );
          return (
            <li key={entry.id} className="space-y-2 p-4 text-sm">
              <div className="flex items-start justify-between gap-4">
                <p className="text-muted-foreground">
                  {entry.profiles?.display_name ?? entry.profiles?.username ?? "Unknown"}
                  {" · "}
                  {entry.created_at
                    ? new Date(entry.created_at).toLocaleString()
                    : null}
                </p>
                <span
                  className={
                    isReviewed
                      ? "shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      : "shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
                  }
                >
                  {isReviewed ? "Reviewed" : "New"}
                </span>
              </div>
              <p className="whitespace-pre-wrap">{entry.content}</p>
              <form action={toggleWithIds}>
                <SaveWithLoading
                  label={isReviewed ? "Mark as new" : "Mark reviewed"}
                  pendingLabel="…"
                  savedLabel={null}
                  className="text-xs text-primary underline underline-offset-4 disabled:opacity-60"
                />
              </form>
            </li>
          );
        })}
        {(feedback ?? []).length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">No feedback yet.</li>
        )}
      </ul>
    </div>
  );
}
