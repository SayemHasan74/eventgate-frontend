import type { Metadata } from "next";
import { BackButton } from "@/components/back-button";

import { OrderStatus } from "./order-status";
import styles from "./order-status.module.css";

type OrderPageProps = Readonly<{ params: Promise<{ orderId: string }> }>;

export const metadata: Metadata = { title: "Booking details" };

export default async function OrderPage({ params }: OrderPageProps) {
  const { orderId } = await params;
  return (
    <>
      <section className={`${styles.page} wrap`}>
        <BackButton className={styles.back} fallback="/orders" />
        <OrderStatus orderId={orderId} />
      </section>
    </>
  );
}
