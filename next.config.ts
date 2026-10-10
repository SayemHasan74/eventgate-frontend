import type { NextConfig } from "next";

// EventGate uses CSS Modules and global CSS, not Tailwind. The starter's
// Tailwind/Turbopack CSS override caused production CSS assets to be served as
// page HTML on Vercel, leaving the application pages unstyled.
const nextConfig: NextConfig = {};

export default nextConfig;
