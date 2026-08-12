"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: { sitekey: string; callback: (token: string) => void },
      ) => string;
    };
  }
}

// Drop into any form that calls login/signup/requestPasswordReset — those
// Server Actions read the `captchaToken` field this renders and forward it
// to Supabase, which (once CAPTCHA protection is turned on in the
// Dashboard) requires it on every one of those endpoints, not just signup.
// Renders nothing — forms behave exactly as before — until
// NEXT_PUBLIC_TURNSTILE_SITE_KEY is actually set, so this is safe to ship
// ahead of finishing the Cloudflare/Supabase Dashboard setup.
export function TurnstileWidget({ nonce }: { nonce?: string }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!scriptReady || !siteKey || !containerRef.current) return;
    window.turnstile?.render(containerRef.current, {
      sitekey: siteKey,
      callback: setToken,
    });
  }, [scriptReady, siteKey]);

  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        nonce={nonce}
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} />
      <input type="hidden" name="captchaToken" value={token} />
    </>
  );
}
