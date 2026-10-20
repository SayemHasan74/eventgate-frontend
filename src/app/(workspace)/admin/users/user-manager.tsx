"use client";
import Form from "next/form";
import Link from "next/link";
import { AdminAction } from "@/components/admin-action";
import { adminDateParams } from "@/lib/admin-workflow-api";
import { invalidateMutation, privateKey } from "@/lib/query-keys";
import featureStyles from "./user-manager.module.css";
import { z } from "zod";
import { apiClient, apiList, jsonBody } from "@/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, UserCog } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useState } from "react";
import { toast } from "sonner";
import { UserChangeDialog, type UserCommand } from "./user-change-dialog";
import { useUrlFilters, DebouncedSearchInput } from "@/components/url-filters";
import { adminUserFilterSchema } from "@/lib/filter-schemas";
import { FieldError } from "@/components/ui";
import { Pagination } from "@/components/ui/interactive";

type User = {
  id: string;
  email: string;
  displayName: string;
  role: "ATTENDEE" | "ORGANIZER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
};
const userSchema: z.ZodType<User> = z.object({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string(),
  role: z.enum(["ATTENDEE", "ORGANIZER", "ADMIN"]),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  createdAt: z.iso.datetime({ offset: true }),
});
export function UserManager() {
  const { isReady, session } = useAuth();
  const [command, setCommand] = useState<UserCommand | null>(null);
  const queryClient = useQueryClient();
  const search = useSearchParams();
  const filters = useUrlFilters(adminUserFilterSchema);
  const qs = adminDateParams(filters.values);
  for (const key of ["page", "search", "role", "status"] as const) {
    const value = filters.values[key];
    if (value !== undefined && value !== "") qs.set(key, String(value));
  }
  if (!qs.has("limit")) qs.set("limit", "50");
  const allowed = session?.user.role === "ADMIN";
  const users = useQuery({
    queryKey: privateKey("admin-users", session?.user.id, "list", {
      query: qs.toString(),
    }),
    queryFn: () => apiList(`/api/admin/users?${qs}`, userSchema),
    enabled: isReady && allowed && filters.valid,
  });
  const update = useMutation({
    mutationFn: ({
      id,
      path,
      body,
    }: {
      id: string;
      path: string;
      body: unknown;
    }) =>
      apiClient(`/api/admin/users/${id}/${path}`, userSchema, {
        method: "PATCH",
        ...jsonBody(body),
      }),
    onSuccess: () => {
      toast.success("User updated.");
    },
    onSettled: () =>
      session
        ? invalidateMutation(queryClient, session.user.id, "adminUser")
        : undefined,
  });
  if (!isReady) return <p className="loading">Loading users…</p>;
  if (!allowed)
    return (
      <section className="not-found">
        <ShieldCheck size={36} />
        <h1>
          Admin <b>only.</b>
        </h1>
      </section>
    );
  return (
    <section className={[featureStyles["admin-users"]].join(" ")}>
      <p className="eyebrow">
        <span /> Platform administration
      </p>
      <h1>
        User <b>management.</b>
      </h1>
      <p>
        Administrator roles are seed-only. You cannot suspend/delete yourself or
        remove the last active administrator. Organizers with draft/published
        events cannot be demoted or deleted. The server rechecks every action.
      </p>
      <Form
        key={JSON.stringify(filters.values)}
        scroll={false}
        action="/admin/users"
      >
        <input type="hidden" name="page" value="1" />
        <DebouncedSearchInput
          name="search"
          maxLength={120}
          defaultValue={search.get("search") ?? ""}
          placeholder="Search name or email"
        />
        <select
          key={search.get("role") ?? "all"}
          name="role"
          defaultValue={search.get("role") ?? ""}
        >
          <option value="">All roles</option>
          <option>ATTENDEE</option>
          <option>ORGANIZER</option>
          <option>ADMIN</option>
        </select>
        <label>
          Status
          <select
            name="status"
            defaultValue={filters.values.status ?? ""}
            key={filters.values.status ?? "all"}
          >
            <option value="">All statuses</option>
            <option>ACTIVE</option>
            <option>SUSPENDED</option>
          </select>
        </label>
        <label>
          Registered from (Dhaka)
          <input
            name="startDate"
            type="date"
            defaultValue={filters.values.startDate}
          />
        </label>
        <label>
          Through (Dhaka)
          <input
            name="endDate"
            type="date"
            defaultValue={filters.values.endDate}
          />
        </label>
        <button className="button button-primary">Filter</button>
      </Form>
      {!filters.valid ? (
        <FieldError>{filters.error}</FieldError>
      ) : users.isLoading ? (
        <p>Loading users…</p>
      ) : users.isError ? (
        <p>{users.error.message}</p>
      ) : users.data &&
        filters.values.page > Math.max(1, users.data.meta.totalPages) ? (
        <button
          type="button"
          className="button"
          onClick={() => filters.setPage(1)}
        >
          Reset unavailable page
        </button>
      ) : (
        <div className={[featureStyles["user-list"]].join(" ")}>
          {users.data?.data.length === 0 && (
            <p>No users match these filters.</p>
          )}
          {users.data?.data.map((user) => (
            <article key={user.id}>
              <div>
                <UserCog size={18} />
                <Link href={`/admin/users/${user.id}`}>
                  <strong>{user.displayName}</strong>
                </Link>
                <span>
                  {user.email} · {user.status}
                </span>
              </div>
              <div>
                <select
                  aria-label={`Role for ${user.displayName}`}
                  value={user.role}
                  disabled={
                    user.role === "ADMIN" ||
                    (update.isPending && update.variables?.id === user.id)
                  }
                  onChange={(e) =>
                    setCommand({
                      id: user.id,
                      path: "role",
                      body: {
                        role: e.target.value as "ATTENDEE" | "ORGANIZER",
                      },
                    })
                  }
                >
                  <option>ATTENDEE</option>
                  <option>ORGANIZER</option>
                  <option disabled>ADMIN</option>
                </select>
                <button
                  type="button"
                  disabled={
                    user.id === session?.user.id ||
                    (update.isPending && update.variables?.id === user.id)
                  }
                  onClick={() =>
                    setCommand({
                      id: user.id,
                      path: "status",
                      body: {
                        status:
                          user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                      },
                    })
                  }
                >
                  {user.status === "ACTIVE" ? "Suspend" : "Activate"}
                </button>
                <AdminAction
                  label="Delete user"
                  confirmation={user.email}
                  disabled={user.id === session?.user.id}
                  description="Soft-delete this account and revoke its sessions. Financial/audit history is retained. Last-admin and organizer-history restrictions are enforced by the server."
                  onConfirm={async (reason) => {
                    try {
                      await apiClient(`/api/admin/users/${user.id}`, z.null(), {
                        method: "DELETE",
                        ...jsonBody({ reason }),
                      });
                    } finally {
                      await invalidateMutation(
                        queryClient,
                        session!.user.id,
                        "adminUser",
                      );
                    }
                  }}
                />
                <Link
                  href={`/admin/audit-logs?entityType=USER&entityId=${user.id}`}
                >
                  Audit history
                </Link>
              </div>
              {update.isError && update.variables?.id === user.id && (
                <FieldError>{update.error.message}</FieldError>
              )}
            </article>
          ))}
        </div>
      )}
      {filters.valid && users.data && (
        <Pagination
          page={filters.values.page}
          totalPages={users.data.meta.totalPages}
          onPageChange={filters.setPage}
        />
      )}
      {command && (
        <UserChangeDialog
          key={command.id + command.path}
          command={command}
          onDismiss={() => setCommand(null)}
          onConfirm={(value) => update.mutateAsync(value)}
        />
      )}
    </section>
  );
}
