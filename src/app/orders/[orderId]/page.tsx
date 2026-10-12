import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { OrderStatus } from "./order-status";
import styles from "./order-status.module.css";

type OrderPageProps = Readonly<{ params: Promise<{ orderId: string }> }>;

export const metadata: Metadata = { title: "Reservation" };

export default async function OrderPage({ params }: OrderPageProps) {
  const { orderId } = await params;
  return (
    <>
      <section className={`${styles.page} wrap`}>
        <Link className={styles.back} href="/events">
          <ArrowLeft size={16} aria-hidden="true" /> Browse events
        </Link>
        <OrderStatus orderId={orderId} />
      </section>
    </>
  );
}
