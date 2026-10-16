"use client";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function BackButton({
  fallback,
  className,
}: {
  fallback: "/orders" | "/tickets";
  className?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.replace(fallback);
      }}
    >
      <ArrowLeft size={16} aria-hidden="true" /> Back
    </button>
  );
}
