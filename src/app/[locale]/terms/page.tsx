import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Terms of Service — Talehollow",
  description: "The terms that govern your use of Talehollow.",
};

export default function TermsPage() {
  return (
    <div className="prose max-w-none py-12">
      <h1>Terms of Service</h1>
      <p className="text-muted-foreground">Last updated: August 11, 2026</p>

      <p>
        These Terms of Service (&quot;Terms&quot;) govern your use of Talehollow (the
        &quot;Service&quot;), operated by Joao Paulo Effting, an individual based in
        Sweden (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;). By creating an account
        or otherwise using the Service, you agree to these Terms. If you don&apos;t
        agree, please don&apos;t use the Service.
      </p>

      <h2>1. What Talehollow is</h2>
      <p>
        Talehollow is a community platform for serialized fiction: authors publish
        books made up of chapters, and readers discover, follow, and engage with
        that work through views, likes, comments, and public profile activity.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 13 years old to create an account. If you are under
        18, you should have a parent or guardian&apos;s permission to use the
        Service. By creating an account, you confirm that the information you
        provide is accurate and that you meet this age requirement.
      </p>

      <h2>3. Your account</h2>
      <p>
        You&apos;re responsible for maintaining the confidentiality of your
        password and for all activity that happens under your account. Let us
        know immediately at the contact below if you believe your account has
        been compromised. One account per person — don&apos;t create accounts to
        impersonate someone else or to evade a suspension.
      </p>

      <h2>4. Your content</h2>
      <p>
        You retain ownership of everything you write and post on Talehollow —
        books, chapters, comments, scrapbook posts, your profile bio, and any
        images you upload (&quot;Your Content&quot;). By posting Your Content, you
        grant us a worldwide, non-exclusive, royalty-free license to host, store,
        reproduce, and display it as necessary to operate and promote the
        Service (for example, showing your book on the discovery feed or
        rankings, or generating a preview card when a link to it is shared).
        This license ends when you delete Your Content or your account, except
        for copies that reasonably persist in backups for a limited time.
      </p>
      <p>
        You&apos;re responsible for making sure you actually have the rights to
        post whatever you post — don&apos;t upload someone else&apos;s writing,
        art, or other copyrighted material without permission.
      </p>

      <h2>5. Acceptable use</h2>
      <p>You agree not to use Talehollow to:</p>
      <ul>
        <li>
          Post content that&apos;s illegal, that sexualizes minors in any form, or
          that infringes someone else&apos;s intellectual property rights
        </li>
        <li>Harass, threaten, or deliberately target another user</li>
        <li>Impersonate any person or entity, including Talehollow staff</li>
        <li>
          Spam — post repetitive/unsolicited content, or attempt to manipulate
          view counts, likes, comments, or rankings through automated or
          coordinated means
        </li>
        <li>
          Scrape, reverse-engineer, or interfere with the Service&apos;s normal
          operation, including bypassing rate limits or anti-spam measures
        </li>
        <li>Upload malware or attempt to gain unauthorized access to any account or system</li>
      </ul>

      <h2>6. Moderation</h2>
      <p>
        Talehollow includes a reporting tool for flagging books, chapters, and
        scrapbook posts to administrators for review. We may remove content,
        suspend, or terminate accounts that violate these Terms, at our
        discretion, with or without notice.
      </p>

      <h2>7. Third-party services</h2>
      <p>
        Talehollow is built on top of third-party infrastructure — including
        Supabase (database, authentication, file storage), Vercel (hosting),
        PostHog (analytics), and Cloudflare (bot/spam protection). Details on
        what data each of these processes are in our{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>8. Termination</h2>
      <p>
        You can stop using the Service at any time. To request that your
        account and associated data be deleted, contact us at the email below —
        see the Privacy Policy for what that involves. We may suspend or
        terminate your access for violating these Terms.
      </p>

      <h2>9. The Service is provided &quot;as is&quot;</h2>
      <p>
        Talehollow is an independently-run, early-stage project. We don&apos;t
        guarantee the Service will be uninterrupted, error-free, or available
        at any particular time, and we&apos;re not liable for any loss arising
        from your use of (or inability to use) the Service, to the fullest
        extent permitted by law.
      </p>

      <h2>10. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. We&apos;ll update the
        &quot;Last updated&quot; date above when we do; continuing to use the
        Service after a change means you accept the updated Terms.
      </p>

      <h2>11. Governing law</h2>
      <p>These Terms are governed by the laws of Sweden.</p>

      <h2>12. Contact</h2>
      <p>
        Questions about these Terms? Reach out to{" "}
        <a href="mailto:talehollowapp@gmail.com">talehollowapp@gmail.com</a>.
      </p>
    </div>
  );
}
