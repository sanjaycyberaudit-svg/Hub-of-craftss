// Learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "util";

// jsdom does not provide TextEncoder/TextDecoder; some deps (e.g. cuid2)
// need them at module load time.
if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
  globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
}
