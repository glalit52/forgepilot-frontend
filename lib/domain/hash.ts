/** FNV-1a 64-bit, hex. Deterministic, dependency-free; good enough for a mock hash chain. */
export function fnv1a64(input: string): string {
  let hash = BigInt("0xcbf29ce484222325");
  const prime = BigInt("0x100000001b3");
  const mask = BigInt("0xffffffffffffffff");
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, "0");
}

export interface ChainLink {
  hash: string;
  prevHash: string | null;
}

/** Each record must point at the previous record's hash; the first at null. */
export function verifyChain(records: ChainLink[]): boolean[] {
  return records.map((r, i) =>
    i === 0 ? r.prevHash === null : r.prevHash === records[i - 1].hash,
  );
}
