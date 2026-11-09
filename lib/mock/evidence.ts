import type { Actor, EvidenceEvent, EvidenceRecord, MockDb } from "@/lib/schemas";
import { fnv1a64 } from "@/lib/domain/hash";

/** Append a hash-chained EvidenceRecord for a task. Every action calls this. */
export function appendEvidence(
  db: MockDb,
  taskId: string,
  event: EvidenceEvent,
  actor: Actor,
  payload: Record<string, unknown> = {},
  at: number = Date.now(),
): EvidenceRecord {
  const chain = db.evidenceRecords.filter((e) => e.taskId === taskId);
  const prev = chain[chain.length - 1] ?? null;
  const atIso = new Date(at).toISOString().replace(/\.\d{3}Z$/, "Z");
  const prevHash = prev?.hash ?? null;
  const hash = fnv1a64(`${prevHash ?? ""}|${taskId}|${event}|${actor.type}:${actor.id}|${atIso}|${JSON.stringify(payload)}`);
  const record: EvidenceRecord = {
    id: `ev_${taskId}_${String(chain.length).padStart(2, "0")}_${hash.slice(0, 4)}`,
    taskId,
    event,
    actor,
    at: atIso,
    payload,
    hash,
    prevHash,
  };
  db.evidenceRecords.push(record);
  return record;
}

export function toIso(ms: number) {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
}
