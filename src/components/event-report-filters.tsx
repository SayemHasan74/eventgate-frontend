"use client";
import { QueryFilterForm } from "@/components/url-filters";
import { Field, Input, Select, Button, FilterBar } from "./ui";
export function EventReportFilters({
  values,
  tiers,
  search = false,
}: {
  values: {
    status?: string;
    tierId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  };
  tiers: Array<{ id: string; name: string; deletedAt: string | null }>;
  search?: boolean;
}) {
  return (
    <QueryFilterForm key={JSON.stringify(values)}>
      <input type="hidden" name="page" value="1" />
      <FilterBar>
        <Field label="From (Bangladesh date)">
          <Input type="date" name="startDate" defaultValue={values.startDate} />
        </Field>
        <Field label="Through (Bangladesh date)">
          <Input type="date" name="endDate" defaultValue={values.endDate} />
        </Field>
        <Field label="Current order status">
          <Select name="status" defaultValue={values.status ?? ""}>
            <option value="">All statuses</option>
            {[
              "PENDING_PAYMENT",
              "PAID",
              "REFUNDED",
              "CANCELLED",
              "EXPIRED",
            ].map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ticket tier">
          <Select name="tierId" defaultValue={values.tierId ?? ""}>
            <option value="">All tiers</option>
            {values.tierId &&
              !tiers.some((tier) => tier.id === values.tierId) && (
                <option value={values.tierId}>
                  Selected tier (unavailable)
                </option>
              )}
            {tiers.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.name}
                {tier.deletedAt ? " (historical)" : ""}
              </option>
            ))}
          </Select>
        </Field>
        {search && (
          <Field label="Order guest or tier">
            <Input
              type="search"
              name="search"
              maxLength={120}
              defaultValue={values.search}
            />
          </Field>
        )}
        <Button type="submit" variant="primary">
          Apply filters
        </Button>
      </FilterBar>
    </QueryFilterForm>
  );
}
