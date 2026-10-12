import { test } from "node:test";
import assert from "node:assert/strict";
import { ScanGate, validQrToken } from "../src/lib/scan-gate";
import {
  CameraSession,
  cameraError,
  stopCameraTracks,
} from "../src/lib/camera-session";
import { checkInResultSchema } from "../src/lib/organizer-api";

test("opaque tokens only; one submission remains held until explicit dismissal", () => {
  for (const value of [
    "https://example.com",
    "a".repeat(44),
    "!".repeat(43),
    "",
  ]) {
    assert.equal(validQrToken(value), false);
  }
  const token = "a".repeat(43);
  const gate = new ScanGate();
  assert.equal(gate.claim(token), "ready");
  assert.equal(gate.claim(token), "busy");
  assert.equal(gate.reset(), false);
  gate.finish();
  assert.equal(gate.claim(token), "duplicate");
  assert.equal(gate.claim("b".repeat(43)), "held");
  assert.equal(gate.reset(), true);
  assert.equal(gate.claim(token), "ready");
});

test("invalid content is held and cleanup releases every track even if one fails", () => {
  const gate = new ScanGate();
  assert.equal(gate.claim("https://example.com"), "invalid");
  assert.equal(gate.claim("a".repeat(43)), "held");
  let stopped = 0;
  stopCameraTracks({
    getTracks: () => [
      {
        stop: () => {
          throw new Error("already detached");
        },
      },
      {
        stop: () => {
          stopped++;
        },
      },
    ],
  });
  assert.equal(stopped, 1);
  const camera = new CameraSession();
  assert.equal(camera.snapshot(), "stopped");
  camera.stop();
  assert.equal(camera.snapshot(), "stopped");
  assert.match(
    cameraError(new DOMException("denied", "NotAllowedError")),
    /manual input/,
  );
});

test("wrong-event responses cannot expose attendee details or claim accepted entry", () => {
  assert.deepEqual(
    checkInResultSchema.parse({
      resultCode: "WRONG_EVENT",
      ticket: { attendee: { displayName: "Foreign attendee" } },
    }),
    { resultCode: "WRONG_EVENT" },
  );
  assert.equal(
    checkInResultSchema.safeParse({ resultCode: "ACCEPTED" }).success,
    false,
  );
});
