import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Privacy Policy — Storyloom",
  description: "What data Storyloom collects and how it's used.",
};

export default function PrivacyPage() {
  return (
    <div className="prose max-w-none py-12">
      <h1>Privacy Policy</h1>
      <p className="text-muted-foreground">Last updated: August 11, 2026</p>

      <h2>1. Who we are</h2>
      <p>
        Storyloom is operated by Joao Paulo Effting, an individual based in
        Sweden, who is the data controller for the personal data described
        below. You can reach us at{" "}
        <a href="mailto:joaoeffting@gmail.com">joaoeffting@gmail.com</a> for
        any privacy question or request.
      </p>

      <h2>2. What we collect</h2>
      <p>
        <strong>Account data.</strong> When you sign up: your email address, a
        password (stored hashed by our authentication provider, Supabase — we
        never see it in plain text), and the username/display name you choose.
        Optionally: a bio, an avatar image, and your site/content language
        preferences.
      </p>
      <p>
        <strong>Content you create.</strong> Books, chapters, comments,
        scrapbook posts, likes, follows, and reports you submit — all stored
        in our database. Anything you publish (books, chapters, scrapbook
        posts, comments) is, by nature, public and visible to other visitors.
      </p>
      <p>
        <strong>Usage &amp; analytics data.</strong> If you accept the cookie
        banner shown on your first visit, we use PostHog to understand how
        the Service is used — page views, general device/browser
        information, and an approximate location derived from your IP
        address. We don&apos;t use this to build advertising profiles, and
        we don&apos;t sell it. Nothing is sent to PostHog unless you accept —
        you can change your choice at any time via &quot;Cookie
        preferences&quot; in the footer.
      </p>
      <p>
        <strong>Cookies.</strong> A session cookie that keeps you logged in
        (necessary for the Service to function), an anonymized{" "}
        <code>anon_id</code> cookie used to prevent the same visitor from
        inflating view counts (kept for up to a year), a cookie remembering
        your analytics consent choice, and — only if you&apos;ve accepted
        that choice — cookies set by PostHog for analytics.
      </p>
      <p>
        <strong>CAPTCHA verification.</strong> We use Cloudflare Turnstile to
        tell human visitors apart from bots on sign-up, login, and password
        reset. Turnstile processes some technical signals about your browser
        /device to do this — see{" "}
        <a
          href="https://www.cloudflare.com/privacypolicy/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Cloudflare&apos;s privacy policy
        </a>
        .
      </p>
      <p>
        <strong>Reading progress.</strong> &quot;Continue reading&quot; and
        per-chapter read status are stored only in your own browser&apos;s
        local storage — this never leaves your device or reaches our servers,
        and doesn&apos;t sync across devices.
      </p>

      <h2>3. How we use it</h2>
      <ul>
        <li>To operate your account and the core reading/writing features</li>
        <li>
          To send you essential account emails (email confirmation, password
          reset) — we don&apos;t send marketing email
        </li>
        <li>To prevent spam, abuse, and bot activity</li>
        <li>To understand usage and improve the Service (analytics)</li>
        <li>To review content you or others report, for moderation</li>
      </ul>

      <h2>4. Legal basis (GDPR)</h2>
      <p>
        We process account and content data because it&apos;s necessary to
        provide the Service you&apos;ve signed up for (performance of a
        contract). We process anti-spam and security data (like the{" "}
        <code>anon_id</code> cookie) under legitimate interest. Analytics
        data is processed only with your consent — nothing is sent to
        PostHog until you accept the cookie banner, and you can withdraw
        that consent at any time via &quot;Cookie preferences&quot; in the
        footer, which stops future tracking immediately.
      </p>

      <h2>5. Who we share data with</h2>
      <p>
        We don&apos;t sell your data. We share it with the infrastructure
        providers that run the Service, each acting as a data processor on our
        behalf:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — database, authentication, and file
          storage (avatars, cover images)
        </li>
        <li>
          <strong>Vercel</strong> — application hosting
        </li>
        <li>
          <strong>PostHog</strong> — analytics (PostHog&apos;s US Cloud, for
          this project)
        </li>
        <li>
          <strong>Cloudflare</strong> — CAPTCHA/bot protection
        </li>
      </ul>

      <h2>6. International data transfers</h2>
      <p>
        Some of the providers above (PostHog, in particular) process data
        outside the EEA. Where that happens, it&apos;s done under that
        provider&apos;s own data protection safeguards (such as Standard
        Contractual Clauses).
      </p>

      <h2>7. Your rights</h2>
      <p>
        If GDPR applies to you, you have the right to access, correct,
        delete, or export your data, to object to or restrict certain
        processing, and to withdraw consent where processing is based on
        it. Account deletion and data export are both self-service —
        &quot;Your data&quot; and &quot;Danger zone&quot; in{" "}
        <Link href="/settings">Settings</Link> — no need to email us for
        either. For anything else (correcting inaccurate data, objecting to
        processing), email{" "}
        <a href="mailto:joaoeffting@gmail.com">joaoeffting@gmail.com</a>.
        You also have the right to lodge a complaint with your local
        data protection authority (in Sweden, the{" "}
        <a
          href="https://www.imy.se/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Integritetsskyddsmyndigheten (IMY)
        </a>
        ).
      </p>

      <h2>8. Data retention</h2>
      <p>
        We keep your data for as long as your account is active. If you
        request deletion, we&apos;ll delete or anonymize your personal data
        within a reasonable time, except where we&apos;re required to keep
        something longer (e.g. to resolve a dispute or comply with a legal
        obligation).
      </p>

      <h2>9. Children&apos;s privacy</h2>
      <p>
        Storyloom isn&apos;t directed at children under 13, and we don&apos;t
        knowingly collect data from anyone under that age. If you believe a
        child has provided us with personal data, contact us and we&apos;ll
        delete it.
      </p>

      <h2>10. Security</h2>
      <p>
        We take reasonable measures to protect your data (e.g. encrypted
        connections, hashed passwords), but no method of transmission or
        storage is perfectly secure, and we can&apos;t guarantee absolute
        security.
      </p>

      <h2>11. Changes to this policy</h2>
      <p>
        We may update this policy from time to time; we&apos;ll update the
        &quot;Last updated&quot; date above when we do.
      </p>

      <h2>12. Contact</h2>
      <p>
        <a href="mailto:joaoeffting@gmail.com">joaoeffting@gmail.com</a> — see
        also our <Link href="/terms">Terms of Service</Link>.
      </p>
    </div>
  );
}
