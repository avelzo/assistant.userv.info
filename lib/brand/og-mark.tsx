export const BRAND_PRIMARY = '#2c5850';
export const BRAND_PAPER = '#fffdf8';

const PEN_PATHS = [
  'M12 20h9',
  'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z',
] as const;

type OgBrandMarkProps = {
  size: number;
  radius?: number;
};

export function OgBrandMark({ size, radius }: OgBrandMarkProps) {
  const glyph = Math.round(size * 0.5);
  const corner = radius ?? Math.round(size * 0.22);

  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: corner,
        background: BRAND_PRIMARY,
      }}
    >
      <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none">
        {PEN_PATHS.map((d) => (
          <path
            key={d}
            d={d}
            stroke={BRAND_PAPER}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </div>
  );
}
