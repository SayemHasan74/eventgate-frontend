import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
} from "react";
import styles from "./ui.module.css";
export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  return (
    <button
      type="button"
      className={`${styles.button} ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
export function LinkButton({
  href,
  children,
  variant = "secondary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link className={`${styles.button} ${styles[variant]}`} href={href}>
      {children}
    </Link>
  );
}
export const Input = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={`${styles.control} ${props.className ?? ""}`} />
);
export const Select = (props: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} className={`${styles.control} ${props.className ?? ""}`} />
);
export const Textarea = (
  props: TextareaHTMLAttributes<HTMLTextAreaElement>,
) => (
  <textarea
    {...props}
    className={`${styles.control} ${props.className ?? ""}`}
  />
);
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className={styles.field}>
      {label}
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function FieldError({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}) {
  return children ? (
    <p id={id} className={styles.error} role="alert">
      {children}
    </p>
  ) : null;
}
export function StatusBadge({ status }: { status: string }) {
  const tone = ["PAID", "SUCCEEDED", "PUBLISHED", "ACTIVE"].includes(status)
    ? "good"
    : ["FAILED", "CANCELLED", "VOIDED", "REJECTED", "EXPIRED"].includes(status)
      ? "bad"
      : "pending";
  return (
    <span className={styles.badge} data-tone={tone}>
      {status.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
}: {
  caption: string;
  columns: { key: string; label: string; cell: (row: T) => ReactNode }[];
  rows: T[];
  rowKey: (row: T) => string;
}) {
  return (
    <div
      className={styles.tableWrap}
      role="region"
      aria-label={caption}
      tabIndex={0}
    >
      <table className={styles.table}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th scope="col" key={column.key}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.key}>{column.cell(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className={styles.filters}>{children}</div>;
}
export function MetricCard({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <article className={styles.metric}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className={styles.breadcrumbs}>
        {items.map((item, index) => (
          <li key={index}>
            {index > 0 && <span aria-hidden="true">/ </span>}
            {item.href ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
export function Skeleton({
  label = "Loading",
  lines = 3,
}: {
  label?: string;
  lines?: number;
}) {
  return (
    <div role="status" aria-label={label}>
      {Array.from({ length: lines }, (_, index) => (
        <div key={index} aria-hidden="true" className={styles.skeleton} />
      ))}
    </div>
  );
}
