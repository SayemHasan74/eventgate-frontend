"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button, LinkButton } from "./index";
import styles from "./ui.module.css";
export function ErrorState({
  title = "This panel could not load.",
  message,
  retry,
}: {
  title?: string;
  message: string;
  retry: () => void;
}) {
  return (
    <section className={styles.state} role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
      <Button onClick={retry}>Try again</Button>
    </section>
  );
}
export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <Button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        Previous
      </Button>
      <span>
        Page {page} of {Math.max(1, totalPages)}
      </span>
      <Button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
export function Modal({
  open,
  title,
  onDismiss,
  children,
  className = "",
  busy = false,
}: {
  open: boolean;
  title: string;
  onDismiss: () => void;
  children: ReactNode;
  className?: string;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
      else
        queueMicrotask(() => {
          const main = document.getElementById("main-content");
          if (main) {
            main.tabIndex = -1;
            main.focus();
          }
        });
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      className={`${styles.dialog} ${className}`}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onDismiss();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onDismiss();
      }}
    >
      <h2 id={id}>{title}</h2>
      {children}
    </dialog>
  );
}
export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  onDismiss,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onDismiss: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const confirm = async () => {
    setPending(true);
    setError("");
    try {
      await onConfirm();
      onDismiss();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The change could not be saved. Retry when connected.",
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <Modal open={open} title={title} onDismiss={onDismiss} busy={pending}>
      <p>{description}</p>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.dialogActions}>
        <Button disabled={pending} onClick={onDismiss}>
          Cancel
        </Button>
        <Button
          variant="danger"
          disabled={pending}
          onClick={() => void confirm()}
        >
          {pending ? "Saving…" : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
export { LinkButton };
