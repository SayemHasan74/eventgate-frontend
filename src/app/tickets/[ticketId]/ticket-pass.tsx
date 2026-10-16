"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AdmissionPass } from "@/components/booking-passes";
import { useAuth } from "@/components/auth-provider";
import { ReadFailure } from "@/components/read-failure";
import { getTicket } from "@/lib/ticket-api";
import { privateKey } from "@/lib/query-keys";
export function TicketPass() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { isReady, session } = useAuth();
  const query = useQuery({
    queryKey: privateKey("tickets", session?.user.id, ticketId, {}),
    queryFn: ({ signal }) => getTicket(ticketId, signal),
    enabled: isReady && session?.user.role === "ATTENDEE",
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: "always",
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });
  if (!isReady || query.isLoading) return <p>Loading your pass…</p>;
  if (query.isError)
    return (
      <ReadFailure
        error={query.error}
        retry={() => void query.refetch()}
        fetching={query.isFetching}
        next={`/tickets/${ticketId}`}
      />
    );
  if (!query.data)
    return <p>Sign in as the attendee who purchased this pass.</p>;
  return (
    <div>
      <p>
        <Link className="text-link" href={`/orders/${query.data.orderId}`}>
          Booking, receipt and refund →
        </Link>
      </p>
      <AdmissionPass
        ticket={query.data}
        refreshing={query.isFetching}
        refresh={() => void query.refetch()}
      />
    </div>
  );
}
