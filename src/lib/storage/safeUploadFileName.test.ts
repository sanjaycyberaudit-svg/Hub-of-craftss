import {
  MEDIA_ALT_MAX_LENGTH,
  sanitizeExtension,
  sanitizeUploadFileName,
  toMediaAltText,
  truncateUnicode,
} from "./safeUploadFileName";

describe("safeUploadFileName", () => {
  it("strips emoji and long captions into a safe ascii filename", () => {
    const input =
      "My First National Media Award 🏆 What started as a passion 7 years ago, with zero business knowledge.jpg";
    const safe = sanitizeUploadFileName(input);
    expect(safe).toMatch(/^[a-z0-9-]+\.jpg$/);
    expect(safe.includes("🏆")).toBe(false);
    expect(safe.length).toBeLessThanOrEqual(90);
  });

  it("keeps allowed extensions and falls back for unknown ones", () => {
    expect(sanitizeExtension("photo.PNG")).toBe("png");
    expect(sanitizeExtension("photo.exe")).toBe("jpg");
  });

  it("truncates alt text to medias.alt varchar limit", () => {
    const long = `${"a".repeat(400)}.jpg`;
    const alt = toMediaAltText(long);
    expect(Array.from(alt).length).toBeLessThanOrEqual(MEDIA_ALT_MAX_LENGTH);
  });

  it("handles empty and unicode-only names", () => {
    expect(sanitizeUploadFileName("🏆🏆.png")).toBe("image.png");
    expect(toMediaAltText("")).toBe("image");
    expect(truncateUnicode("abcd", 3)).toBe("ab…");
  });
});
