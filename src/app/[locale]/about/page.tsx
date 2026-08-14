import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "About — Talehollow",
  description: "About the developer behind Talehollow.",
};

export default function AboutPage() {
  return (
    <div className="prose max-w-none py-12">
      <h1>About</h1>
      <p>
        Talehollow was designed and built by João Effting — product, database
        design, security, and every feature on this site, end to end. It
        started as a way to explore what a modern full-stack app looks like
        today, from the ground up.
      </p>
      <p>
        If you&apos;re hiring, have a freelance project in mind, or just want
        to talk shop, I&apos;d like to hear from you.
      </p>
      <div className="not-prose flex flex-wrap gap-3">
        <a
          href="https://github.com/joaoeffting"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          GitHub
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
        <a
          href="https://www.linkedin.com/in/joaoeffting/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          LinkedIn
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
