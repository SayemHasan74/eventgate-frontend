"use client";
import Form from "next/form";
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
import { userListFilterSchema } from "@/lib/filter-schemas";
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
  const filters = useUrlFilters(userListFilterSchema);
  const qs = new URLSearchParams(
    Object.entries(filters.values).map(([key, value]) => [key, String(value)]),
  );
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
      return invalidateMutation(queryClient, session!.user.id, "adminUser");
    },
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
      <Form scroll={false} action="/admin/users">
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
        <button className="button button-primary">Filter</button>
      </Form>
      {!filters.valid ? (
        <FieldError>{filters.error}</FieldError>
      ) : users.isLoading ? (
        <p>Loading users…</p>
      ) : users.isError ? (
        <p>{users.error.message}</p>
      ) : (
        <div className={[featureStyles["user-list"]].join(" ")}>
          {users.data?.data.map((user) => (
            <article key={user.id}>
              <div>
                <UserCog size={18} />
                <strong>{user.displayName}</strong>
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
