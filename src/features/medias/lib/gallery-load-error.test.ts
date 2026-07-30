import {
  galleryLoadErrorMessage,
  isAbortLikeError,
} from "./gallery-load-error";

describe("galleryLoadErrorMessage", () => {
  it("maps browser abort text to a friendly message", () => {
    expect(
      galleryLoadErrorMessage(
        Object.assign(new Error("Fetch is aborted"), { name: "AbortError" }),
      ),
    ).toBe("Could not load images. Try again.");
  });

  it("maps timeout text to a friendly message", () => {
    expect(
      galleryLoadErrorMessage(new Error("Request timed out after 30000ms")),
    ).toBe("Could not load images. Try again.");
  });

  it("keeps meaningful non-abort errors", () => {
    expect(galleryLoadErrorMessage(new Error("Unauthorized"))).toBe(
      "Unauthorized",
    );
  });
});

describe("isAbortLikeError", () => {
  it("detects AbortError by name", () => {
    expect(
      isAbortLikeError(
        Object.assign(new Error("The user aborted a request."), {
          name: "AbortError",
        }),
      ),
    ).toBe(true);
  });

  it("ignores ordinary failures", () => {
    expect(isAbortLikeError(new Error("Could not load media library."))).toBe(
      false,
    );
  });
});
