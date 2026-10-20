import { WorkspaceRole } from "@/components/workspace-role";
import type { Metadata } from "next";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <WorkspaceRole roles={["ATTENDEE"]}>{children}</WorkspaceRole>;
}
