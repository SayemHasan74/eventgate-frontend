import { Skeleton } from "@/components/ui";
export default function Loading() {
  return (
    <section aria-busy="true">
      <p>Loading workspace…</p>
      <Skeleton />
    </section>
  );
}
