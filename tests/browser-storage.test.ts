import { test } from "node:test";
import assert from "node:assert/strict";
import { announceAuthChange, removeBrowserStorage } from "../src/lib/browser-storage";

test("disabled browser storage cannot prevent session initialization or logout", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      get localStorage() { throw new DOMException("Blocked", "SecurityError"); },
      get sessionStorage() { throw new DOMException("Blocked", "SecurityError"); },
    },
  });
  try {
    assert.doesNotThrow(() => removeBrowserStorage("localStorage", "eventgate.session"));
    assert.doesNotThrow(() => removeBrowserStorage("sessionStorage", "eventgate.booking-intent"));
    assert.doesNotThrow(() => announceAuthChange("logout"));
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
