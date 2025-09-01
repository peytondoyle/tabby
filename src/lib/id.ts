// src/lib/id.ts
export function isLocalId(id?: string | null): boolean {
  return !!id && /^local-/.test(id);
}
