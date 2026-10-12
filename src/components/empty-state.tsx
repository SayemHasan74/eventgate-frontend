import type { ReactNode } from "react";
import { Ticket } from "lucide-react";
import styles from "./ui/ui.module.css";

type EmptyStateProps = Readonly<{
  title: string;
  description: string;
  action?: ReactNode;
}>;

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section className={styles.state}>
      <Ticket aria-hidden="true" size={28} strokeWidth={1.8} />
      <h2>{title}</h2>
      <p>{description}</p>
      {action ? <div>{action}</div> : null}
    </section>
  );
}
