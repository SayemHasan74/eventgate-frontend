import Link from "next/link";
import { ArrowRight, CircleX } from "lucide-react";
export default function PaymentCancelPage() { return <main className="wrap payment-result"><CircleX size={42} /><p className="eyebrow"><span /> Payment cancelled</p><h1>Checkout <b>paused.</b></h1><p>No payment was completed. Your order remains visible while its reservation is still active.</p><Link className="button button-primary" href="/account">Return to orders <ArrowRight size={16} /></Link></main>; }
