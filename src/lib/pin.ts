import type { Settings } from '../types'

/** SHA-256 via Web Crypto where available (https, localhost), else a plain JS fallback. */
export async function sha256Hex(msg: string): Promise<string> {
  try {
    if (globalThis.crypto?.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg))
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
    }
  } catch { /* fall through */ }
  return sha256Js(msg)
}

function sha256Js(input: string): string {
  const rotr = (v: number, a: number) => (v >>> a) | (v << (32 - a))
  const maxWord = 2 ** 32
  const words: number[] = []
  let hash: number[] = []
  const k: number[] = []
  let primeCounter = 0
  const isComposite: Record<number, boolean> = {}
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) isComposite[i] = true
      hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0
      k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0
    }
  }
  let ascii = unescape(encodeURIComponent(input))
  const bitLength = ascii.length * 8
  ascii += '\x80'
  while ((ascii.length % 64) - 56) ascii += '\x00'
  for (let i = 0; i < ascii.length; i++) {
    words[i >> 2] = (words[i >> 2] ?? 0) | (ascii.charCodeAt(i) << (((3 - i) % 4) * 8))
  }
  words[words.length] = (bitLength / maxWord) | 0
  words[words.length] = bitLength
  for (let j = 0; j < words.length;) {
    const w = words.slice(j, (j += 16))
    const oldHash = hash
    hash = hash.slice(0, 8)
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2]
      const a = hash[0], e = hash[4]
      w[i] = i < 16 ? w[i] : (w[i - 16] + (rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10))) | 0
      const t1 = hash[7] + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & hash[5]) ^ (~e & hash[6])) + k[i] + w[i]
      const t2 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]))
      hash = [(t1 + t2) | 0].concat(hash)
      hash[4] = (hash[4] + t1) | 0
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0
  }
  let out = ''
  for (let i = 0; i < 8; i++) for (let j = 3; j + 1; j--) out += ((hash[i] >> (j * 8)) & 255).toString(16).padStart(2, '0')
  return out
}

function randomSalt(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin)
}

export async function makePin(pin: string): Promise<Pick<Settings, 'pinHash' | 'pinSalt' | 'pinLength'>> {
  const pinSalt = randomSalt()
  return { pinSalt, pinHash: await sha256Hex(pinSalt + ':' + pin), pinLength: pin.length }
}

export async function verifyPin(pin: string, s: Pick<Settings, 'pinHash' | 'pinSalt'>): Promise<boolean> {
  if (!s.pinHash || !s.pinSalt) return true
  return (await sha256Hex(s.pinSalt + ':' + pin)) === s.pinHash
}

/** Failed-attempt cooldown, kept across reloads. */
const FAIL_KEY = 'gym-pin-fails'
export function failState(): { count: number; until: number } {
  try { return JSON.parse(localStorage.getItem(FAIL_KEY) || '{"count":0,"until":0}') } catch { return { count: 0, until: 0 } }
}
export function recordFail(): { count: number; until: number } {
  const f = failState()
  const count = f.count + 1
  const until = count >= 5 ? Date.now() + 30000 * Math.pow(2, Math.min(4, count - 5)) : 0
  const next = { count, until }
  try { localStorage.setItem(FAIL_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  return next
}
export function clearFails() {
  try { localStorage.removeItem(FAIL_KEY) } catch { /* ignore */ }
}
