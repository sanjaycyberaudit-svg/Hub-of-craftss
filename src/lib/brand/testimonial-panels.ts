/**
 * Light logo-derived pastels for customer testimonial panels.
 * Inspired by craft banner blocks (lavender · lime · rose) + logo accents.
 * Tones are mid-light so white text stays readable.
 */
export const testimonialPanels = [
  {
    id: "lavender",
    /** Logo peacock / purple wash */
    bg: "#987dc7",
    shadow: "rgba(152, 125, 199, 0.45)",
  },
  {
    id: "lime",
    /** Logo Crafts “C” / craft green */
    bg: "#c0d55a",
    shadow: "rgba(192, 213, 90, 0.45)",
  },
  {
    id: "rose",
    /** Logo magenta feather — light rose */
    bg: "#e88ab0",
    shadow: "rgba(232, 138, 176, 0.45)",
  },
  {
    id: "cyan",
    /** Logo “Hub of” sky oval */
    bg: "#7ec8d8",
    shadow: "rgba(126, 200, 216, 0.45)",
  },
  {
    id: "peach",
    /** Logo palette / scissors orange */
    bg: "#f0b078",
    shadow: "rgba(240, 176, 120, 0.45)",
  },
  {
    id: "gold",
    /** Soft gold accent */
    bg: "#e0c86a",
    shadow: "rgba(224, 200, 106, 0.45)",
  },
] as const;

export type TestimonialPanel = (typeof testimonialPanels)[number];

export function testimonialPanelAt(index: number): TestimonialPanel {
  return testimonialPanels[index % testimonialPanels.length]!;
}
