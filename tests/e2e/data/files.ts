import zlib from 'node:zlib'

/** In-memory binary fixtures for upload tests — see docs/e2e-test-data.md and tests/e2e/data/fixtures.ts for the rationale (no checked-in binary files). */

function pngChunk(tag: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const tagBuf = Buffer.from(tag, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(zlib.crc32(Buffer.concat([tagBuf, data])) >>> 0, 0)
  return Buffer.concat([length, tagBuf, data, crc])
}

/** A genuinely valid, decodable PNG (solid color), not just PNG-extension text. */
export function validPngBuffer(width = 32, height = 32): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr.writeUInt8(8, 8) // bit depth
  ihdr.writeUInt8(2, 9) // color type: truecolor
  ihdr.writeUInt8(0, 10)
  ihdr.writeUInt8(0, 11)
  ihdr.writeUInt8(0, 12)

  const rowBytes = width * 3
  const raw = Buffer.alloc((rowBytes + 1) * height)
  for (let y = 0; y < height; y++) {
    const rowStart = y * (rowBytes + 1)
    raw[rowStart] = 0 // filter: none
    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 3
      raw[px] = (x * 8) % 256
      raw[px + 1] = (y * 8) % 256
      raw[px + 2] = 128
    }
  }
  const idat = zlib.deflateSync(raw)

  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))])
}

/** Not a real image at all — for the "corrupted/wrong content" rejection case. */
export function notAnImageBuffer(): Buffer {
  return Buffer.from('this is not actually image content, just text pretending to be one', 'utf8')
}

/** An SVG containing an embedded <script> and an inline event handler — must be sanitized or rejected. */
export function unsafeSvgBuffer(): Buffer {
  return Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><circle cx="5" cy="5" r="4"/></svg>',
    'utf8',
  )
}

/** An SVG with an XXE external-entity declaration — must be rejected outright. */
export function xxeSvgBuffer(): Buffer {
  return Buffer.from(
    '<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg">&xxe;</svg>',
    'utf8',
  )
}

/** A well-formed, safe SVG — should be accepted (sanitizer must not over-reject legitimate content). */
export function safeSvgBuffer(): Buffer {
  return Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="10" fill="#0f766e"/></svg>',
    'utf8',
  )
}
