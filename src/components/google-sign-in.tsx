"use client";

import { useEffect, useRef, useState } from "react";

import { appConfig } from "@/lib/env";

type GoogleCredentialResponse = { credential?: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

type GoogleConfig = { success: boolean; data?: { enabled?: boolean; clientId?: string } };

export function GoogleSignIn({ onCredential, disabled }: Readonly<{ onCredential: (idToken: string) => void; disabled: boolean }>) {
  const button = useRef<HTMLDivElement>(null);
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`${appConfig.apiBaseUrl}/auth/google/config`);
        const config = (await response.json()) as GoogleConfig;
        const clientId = config.data?.enabled ? config.data.clientId : undefined;
        if (!clientId || !button.current || !active) {
          if (active) setIsAvailable(false);
          return;
        }
        const render = () => {
          if (!active || !button.current || !window.google) return;
          window.google.accounts.id.initialize({ client_id: clientId, callback: (credential) => credential.credential && onCredential(credential.credential) });
          button.current.replaceChildren();
          window.google.accounts.id.renderButton(button.current, { theme: "outline", size: "large", text: "continue_with", shape: "rectangular", width: 320 });
        };
        const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
        if (window.google) render();
        else if (existing) existing.addEventListener("load", render, { once: true });
        else {
          const script = document.createElement("script");
          script.src = "https://accounts.google.com/gsi/client";
          script.async = true;
          script.onload = render;
          script.onerror = () => active && setIsAvailable(false);
          document.head.append(script);
        }
      } catch {
        if (active) setIsAvailable(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [onCredential]);

  if (!isAvailable) return null;
  return <div aria-disabled={disabled} className="auth-google" ref={button} />;
}
