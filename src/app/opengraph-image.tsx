import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'CheckAm - Check am before you buy'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const logoData = await fetch(
    new URL('../../public/logo-512.png', import.meta.url)
  ).then(res => res.arrayBuffer())

  const uint8 = new Uint8Array(logoData)
  let binary = ''
  for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i])
  const logoSrc = `data:image/png;base64,${btoa(binary)}`

  return new ImageResponse(
    (
      <div style={{
        // Charcoal, not the brand green: the logo is a green disc on
        // transparency, so on a green field the disc vanishes and only the
        // white checkmark floats.
        background: '#1A1A1A',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '48px',
        padding: '80px',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={180} height={180} alt="" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ color: 'white', fontSize: '96px', fontWeight: 700, lineHeight: 1 }}>CheckAm</div>
          <div style={{ color: '#BBF7D0', fontSize: '36px', fontWeight: 400 }}>Check am before you buy</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
