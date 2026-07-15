import { Link } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NavMenu } from "./nav-menu";

// A small async Server Component just for this check, so the rest of the
// layout doesn't need to become async or re-check auth itself. It takes
// `locale` as a prop (not a route param — this isn't a page) because the
// hamburger menu below needs it to call the `logout` Server Action.
export async function NavAuthLinks({ locale }: { locale: string }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    return (
      <Link href="/login" className="text-sm">
        Log in
      </Link>
    );
  }

  // Just enough profile data to render the avatar — image if the user has
  // set one (Phase 13), initials as a fallback otherwise.
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", data.claims.sub)
    .single();

  const initials = (profile?.display_name ?? profile?.username ?? "?")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <Link href="/account" aria-label="Your account">
        <Avatar className="h-8 w-8">
          <AvatarImage
            src={profile?.avatar_url ?? undefined}
            alt={profile?.display_name ?? profile?.username ?? "Avatar"}
          />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </Link>
      <NavMenu locale={locale} />
    </div>
  );
}
