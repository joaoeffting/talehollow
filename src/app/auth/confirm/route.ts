import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Landing point for the "Reset Password" email link. Deliberately not using
// Supabase's default {{ .ConfirmationURL }} (which round-trips through
// Supabase's own hosted /verify endpoint and finishes as a PKCE `code`
// exchange) — that exchange only works if the link is opened in the same
// browser that requested the reset, which fails constantly in practice
// (reset requested on desktop, link opened from a phone's mail app). The
// email template instead points straight here with `token_hash`+`type`,
// verified via verifyOtp — no code_verifier/cookie dependency, so it works
// from any device. See Supabase Dashboard → Authentication → Email
// Templates → "Reset Password", which must use:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  // Only relative paths are honored — next-intl re-prefixes this with the
  // visitor's locale on the follow-up redirect, and treating it as
  // same-origin-only rules out this becoming an open redirect if the query
  // param is ever tampered with.
  const rawNext = searchParams.get("next") ?? "/reset-password";
  const next = rawNext.startsWith("/") ? rawNext : "/reset-password";

  // Only password recovery is wired through this route today — signup
  // confirmation still uses Supabase's default {{ .ConfirmationURL }}, so
  // any other `type` here is unexpected rather than just unimplemented.
  if (tokenHash && type === "recovery") {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/error", origin));
}
