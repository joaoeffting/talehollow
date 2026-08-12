import { createClient } from "@/utils/supabase/server";
import { BottomNavBar } from "@/components/bottom-nav-bar";

// Async Server Component just for the auth/profile fetch, same split as
// NavAuthLinks — keeps the interactive bar (active-tab highlighting, the
// live notification badge) in its own Client Component below.
export async function BottomNav() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    return <BottomNavBar isLoggedIn={false} />;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", data.claims.sub)
    .single();

  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", data.claims.sub)
    .is("read_at", null);

  return (
    <BottomNavBar
      isLoggedIn
      userId={data.claims.sub}
      username={profile?.username}
      initialUnreadCount={unreadCount ?? 0}
    />
  );
}
