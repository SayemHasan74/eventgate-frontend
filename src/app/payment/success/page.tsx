import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
export default function PaymentSuccessPage() { return <main className="wrap payment-result"><CheckCircle2 size={42} /><p className="eyebrow"><span /> Payment update</p><h1>Payment <b>received.</b></h1><p>Your payment provider has returned to EventGate. Open your account to see the confirmed order and tickets.</p><Link className="button button-primary" href="/account">View my orders <ArrowRight size={16} /></Link></main>; }
