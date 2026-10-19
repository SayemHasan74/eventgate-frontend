"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  const callbacks = useRef({ onCredential, onUnavailable });
  useLayoutEffect(() => {
    callbacks.current = { onCredential, onUnavailable };
  }, [onCredential, onUnavailable]);
  const config = useQuery({
    queryKey: ["google-sign-in-config"],
    queryFn: () =>
      apiClient(
        "/api/auth/google/config",
        z.object({ enabled: z.boolean(), clientId: z.string().optional() }),
      ),
    staleTime: 300000,
    retry: false,
  });
  const busy = useRef(disabled);
  useEffect(() => {
    busy.current = disabled;
  }, [disabled]);
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    if (!config.data && !config.isError) return;
    let active = true;
    let detach: (() => void) | undefined;
    const load = async () => {
      try {
        const clientId = config.data?.enabled
          ? config.data.clientId
          : undefined;
        if (!clientId || !button.current || !active) {
          if (active) {
            setIsAvailable(false);
            callbacks.current.onUnavailable?.();
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
              callbacks.current.onCredential(credential.credential),
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
        else if (existing) {
          existing.addEventListener("load", render, { once: true });
          detach = () => existing.removeEventListener("load", render);
        } else {
          const script = document.createElement("script");
          script.src = "https://accounts.google.com/gsi/client";
          script.async = true;
          const failed = () => {
            if (active) {
              setIsAvailable(false);
              callbacks.current.onUnavailable?.();
            }
          };
          script.addEventListener("load", render, { once: true });
          script.addEventListener("error", failed, { once: true });
          detach = () => {
            script.removeEventListener("load", render);
            script.removeEventListener("error", failed);
          };
          document.head.append(script);
        }
      } catch {
        if (active) {
          setIsAvailable(false);
          callbacks.current.onUnavailable?.();
        }
      }
    };
    void load();
    return () => {
      active = false;
      detach?.();
    };
  }, [config.data, config.isError]);

  if (!isAvailable) return null;
  return (
    <div
      aria-disabled={disabled}
      className={[featureStyles["auth-google"]].join(" ")}
      ref={button}
    />
  );
}
