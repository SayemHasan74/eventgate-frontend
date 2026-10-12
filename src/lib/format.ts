export const formatCurrency = (paisa: number) =>
  Number.isSafeInteger(paisa)
    ? new Intl.NumberFormat("en-BD", {
        style: "currency",
        currency: "BDT",
      }).format(paisa / 100)
    : "Unavailable";
export const formatEventDate = (value: string, time = true) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date unavailable";
  return (
    new Intl.DateTimeFormat("en-BD", {
      timeZone: "Asia/Dhaka",
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(time ? { hour: "numeric", minute: "2-digit" } : {}),
    }).format(date) + (time ? " · Asia/Dhaka" : "")
  );
};
