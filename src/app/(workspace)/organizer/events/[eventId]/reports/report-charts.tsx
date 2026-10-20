"use client";
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/format";
import type { SalesReport, InventoryReport } from "@/lib/event-report-api";
const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--ink)",
  color: "var(--ink)",
};
const ticks = { fill: "var(--soft)", fontSize: 12 };
export function SalesChart({ days }: { days: SalesReport["salesByDay"] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={days}>
        <XAxis dataKey="day" tick={ticks} />
        <YAxis
          tick={ticks}
          tickFormatter={(value) => `৳${Number(value) / 100}`}
          width={85}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => formatMoney(Number(value))}
        />
        <Legend />
        <Bar dataKey="grossPaisa" name="Gross sales (BDT)" fill="var(--pink)" />
        <Bar
          dataKey="bookingRefundsPaisa"
          name="Booking refunds (BDT)"
          fill="var(--soft)"
        />
        <Bar dataKey="netPaisa" name="Net sales (BDT)" fill="var(--cobalt)" />
      </BarChart>
    </ResponsiveContainer>
  );
}
export function InventoryChart({ tiers }: { tiers: InventoryReport["tiers"] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={tiers}>
        <XAxis dataKey="name" tick={ticks} />
        <YAxis allowDecimals={false} tick={ticks} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend />
        <Bar
          dataKey="currentSold"
          name="Current sold (passes)"
          stackId="stock"
          fill="var(--pink)"
        />
        <Bar
          dataKey="currentReserved"
          name="Reserved (passes)"
          stackId="stock"
          fill="var(--cobalt)"
        />
        <Bar
          dataKey="currentAvailable"
          name="Available (passes)"
          stackId="stock"
          fill="var(--soft)"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
