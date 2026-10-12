import { PaymentReturnStatus } from "@/components/payment-return-status";
import { paymentReturnId } from "@/lib/payment-return-id";
export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return (
    <PaymentReturnStatus
      orderId={paymentReturnId(query.orderId)}
      returnPath="/payment/success"
    />
  );
}
