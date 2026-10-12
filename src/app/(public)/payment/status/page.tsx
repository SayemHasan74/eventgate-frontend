import { PaymentReturnStatus } from "@/components/payment-return-status";
export default function PaymentStatusPage() {
  return <PaymentReturnStatus orderId={null} returnPath="/payment/status" />;
}
