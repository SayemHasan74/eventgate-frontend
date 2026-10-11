import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { currentSession, sessionIdentity } from "@/lib/server/browser-session";
import { SessionError } from "@/lib/server/session-store";
import type { AuthUser } from "@/lib/auth-types";
import { SessionUnavailable } from "./session-unavailable";

export async function ProtectedLayout({
  children,
  roles,
  next,
}: Readonly<{
  children: React.ReactNode;
  roles?: AuthUser["role"][];
  next: string;
}>) {
  let user: AuthUser | null = null;
  try {
    const session = await currentSession();
    if (session) user = await sessionIdentity(session);
  } catch (error) {
    if (error instanceof SessionError && error.status === 403)
      return (
        <section className="not-found" role="alert">
          <h1>Access denied</h1>
          <p>Your account cannot open this workspace. You are still signed in.</p>
          <a href="/account">My account</a>
        </section>
      );
    if (!(error instanceof SessionError && error.status === 401))
      return <SessionUnavailable />;
  }
  if (!user) {
    const requested = (await headers()).get("x-eventgate-next");
    const destination =
      requested?.startsWith("/") &&
      !requested.startsWith("//") &&
      !requested.includes("\\")
        ? requested
        : next;
    redirect("/auth/sign-in?next=" + encodeURIComponent(destination));
  }
  if (roles && !roles.includes(user.role))
    return (
      <section className="not-found">
        <h1>Access denied</h1>
        <p>This workspace is not available for your account role.</p>
        <a href="/account">My account</a>
      </section>
    );
  return children;
}
