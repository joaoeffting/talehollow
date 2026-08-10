import { Link } from "@/i18n/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { login, signup } from "./actions";

const TAB_VALUES = ["login", "signup"] as const;

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; error?: string }>;
}) {
  const { locale } = await params;
  const { tab, error } = await searchParams;
  const initialTab = TAB_VALUES.includes(tab as (typeof TAB_VALUES)[number])
    ? (tab as (typeof TAB_VALUES)[number])
    : "login";
  // Bound once here so the forms below don't each need to know about
  // locale threading — they just call the already-locale-aware action.
  const loginWithLocale = login.bind(null, locale);
  const signupWithLocale = signup.bind(null, locale);

  return (
    <div className="mx-auto max-w-sm space-y-6 py-12">
      <h1 className="text-2xl font-semibold">Welcome to Storyloom</h1>
      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="login">Log in</TabsTrigger>
          <TabsTrigger value="signup">Sign up</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <form action={loginWithLocale} className="mt-4 space-y-4">
            {error && initialTab === "login" && (
              <p className="text-sm text-destructive">{error}</p>
            )}
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
            <div className="flex items-center justify-between">
              <button className="rounded bg-primary px-4 py-2 text-primary-foreground">
                Log in
              </button>
              <Link
                href="/forgot-password"
                className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Forgot password?
              </Link>
            </div>
          </form>
        </TabsContent>

        <TabsContent value="signup">
          <form action={signupWithLocale} className="mt-4 space-y-4">
            {error && initialTab === "signup" && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <input
              name="username"
              required
              placeholder="Username"
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
            <button className="rounded bg-primary px-4 py-2 text-primary-foreground">
              Sign up
            </button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
