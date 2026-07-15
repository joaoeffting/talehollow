import { login, signup } from "./actions";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Bound once here so the buttons below don't each need to know about
  // locale threading — they just call the already-locale-aware action.
  const loginWithLocale = login.bind(null, locale);
  const signupWithLocale = signup.bind(null, locale);

  return (
    <div className="mx-auto max-w-sm space-y-6 py-12">
      <h1 className="text-2xl font-semibold">Log in or sign up</h1>
      {/* One form, two possible actions — formAction on each button
          overrides the form's own action, so either button can submit the
          same fields to a different Server Action. */}
      <form className="space-y-4">
        <input
          name="username"
          placeholder="Username (signup only)"
          className="w-full rounded border p-2"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="w-full rounded border p-2"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          className="w-full rounded border p-2"
        />
        <div className="flex gap-2">
          <button
            formAction={loginWithLocale}
            className="rounded bg-primary px-4 py-2 text-primary-foreground"
          >
            Log in
          </button>
          <button
            formAction={signupWithLocale}
            className="rounded border px-4 py-2"
          >
            Sign up
          </button>
        </div>
      </form>
    </div>
  );
}
