import { append, type LogEntry } from './frame/console';

/** The frame's warnings and errors since the last navigation. */
type Listener = () => void;

let entries: LogEntry[] = [];
const listeners = new Set<Listener>();

export function getLogs(): LogEntry[] {
  return entries;
}

export function subscribeLogs(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function addLog(entry: LogEntry): void {
  entries = append(entries, entry);
  emit();
}

export function clearLogs(): void {
  entries = [];
  emit();
}
