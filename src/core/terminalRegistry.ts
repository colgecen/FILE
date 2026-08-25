let activePtyId: string | null = null;

export function setActivePtyId(id: string | null): void {
  activePtyId = id;
}

export function getActivePtyId(): string | null {
  return activePtyId;
}

export function writeToActiveTerminal(data: string): boolean {
  const id = activePtyId;
  if (!id) return false;
  const api = window.api;
  if (!api) return false;
  api.ptyWrite(id, data);
  return true;
}