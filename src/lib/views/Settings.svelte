<script lang="ts">
  import { settings, updateSettings, navigate, toast, bumpData, loadAll } from '../stores';
  import { downloadBackup, restoreBackup } from '../backup';
  import type { Units, ThemePref } from '../types';
  import Modal from '../components/Modal.svelte';
  import { friendlyDate, toKey } from '../date';

  const APP_VERSION = '1.0.0';

  let fileInput: HTMLInputElement;
  let pendingText = $state<string | null>(null);
  let importOpen = $state(false);

  async function doExport() {
    await downloadBackup();
    await updateSettings({ lastBackupAt: Date.now() });
    toast('Backup downloaded', 'success');
  }

  function pickFile() {
    fileInput.click();
  }
  async function onFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    pendingText = await file.text();
    importOpen = true;
    (e.target as HTMLInputElement).value = '';
  }
  async function runImport(mode: 'replace' | 'merge') {
    if (!pendingText) return;
    try {
      const s = await restoreBackup(pendingText, mode);
      importOpen = false;
      pendingText = null;
      await loadAll();
      bumpData();
      toast(`Restored ${s.foods} foods, ${s.entries} entries`, 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  }

  const lastBackup = $derived(
    $settings.lastBackupAt ? friendlyDate(toKey(new Date($settings.lastBackupAt))) : 'never'
  );

  function setUnits(u: Units) {
    updateSettings({ units: u });
  }
  function setTheme(t: ThemePref) {
    updateSettings({ theme: t });
  }
</script>

<div class="page fade-in">
  <h1 class="page-title">Settings</h1>

  <!-- Quick links -->
  <div class="section-title">Manage</div>
  <div class="card links">
    <button class="link" onclick={() => navigate('goals')}><span>🎯 Goals & targets</span><span class="chev">›</span></button>
    <button class="link" onclick={() => navigate('weight')}><span>⚖️ Weight tracking</span><span class="chev">›</span></button>
    <button class="link" onclick={() => navigate('foods')}><span>🍎 Food library</span><span class="chev">›</span></button>
    <button class="link" onclick={() => navigate('trends')}><span>📈 Trends & history</span><span class="chev">›</span></button>
  </div>

  <!-- Units -->
  <div class="section-title">Units</div>
  <div class="card pad">
    <div class="seg">
      <button class:active={$settings.units === 'imperial'} onclick={() => setUnits('imperial')}>Imperial (lb)</button>
      <button class:active={$settings.units === 'metric'} onclick={() => setUnits('metric')}>Metric (kg)</button>
    </div>
  </div>

  <!-- Theme -->
  <div class="section-title">Appearance</div>
  <div class="card pad">
    <div class="seg three">
      <button class:active={$settings.theme === 'system'} onclick={() => setTheme('system')}>System</button>
      <button class:active={$settings.theme === 'light'} onclick={() => setTheme('light')}>Light</button>
      <button class:active={$settings.theme === 'dark'} onclick={() => setTheme('dark')}>Dark</button>
    </div>
  </div>

  <!-- Backup -->
  <div class="section-title">Backup & data</div>
  <div class="card pad stack">
    <p class="muted small" style="margin:0">
      Your data lives only on this device. Export a backup regularly — especially before clearing your browser or switching phones.
    </p>
    <div class="row" style="gap:10px">
      <button class="btn btn-primary" style="flex:1" onclick={doExport}>⬇️ Export backup</button>
      <button class="btn btn-ghost" style="flex:1" onclick={pickFile}>⬆️ Import</button>
    </div>
    <div class="spread small muted">
      <span>Last backup: {lastBackup}</span>
    </div>
    <div>
      <label>Remind me to back up every</label>
      <select value={$settings.backupReminderDays} onchange={(e) => updateSettings({ backupReminderDays: Number((e.target as HTMLSelectElement).value) })}>
        <option value={7}>7 days</option>
        <option value={14}>14 days</option>
        <option value={30}>30 days</option>
        <option value={0}>Never</option>
      </select>
    </div>
  </div>
  <input bind:this={fileInput} type="file" accept="application/json,.json" onchange={onFile} hidden />

  <!-- About -->
  <div class="section-title">About</div>
  <div class="card pad">
    <div class="spread"><span>CaloTrack</span><span class="muted">v{APP_VERSION}</span></div>
    <p class="muted small" style="margin:10px 0 0">
      Free and yours. No accounts, no ads, no paywalls — every feature is here for good. Nutrition lookups come from the open
      <b>Open Food Facts</b> database. Missing a day is completely fine; consistency over time is what counts.
    </p>
  </div>
</div>

<Modal bind:open={importOpen} title="Import backup">
  <p class="muted" style="margin-top:0">How should this backup be applied?</p>
  <div class="stack">
    <button class="btn btn-ghost" onclick={() => runImport('merge')}>
      <div style="text-align:left">
        <div style="font-weight:700">Merge</div>
        <div class="small muted">Add/update from the file, keep everything you have now.</div>
      </div>
    </button>
    <button class="btn btn-danger" onclick={() => runImport('replace')}>
      <div style="text-align:left">
        <div style="font-weight:700">Replace all</div>
        <div class="small" style="opacity:0.8">Wipe current data and restore only from this file.</div>
      </div>
    </button>
  </div>
</Modal>

<style>
  .pad {
    padding: 14px;
  }
  .small {
    font-size: 12px;
  }
  .links {
    overflow: hidden;
  }
  .link {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 15px 14px;
    border-bottom: 1px solid var(--border);
    font-weight: 600;
    text-align: left;
  }
  .link:last-child {
    border-bottom: none;
  }
  .chev {
    color: var(--text-faint);
    font-size: 20px;
  }
  .seg {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    background: var(--surface-2);
    border-radius: 12px;
    padding: 4px;
  }
  .seg.three {
    grid-template-columns: 1fr 1fr 1fr;
  }
  .seg button {
    padding: 9px;
    border-radius: 9px;
    font-weight: 600;
    color: var(--text-dim);
    font-size: 14px;
  }
  .seg button.active {
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow);
  }
</style>
