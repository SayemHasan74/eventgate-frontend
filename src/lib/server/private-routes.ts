const id =
  "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
const routes: Array<[string, string]> = [
  ["GET|POST", "orders"],
  ["GET", `orders/${id}`],
  ["POST", `orders/${id}/cancel`],
  ["GET|PATCH", "users/me"],
  ["GET", "tickets"],
  ["GET", `tickets/${id}(/qr)?`],
  ["GET|POST", "organizer/events"],
  ["PATCH|DELETE", `organizer/events/${id}`],
  ["POST", `organizer/events/${id}/(publish|cancel)`],
  ["POST", `organizer/events/${id}/ticket-tiers`],
  ["PATCH|DELETE", `organizer/events/${id}/ticket-tiers/${id}`],
  ["GET|POST", `organizer/events/${id}/check-ins`],
  ["GET", `organizer/events/${id}/reports/(orders|statistics)`],
  ["GET", "admin/users"],
  ["PATCH", `admin/users/${id}/(role|status)`],
  ["DELETE", `admin/users/${id}`],
  ["GET", "admin/reports/(statistics|operations|audit-logs)"],
  ["GET", "admin/refunds"],
  ["PATCH", `admin/refunds/${id}`],
  ["POST", `admin/refunds/${id}/retry`],
  ["GET", "refund-requests"],
  ["POST", `orders/${id}/refund-requests`],
  ["POST", `payments/orders/${id}/checkout`],
  ["GET", `payments/attempts/${id}`],
];
export const isPrivateRouteAllowed = (method: string, path: string) =>
  routes.some(
    ([methods, pattern]) =>
      methods.split("|").includes(method) &&
      new RegExp("^" + pattern + "$").test(path),
  );
