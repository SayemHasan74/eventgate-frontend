export const validQrToken = (value: string) =>
  /^[A-Za-z0-9_-]{43}$/.test(value);
// Tokens stay in memory only. No logs, storage, URL navigation, or optimistic admission.
export class ScanGate {
  private busy = false;
  private held = false;
  private previous: string | null = null;
  claim(value: string): "ready" | "invalid" | "busy" | "duplicate" | "held" {
    if (this.busy) return "busy";
    if (this.held) return value === this.previous ? "duplicate" : "held";
    this.held = true;
    if (!validQrToken(value)) return "invalid";
    this.previous = value;
    this.busy = true;
    return "ready";
  }
  finish() {
    this.busy = false;
  }
  reset() {
    if (this.busy) return false;
    this.held = false;
    this.previous = null;
    return true;
  }
}
