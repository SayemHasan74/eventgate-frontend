import { RefundDetail } from "./refund-detail";
export default async function RefundPage({
  params,
}: {
  params: Promise<{ refundId: string }>;
}) {
  const { refundId } = await params;
  return <RefundDetail refundId={refundId} />;
}
