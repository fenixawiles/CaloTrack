<script lang="ts">
  import { settings, currentGoal, dataVersion, bumpData, toast } from '../stores';
  import { getWeights, saveWeight, deleteWeight, uid } from '../db';
  import type { WeightRecord } from '../types';
  import { todayKey, friendlyDate } from '../date';
  import { kgToDisplay, displayToKg, weightUnitLabel, formatWeight } from '../units';
  import LineChart from '../components/LineChart.svelte';
  import Modal from '../components/Modal.svelte';

  let weights = $state<WeightRecord[]>([]);

  $effect(() => {
    $dataVersion;
    getWeights().then((w) => (weights = w));
  });

  const unit = $derived($settings.units);
  const latest = $derived(weights.length ? weights[weights.length - 1] : null);
  const first = $derived(weights.length ? weights[0] : null);

  const target = $derived($currentGoal?.targetWeightKg);
  const startW = $derived($currentGoal?.startWeightKg ?? first?.value);

  const changeKg = $derived(latest && first ? latest.value - first.value : 0);

  const points = $derived(
    weights.map((w) => ({ x: w.date, y: kgToDisplay(w.value, unit) }))
  );
  const targetDisplay = $derived(target != null ? kgToDisplay(target, unit) : undefined);

  // progress toward goal
  const progressPct = $derived(
    target != null && startW != null && latest && startW !== target
      ? Math.max(0, Math.min(100, ((startW - latest.value) / (startW - target)) * 100))
      : null
  );

  // ---- logging ----
  let logOpen = $state(false);
  let logDate = $state(todayKey());
  let logValue = $state<number | string>('');

  function openLog() {
    logDate = todayKey();
    logValue = latest ? Number(kgToDisplay(latest.value, unit).toFixed(1)) : '';
    logOpen = true;
  }
  async function saveLog() {
    const v = Number(logValue);
    if (!(v > 0)) return;
    // one record per day: reuse id if same date exists
    const existing = weights.find((w) => w.date === logDate);
    const rec: WeightRecord = {
      id: existing?.id ?? uid(),
      date: logDate,
      value: displayToKg(v, unit),
      loggedAt: Date.now()
    };
    await saveWeight(rec);
    logOpen = false;
    bumpData();
    toast('Weight logged', 'success');
  }
  async function remove(w: WeightRecord) {
    if (!confirm(`Delete weight from ${friendlyDate(w.date)}?`)) return;
    await deleteWeight(w.id);
    bumpData();
  }
</script>

<div class="page fade-in">
  <div class="spread" style="margin-bottom:14px">
    <h1 class="page-title">Weight</h1>
    <button class="btn btn-primary" onclick={openLog}>＋ Log</button>
  </div>

  {#if weights.length === 0}
    <div class="empty card" style="padding:30px">
      <div class="big">⚖️</div>
      <div style="font-weight:600;color:var(--text)">No weigh-ins yet</div>
      <div class="muted" style="margin:6px 0 14px">Track weight at your own pace — daily, weekly, whenever.</div>
      <button class="btn btn-primary" onclick={openLog}>Log your weight</button>
    </div>
  {:else}
    <!-- Current -->
    <div class="card cur">
      <div class="curnum">{formatWeight(latest!.value, unit)}</div>
      <div class="curmeta">
        {#if changeKg !== 0}
          <span class:down={changeKg < 0} class:up={changeKg > 0}>
            {changeKg < 0 ? '▼' : '▲'} {formatWeight(Math.abs(changeKg), unit)}
          </span>
          <span class="faint">since {friendlyDate(first!.date)}</span>
        {:else}
          <span class="faint">First entry logged</span>
        {/if}
      </div>
    </div>

    <!-- Progress toward goal -->
    {#if target != null && progressPct != null}
      <div class="card block">
        <div class="spread" style="margin-bottom:8px">
          <span class="muted">Goal: {formatWeight(target, unit)}</span>
          <span class="pct">{Math.round(progressPct)}%</span>
        </div>
        <div class="track"><div class="fill" style="width:{progressPct}%"></div></div>
      </div>
    {/if}

    <!-- Chart -->
    <div class="card block">
      <h3>Trend ({weightUnitLabel(unit)})</h3>
      <LineChart {points} target={targetDisplay} color="var(--brand-soft)" />
    </div>

    <!-- History -->
    <div class="section-title">History</div>
    <div class="card">
      {#each [...weights].reverse() as w (w.id)}
        <div class="wrow">
          <span>{friendlyDate(w.date)}</span>
          <span class="wval">{formatWeight(w.value, unit)}</span>
          <button class="del" onclick={() => remove(w)} aria-label="Delete">🗑️</button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<Modal bind:open={logOpen} title="Log weight">
  <div class="stack">
    <div>
      <label>Date</label>
      <input type="date" bind:value={logDate} max={todayKey()} />
    </div>
    <div>
      <label>Weight ({weightUnitLabel(unit)})</label>
      <input type="number" inputmode="decimal" step="0.1" bind:value={logValue} placeholder={weightUnitLabel(unit)} autofocus />
    </div>
    <button class="btn btn-primary btn-block" onclick={saveLog} disabled={!(Number(logValue) > 0)}>Save</button>
  </div>
</Modal>

<style>
  .cur {
    padding: 20px;
    text-align: center;
    margin-bottom: 14px;
  }
  .curnum {
    font-size: 38px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .curmeta {
    margin-top: 4px;
    font-size: 14px;
    display: flex;
    gap: 8px;
    justify-content: center;
  }
  .down {
    color: var(--success);
    font-weight: 700;
  }
  .up {
    color: var(--warn);
    font-weight: 700;
  }
  .block {
    padding: 16px;
    margin-bottom: 14px;
  }
  .block h3 {
    font-size: 16px;
    margin-bottom: 12px;
  }
  .pct {
    font-weight: 700;
    color: var(--accent);
  }
  .track {
    height: 10px;
    border-radius: 999px;
    background: var(--surface-2);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--accent);
    border-radius: 999px;
    transition: width 0.4s ease;
  }
  .wrow {
    display: grid;
    grid-template-columns: 1fr auto 34px;
    align-items: center;
    gap: 10px;
    padding: 11px 14px;
    border-bottom: 1px solid var(--border);
  }
  .wrow:last-child {
    border-bottom: none;
  }
  .wval {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .del {
    font-size: 15px;
    opacity: 0.7;
  }
</style>
