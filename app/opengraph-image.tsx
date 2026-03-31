import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px',
          color: '#ffffff',
          background:
            'radial-gradient(circle at 20% 10%, #5b6ff0 0%, transparent 40%), linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #312e81 100%)',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '24px',
            fontWeight: 600,
            letterSpacing: '-0.01em',
          }}
        >
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '999px',
              backgroundColor: '#60a5fa',
            }}
          />
          Assistant Administratif AI
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '860px' }}>
          <div style={{ fontSize: '72px', lineHeight: 1.03, fontWeight: 800, letterSpacing: '-0.03em' }}>
            Vos courriers administratifs
            <br />
            en 60 sec
          </div>
          <div style={{ fontSize: '34px', color: '#cbd5e1', lineHeight: 1.3 }}>
            Lettre + version email en francais, pretes a copier ou telecharger en PDF.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '26px', color: '#93c5fd' }}>
          <div
            style={{
              border: '1px solid rgba(147,197,253,0.4)',
              borderRadius: '999px',
              padding: '6px 16px',
            }}
          >
            1 essai gratuit
          </div>
          <span>assistant.userv.info</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
