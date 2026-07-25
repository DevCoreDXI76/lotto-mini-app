import { ImageResponse } from 'next/og';

export const alt = 'LottoLab';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BALLS: { n: number; color: string }[] = [
  { n: 3, color: '#FBBF24' },
  { n: 12, color: '#FBBF24' },
  { n: 21, color: '#60A5FA' },
  { n: 28, color: '#60A5FA' },
  { n: 34, color: '#F87171' },
  { n: 41, color: '#F87171' },
];

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffffff',
          gap: 32,
        }}
      >
        <div style={{ display: 'flex', gap: 16 }}>
          {BALLS.map((ball) => (
            <div
              key={ball.n}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: ball.color,
                color: '#ffffff',
                fontSize: 40,
                fontWeight: 700,
              }}
            >
              {ball.n}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', fontSize: 96, fontWeight: 800, color: '#111111' }}>
          LottoLab
        </div>
        <div style={{ display: 'flex', fontSize: 32, color: '#6b7280' }}>
          Lotto Number Generator · Stats · Store Finder
        </div>
      </div>
    ),
    { ...size },
  );
}
