import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default async function Icon() {
  const fontData = await fetch(
    new URL('./fonts/avathe.otf', import.meta.url)
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'black',
          borderRadius: '50%',
          color: '#D8163F',
          fontSize: 18,
          fontFamily: 'Avathe',
        }}
      >
        IX
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Avathe',
          data: fontData,
          style: 'normal',
        },
      ],
    }
  );
}
