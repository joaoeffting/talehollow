import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { SaveWithLoading } from "@/components/save-with-loading";
import { updatePassword } from "./actions";

export default async function ResetPasswordPage({
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

  // Only reachable with the recovery session /auth/confirm's verifyOtp
  // established — landing here any other way (bookmarked, expired link)
  // means starting the request over.
  if (!data?.claims) redirect(`/${locale}/forgot-password`);

  const updateWithLocale = updatePassword.bind(null, locale);

  return (
    <div className="mx-auto max-w-sm space-y-6 py-12">
      <h1 className="text-2xl font-semibold">Set a new password</h1>
      <form action={updateWithLocale} className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <input
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="New password"
          className="w-full rounded border p-2"
        />
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={6}
          placeholder="Confirm new password"
          className="w-full rounded border p-2"
        />
        <SaveWithLoading
          label="Save new password"
          pendingLabel="Saving…"
          className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-70"
        />
      </form>
    </div>
  );
}
