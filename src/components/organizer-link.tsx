"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "./auth-provider";
export function OrganizerLink({
  children = "For organizers",
  className,
  workspaceOnly = false,
}: {
  children?: ReactNode;
  className?: string;
  workspaceOnly?: boolean;
}) {
  const { session } = useAuth();
  const permitted =
    session?.user.role === "ORGANIZER" || session?.user.role === "ADMIN";
  if (workspaceOnly && !permitted) return null;
  return (
    <Link
      className={className}
      href={permitted ? "/organizer" : "/for-organizers"}
    >
      {children}
    </Link>
  );
}
