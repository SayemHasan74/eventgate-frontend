"use client";

import { useEffect, useRef, useState } from "react";
import featureStyles from "@/components/auth-styles.module.css";
import { z } from "zod";
import { apiClient } from "@/lib/api-client";

type GoogleCredentialResponse = { credential?: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: Record<string, unknown>,
          ) => void;
        };
      };
    };
  }
}

export function GoogleSignIn({
  onCredential,
  disabled,
  onUnavailable,
}: Readonly<{
  onCredential: (idToken: string) => void;
  disabled: boolean;
  onUnavailable?: () => void;
}>) {
  const button = useRef<HTMLDivElement>(null);
  const busy = useRef(disabled);
  useEffect(() => {
    busy.current = disabled;
  }, [disabled]);
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const config = await apiClient(
          "/api/auth/google/config",
          z.object({ enabled: z.boolean(), clientId: z.string().optional() }),
        );
        const clientId = config.enabled ? config.clientId : undefined;
        if (!clientId || !button.current || !active) {
          if (active) {
            setIsAvailable(false);
            onUnavailable?.();
          }
          return;
        }
        const render = () => {
          if (!active || !button.current || !window.google) return;
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (credential) =>
              !busy.current &&
              credential.credential &&
              onCredential(credential.credential),
          });
          button.current.replaceChildren();
          window.google.accounts.id.renderButton(button.current, {
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            width: 320,
          });
        };
        const existing = document.querySelector<HTMLScriptElement>(
          'script[src="https://accounts.google.com/gsi/client"]',
        );
        if (window.google) render();
        else if (existing)
          existing.addEventListener("load", render, { once: true });
        else {
          const script = document.createElement("script");
          script.src = "https://accounts.google.com/gsi/client";
          script.async = true;
          script.onload = render;
          script.onerror = () => {
            if (active) {
              setIsAvailable(false);
              onUnavailable?.();
            }
          };
          document.head.append(script);
        }
      } catch {
        if (active) {
          setIsAvailable(false);
          onUnavailable?.();
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [onCredential, onUnavailable]);

  if (!isAvailable) return null;
  return (
    <div
      aria-disabled={disabled}
      className={[featureStyles["auth-google"]].join(" ")}
      ref={button}
    />
  );
}
