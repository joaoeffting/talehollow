import { headers } from "next/headers";
import { Link } from "@/i18n/navigation";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { requestPasswordReset } from "../login/actions";

export default async function ForgotPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { locale } = await params;
  const { sent, error } = await searchParams;
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const requestWithLocale = requestPasswordReset.bind(null, locale);

  return (
    <div className="mx-auto max-w-sm space-y-6 py-12">
      <h1 className="text-2xl font-semibold">Reset your password</h1>

      {sent ? (
        <p className="text-muted-foreground">
          If that email has an account, a password reset link is on its way —
          check your inbox.
        </p>
      ) : (
        <form action={requestWithLocale} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="w-full rounded border p-2"
          />
          <TurnstileWidget nonce={nonce} />
          <button className="rounded bg-primary px-4 py-2 text-primary-foreground">
            Send reset link
          </button>
        </form>
      )}

      <Link
        href="/login"
        className="block text-sm text-primary underline underline-offset-4 hover:text-accent"
      >
        ← Back to log in
      </Link>
    </div>
  );
}
