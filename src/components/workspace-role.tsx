import { redirect } from "next/navigation";
import { SessionError } from "@/lib/server/session-store";
import { SessionUnavailable } from "./session-unavailable";
import { currentSession, sessionIdentity } from "@/lib/server/browser-session";
import type { AuthUser } from "@/lib/auth-types";
export async function WorkspaceRole({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles: AuthUser["role"][];
}) {
  const session = await currentSession();
  if (!session) redirect("/auth/sign-in");
  let user: AuthUser;
  try {
    user = await sessionIdentity(session);
  } catch (error) {
    if (error instanceof SessionError && error.status === 401)
      redirect("/auth/sign-in");
    return <SessionUnavailable />;
  }
  if (!roles.includes(user.role))
    return (
      <section role="alert">
        <h1>Access denied</h1>
        <p>This workspace is not available for your account role.</p>
        <a href="/account">My account</a>
      </section>
    );
  return children;
}
