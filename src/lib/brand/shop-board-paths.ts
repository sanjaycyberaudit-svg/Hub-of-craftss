/** Forward slant: top-right extends further right than bottom-right (reference sign). */
export function buildForwardSlantPaths(slantPercent: number) {
  const s = slantPercent;
  const br = 100 - s;

  const fill = `M 0,0 L 100,0 L ${br},100 L 0,100 Z`;
  const outer = `M 0.75,0.75 L 99.25,0.75 L ${br + 0.75},99.25 L 0.75,99.25 Z`;
  const inner = `M 2.5,2.5 L 97.5,2.5 L ${br - 1.5},97.5 L 2.5,97.5 Z`;

  return {
    fill,
    outer,
    inner,
    slant: { x1: 99.25, y1: 0.75, x2: br + 0.75, y2: 99.25 },
    /** Extra right padding factor (px) derived from slant % */
    slantPadExtra: Math.round(slantPercent * 0.9),
  };
}
