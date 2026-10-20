import { WorkspaceRole } from "@/components/workspace-role";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Saved events | EventGate",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <WorkspaceRole roles={["ATTENDEE"]}>{children}</WorkspaceRole>;
}
