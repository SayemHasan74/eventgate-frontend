"use client";

import Link, { useLinkStatus } from "next/link";
import { useState, type ComponentProps } from "react";

function NavigationStatus() {
  const { pending } = useLinkStatus();
  return pending ? <span role="status"> Opening…</span> : null;
}

// Fetch the complete detail route only when a visitor shows intent, rather
// than fetching every event in a grid or only prefetching its loading shell.
export function EventLink({
  children,
  ...props
}: Omit<ComponentProps<typeof Link>, "prefetch">) {
  const [intent, setIntent] = useState(false);
  return (
    <Link
      {...props}
      prefetch={intent}
      onMouseEnter={() => setIntent(true)}
      onFocus={() => setIntent(true)}
      onTouchStart={() => setIntent(true)}
    >
      {children}
      <NavigationStatus />
    </Link>
  );
}
