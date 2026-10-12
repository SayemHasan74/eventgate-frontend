"use client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { Skeleton } from "@/components/ui";
import { ErrorState } from "@/components/ui/interactive";
import { getProfile } from "@/lib/profile-api";
import { privateKey } from "@/lib/query-keys";
import { ProfileForm } from "@/components/profile-form";
export function ProfileEditor() {
  const { session } = useAuth();
  const query = useQuery({
    queryKey: privateKey("users", session?.user.id, "me", {}),
    queryFn: getProfile,
    enabled: !!session,
  });
  return (
    <section>
      <h1>My profile</h1>
      {query.isPending ? (
        <Skeleton />
      ) : query.isError ? (
        <ErrorState
          message={query.error.message}
          retry={() => void query.refetch()}
        />
      ) : (
        <ProfileForm key={query.data.id} profile={query.data} />
      )}
    </section>
  );
}
