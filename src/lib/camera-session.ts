import type { IScannerControls } from "@zxing/browser";
export function stopCameraTracks(stream: {
  getTracks: () => Array<{ stop: () => void }>;
}) {
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      /* Continue releasing the remaining tracks. */
    }
  }
}
export class CameraSession {
  private generation = 0;
  private stream: MediaStream | null = null;
  private controls: IScannerControls | null = null;
  private state: "stopped" | "starting" | "running" = "stopped";
  private listeners = new Set<() => void>();
  snapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(state: typeof this.state) {
    this.state = state;
    for (const listener of this.listeners) listener();
  }
  stop() {
    this.generation++;
    try {
      this.controls?.stop();
    } catch {
      /* Always release tracks even if decoder cleanup fails. */
    } finally {
      this.controls = null;
      if (this.stream) stopCameraTracks(this.stream);
      this.stream = null;
      this.publish("stopped");
    }
  }
  async start(
    video: HTMLVideoElement,
    deviceId: string,
    onScan: (text: string) => void,
  ) {
    this.stop();
    const version = this.generation;
    this.publish("starting");
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      if (version !== this.generation) return false;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: "environment" } },
      });
      if (version !== this.generation) {
        stopCameraTracks(stream);
        return false;
      }
      this.stream = stream;
      const controls = await new BrowserQRCodeReader().decodeFromStream(
        stream,
        video,
        (result) => {
          if (result && version === this.generation) onScan(result.getText());
        },
      );
      if (version !== this.generation) {
        try {
          controls.stop();
        } finally {
          stopCameraTracks(stream);
        }
        return false;
      }
      this.controls = controls;
      this.publish("running");
      return true;
    } catch (error) {
      if (version !== this.generation) return false;
      this.stop();
      throw error;
    }
  }
}
export function cameraError(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  if (["NotAllowedError", "SecurityError"].includes(name))
    return "Camera permission was denied. Allow camera access in browser/site settings or use manual input. Camera access requires HTTPS or localhost.";
  if (name === "NotFoundError")
    return "No camera was found. Connect a camera or use manual input.";
  if (name === "NotReadableError")
    return "The camera is busy or unavailable. Close other camera apps, then try again, or use manual input.";
  if (name === "OverconstrainedError")
    return "That camera is no longer available. Choose the rear-camera preference or another device.";
  return "Camera scanning could not start. Stop and retry, or use manual input.";
}
