import type { ReactNode } from "react";
import { Ticket } from "lucide-react";

type EmptyStateProps = Readonly<{
  title: string;
  description: string;
  action?: ReactNode;
}>;

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section className="empty-state" aria-labelledby="empty-state-title">
      <Ticket aria-hidden="true" size={28} strokeWidth={1.8} />
      <h2 id="empty-state-title">{title}</h2>
      <p>{description}</p>
      {action ? <div>{action}</div> : null}
    </section>
  );
}
