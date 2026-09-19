import { exportAll, importAll, type ImportData } from './db';
import { todayKey } from './date';

const APP = 'CaloTrack';
const FORMAT_VERSION = 1;

export interface BackupFile {
  app: string;
  formatVersion: number;
  exportedAt: string;
  data: ImportData;
}

export async function buildBackup(): Promise<BackupFile> {
  const data = await exportAll();
  return {
    app: APP,
    formatVersion: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    data: data as ImportData
  };
}

export async function downloadBackup(): Promise<void> {
  const backup = await buildBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `calotrack-backup-${todayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface RestoreSummary {
  foods: number;
  entries: number;
  weights: number;
  goals: number;
}

export async function restoreBackup(text: string, mode: 'replace' | 'merge'): Promise<RestoreSummary> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  const obj = parsed as Partial<BackupFile>;
  if (!obj || obj.app !== APP || !obj.data) {
    throw new Error('That does not look like a CaloTrack backup file.');
  }
  const data = obj.data;
  await importAll(data, mode);
  return {
    foods: data.foods?.length ?? 0,
    entries: data.entries?.length ?? 0,
    weights: data.weights?.length ?? 0,
    goals: data.goals?.length ?? 0
  };
}

/** Whether a gentle backup reminder is due (never nags on day one). */
export function backupDue(lastBackupAt: number | undefined, reminderDays: number): boolean {
  if (reminderDays <= 0) return false;
  if (!lastBackupAt) return false; // handled separately once there is data
  const elapsedDays = (Date.now() - lastBackupAt) / (1000 * 60 * 60 * 24);
  return elapsedDays >= reminderDays;
}
