import { WorkspaceQuery } from "@/components/workspace-query";
import { refundDetailSchema } from "@/lib/refund-api";
import { RefundDetail } from "./refund-detail";
export default async function RefundPage({
  params,
}: {
  params: Promise<{ refundId: string }>;
}) {
  const { refundId } = await params;
  return (
    <WorkspaceQuery
      path={`refunds/refund-requests/${encodeURIComponent(refundId)}`}
      domain="refunds"
      resource={refundId}
      schema={refundDetailSchema}
    >
      <RefundDetail refundId={refundId} />
    </WorkspaceQuery>
  );
}
