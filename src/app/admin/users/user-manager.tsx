"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, UserCog } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

type User = { id: string; email: string; displayName: string; role: "ATTENDEE" | "ORGANIZER" | "ADMIN"; status: "ACTIVE" | "SUSPENDED"; createdAt: string };
type Api<T> = { success: true; data: T; meta?: { total?: number } };
async function api<T>(token: string, path: string, method = "GET", body?: unknown) { const r = await fetch(`/api/admin/${path}`, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }); const p = await r.json() as Api<T> & { message?: string }; if (!r.ok || !p.success) throw new Error(p.message ?? "User action failed."); return p; }
export function UserManager() {
 const { isReady, session } = useAuth(); const queryClient = useQueryClient(); const search = useSearchParams(); const qs = new URLSearchParams(search.toString()); if (!qs.has("limit")) qs.set("limit", "50"); const allowed = session?.user.role === "ADMIN";
 const users = useQuery({ queryKey: ["admin-users", session?.accessToken, qs.toString()], queryFn: () => api<User[]>(session!.accessToken, `users?${qs}`), enabled: isReady && allowed });
 const update = useMutation({ mutationFn: ({id,path,body}:{id:string;path:string;body:unknown}) => api<User>(session!.accessToken, `users/${id}/${path}`, "PATCH", body), onSuccess: () => queryClient.invalidateQueries({queryKey:["admin-users"]}) });
 if (!isReady) return <p className="loading">Loading users…</p>; if (!allowed) return <section className="not-found"><ShieldCheck size={36}/><h1>Admin <b>only.</b></h1></section>;
 return <section className="admin-users"><p className="eyebrow"><span/> Platform administration</p><h1>User <b>management.</b></h1><form action="/admin/users"><input name="search" defaultValue={search.get("search") ?? ""} placeholder="Search name or email"/><select name="role" defaultValue={search.get("role") ?? ""}><option value="">All roles</option><option>ATTENDEE</option><option>ORGANIZER</option><option>ADMIN</option></select><button className="button button-primary">Filter</button></form>{users.isLoading ? <p>Loading users…</p> : users.isError ? <p>{users.error.message}</p> : <div className="user-list">{users.data?.data.map(user => <article key={user.id}><div><UserCog size={18}/><strong>{user.displayName}</strong><span>{user.email} · {user.status}</span></div><div><select aria-label={`Role for ${user.displayName}`} defaultValue={user.role} disabled={user.role === "ADMIN" || update.isPending} onChange={e => update.mutate({id:user.id,path:"role",body:{role:e.target.value}})}><option>ATTENDEE</option><option>ORGANIZER</option><option disabled>ADMIN</option></select><button type="button" disabled={update.isPending} onClick={() => update.mutate({id:user.id,path:"status",body:{status:user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"}})}>{user.status === "ACTIVE" ? "Suspend" : "Activate"}</button></div></article>)}</div>}</section>;
}
