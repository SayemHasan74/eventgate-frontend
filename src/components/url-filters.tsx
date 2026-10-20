"use client";
import {
  useRef,
  useEffect,
  type InputHTMLAttributes,
  type ComponentProps,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { z } from "zod";
import { nonEmptyParams } from "@/lib/filter-schemas";
import { Input } from "./ui";

// Filter submissions are client-owned reads, like pagination below. Keep a
// native GET fallback while retaining the current workspace and query cache.
export function QueryFilterForm(
  props: Omit<ComponentProps<"form">, "method" | "action" | "onSubmit">,
) {
  const pathname = usePathname();
  return (
    <form
      {...props}
      method="GET"
      onSubmit={(event) => {
        event.preventDefault();
        const params = new URLSearchParams();
        for (const [key, value] of new FormData(event.currentTarget))
          if (typeof value === "string") params.append(key, value);
        window.history.pushState(null, "", `${pathname}?${params}`);
      }}
    />
  );
}
export function useUrlFilters<T extends { page: number }>(
  schema: z.ZodType<T>,
) {
  const params = useSearchParams();
  const pathname = usePathname();
  const result = schema.safeParse(
    nonEmptyParams(new URLSearchParams(params.toString())),
  );
  const fallback = schema.parse({});
  const values = result.success ? result.data : fallback;
  const update = (key: string, value: string | number) => {
    const next = new URLSearchParams(params.toString());
    if (value === "") next.delete(key);
    else next.set(key, String(value));
    if (key !== "page") next.set("page", "1");
    window.history.pushState(null, "", `${pathname}?${next}`);
  };
  return {
    values,
    valid: result.success,
    error: result.success
      ? ""
      : result.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(" "),
    update,
    setPage: (value: number) => update("page", value),
  };
}
export function DebouncedSearchInput({
  styled = false,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { styled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composing = useRef(false);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    const input = inputRef.current;
    if (input && document.activeElement !== input)
      input.value = String(props.defaultValue ?? "");
  }, [props.defaultValue]);
  const schedule = (input: HTMLInputElement) => {
    if (timer.current) clearTimeout(timer.current);
    if (!composing.current && window.matchMedia("(min-width: 960px)").matches)
      timer.current = setTimeout(() => {
        if (input.form?.isConnected) input.form.requestSubmit();
      }, 300);
  };
  const Control = styled ? Input : "input";
  return (
    <Control
      {...props}
      ref={inputRef}
      onCompositionStart={() => {
        composing.current = true;
        if (timer.current) clearTimeout(timer.current);
      }}
      onCompositionEnd={(event) => {
        composing.current = false;
        schedule(event.currentTarget);
      }}
      onChange={(event) => {
        props.onChange?.(event);
        schedule(event.currentTarget);
      }}
    />
  );
}
