// Takes an hex string and returns a 0x-prefixed hex string with an even length.
export function toEvenLengthHex(hex: string): string {
    if (!hex.startsWith('0x'))
        hex = `0x${hex}`
    return hex.length % 2 === 0 ? hex : `0x0${hex.slice(2)}`
}

export function toHexPrefixed(buf: Uint8Array): string {
    return "0x" + Array.from(buf)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}