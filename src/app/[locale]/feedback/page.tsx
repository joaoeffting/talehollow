import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { SaveWithLoading } from "@/components/save-with-loading";
import { submitFeedback } from "./actions";

export default async function FeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { locale } = await params;
  const { sent, error } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect(`/${locale}/login`);

  const submitWithLocale = submitFeedback.bind(null, locale);

  return (
    <div className="mx-auto max-w-sm space-y-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold">Got an idea?</h1>
        <p className="mt-1 text-muted-foreground">
          Bug, suggestion, or just something that bugged you — tell me
          directly. I read every one of these myself.
        </p>
      </div>

      {sent ? (
        <p className="rounded border border-primary/30 bg-primary/5 p-3 text-sm">
          Thanks — that&apos;s in my inbox now.
        </p>
      ) : (
        <form action={submitWithLocale} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <textarea
            name="content"
            required
            rows={6}
            placeholder="What's on your mind?"
            className="w-full rounded border p-2"
          />
          <SaveWithLoading label="Send feedback" />
        </form>
      )}
    </div>
  );
}
