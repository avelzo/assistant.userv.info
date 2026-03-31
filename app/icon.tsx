import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = {
  width: 512,
  height: 512,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '120px',
          background: 'linear-gradient(145deg, #1d4ed8 0%, #312e81 100%)',
          color: '#ffffff',
          fontSize: 230,
          fontWeight: 900,
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
        }}
      >
        A
      </div>
    ),
    {
      ...size,
    }
  );
}
