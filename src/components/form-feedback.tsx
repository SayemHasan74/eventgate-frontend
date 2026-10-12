"use client";
import { useEffect, useId } from "react";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { ApiError } from "@/lib/api-error";
import styles from "./ui/ui.module.css";

export function reportFormError<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: unknown,
  aliases: Record<string, Path<T>> = {},
) {
  if (error instanceof ApiError) {
    const values = form.getValues();
    for (const [key, messages] of Object.entries(error.fieldErrors)) {
      const field = aliases[key] ?? key;
      if (field in values)
        form.setError(field as Path<T>, {
          type: "server",
          message: messages.join(" "),
        });
    }
  }
  form.setError("root.server", {
    type: "server",
    message:
      error instanceof Error
        ? error.message
        : "The request failed. Your values have been retained; please retry.",
  });
}
export function FormFeedback<T extends FieldValues>({
  form,
  name,
  id,
}: {
  form: UseFormReturn<T>;
  name?: Path<T>;
  id?: string;
}) {
  const error = name
    ? form.getFieldState(name, form.formState).error
    : form.formState.errors.root?.server;
  return error ? (
    <small id={id} role="alert" className={styles.error}>
      {error.message}
    </small>
  ) : null;
}
export function useFormFields<T extends FieldValues>(form: UseFormReturn<T>) {
  const prefix = useId();
  const errorId = (name: Path<T>) => `${prefix}-${name}-error`;
  return Object.assign(
    (name: Path<T>, options?: Parameters<typeof form.register>[1]) => ({
      ...form.register(name, options),
      id: `${prefix}-${name}`,
      "aria-invalid": !!form.getFieldState(name, form.formState).error,
      "aria-describedby": form.getFieldState(name, form.formState).error
        ? errorId(name)
        : undefined,
    }),
    { errorId },
  );
}
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: MouseEvent) => {
      const anchor =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;
      const target = new URL(anchor.href);
      if (
        target.pathname === location.pathname &&
        target.search === location.search
      )
        return;
      if (
        !window.confirm("Leave this page? Your unsaved changes will be lost.")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);
}
