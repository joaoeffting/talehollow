import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/server";
import { logout } from "../login/actions";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  // getClaims() (not getSession()) round-trips to Supabase's auth server to
  // verify the token is genuinely valid — session data read straight off
  // the cookie hasn't been independently re-checked, so it's the wrong
  // thing to gate access on.
  const { data, error } = await supabase.auth.getClaims();

  // A Server Component always has its own route params, so — unlike a
  // Server Action — it can template the locale straight into redirect()
  // without needing anything bound in.
  if (error || !data?.claims) redirect(`/${locale}/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.claims.sub) // `sub` is the standard JWT claim holding the user id
    .single();

  return (
    <div className="space-y-4 py-12">
      <h1 className="text-2xl font-semibold">
        Welcome, {profile?.display_name}
      </h1>
      <p className="text-muted-foreground">{data.claims.email}</p>
      <Link
        href={`/u/${profile?.username}`}
        className="text-sm text-primary underline underline-offset-4 hover:text-accent"
      >
        View public profile
      </Link>
      <form action={logout.bind(null, locale)}>
        <button className="rounded border px-4 py-2">Log out</button>
      </form>
    </div>
  );
}
