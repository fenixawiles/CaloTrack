<script lang="ts">
  import { currentGoal, dataVersion, navigate } from '../stores';
  import { getAllEntries } from '../db';
  import type { Entry } from '../types';
  import {
    dailySeries,
    rollingAverage,
    daysLoggedIn,
    caloriesByDate,
    monthlySummaries
  } from '../nutrition';
  import { monthLabel, todayKey, monthKey } from '../date';
  import BarChart from '../components/BarChart.svelte';
  import Heatmap from '../components/Heatmap.svelte';

  let entries = $state<Entry[]>([]);
  let range = $state<30 | 90>(30);

  $effect(() => {
    $dataVersion;
    getAllEntries().then((e) => (entries = e));
  });

  const target = $derived($currentGoal?.dailyCalorieTarget);
  const series = $derived(dailySeries(entries, range));
  const avg = $derived(rollingAverage(entries, range));
  const logged = $derived(daysLoggedIn(entries, range));
  const byDate = $derived(caloriesByDate(entries));
  const months = $derived(monthlySummaries(entries).slice().reverse());
  const thisMonth = $derived(months.find((m) => m.key === monthKey(todayKey())));
</script>

<div class="page fade-in">
  <h1 class="page-title">Trends</h1>
  <div class="muted" style="margin-bottom:16px">The rolling average is what matters — a single day never defines it.</div>

  {#if entries.length === 0}
    <div class="empty card" style="padding:30px">
      <div class="big">📈</div>
      <div style="font-weight:600;color:var(--text)">No data yet</div>
      <div class="muted" style="margin-top:4px">Log a few days and your trends will appear here.</div>
    </div>
  {:else}
    <!-- Stat tiles -->
    <div class="tiles">
      <div class="tile card">
        <div class="tval">{avg?.toLocaleString() ?? '—'}</div>
        <div class="tlab">avg kcal / logged day</div>
      </div>
      <div class="tile card">
        <div class="tval">{logged}<span class="of">/{range}</span></div>
        <div class="tlab">days logged</div>
      </div>
    </div>

    <!-- Daily chart -->
    <div class="card block">
      <div class="spread">
        <h3>Daily intake</h3>
        <div class="toggle">
          <button class:active={range === 30} onclick={() => (range = 30)}>30d</button>
          <button class:active={range === 90} onclick={() => (range = 90)}>90d</button>
        </div>
      </div>
      <BarChart data={series} {target} average={avg} />
    </div>

    <!-- This month cumulative -->
    {#if thisMonth}
      <div class="card block">
        <h3>{monthLabel(todayKey())} so far</h3>
        <div class="cumrow">
          <div>
            <div class="cnum">{thisMonth.total.toLocaleString()}</div>
            <div class="clab">cumulative kcal</div>
          </div>
          <div>
            <div class="cnum">{thisMonth.average.toLocaleString()}</div>
            <div class="clab">avg / day</div>
          </div>
          <div>
            <div class="cnum">{thisMonth.daysLogged}</div>
            <div class="clab">days logged</div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Consistency heatmap -->
    <div class="card block">
      <h3>Consistency</h3>
      <div class="muted small">Every square you fill is a win. Gaps are fine.</div>
      <Heatmap {byDate} />
    </div>

    <!-- Monthly history -->
    {#if months.length > 0}
      <div class="section-title">Monthly cumulative</div>
      <div class="card">
        {#each months as m}
          <div class="mrow">
            <div class="mname">{monthLabel(m.key + '-01')}</div>
            <div class="mstats">
              <span><b>{m.total.toLocaleString()}</b> total</span>
              <span>{m.average.toLocaleString()}/day</span>
              <span class="faint">{m.daysLogged}d</span>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <button class="btn btn-ghost btn-block" style="margin-top:16px" onclick={() => navigate('weight')}>
      ⚖️ View weight trend
    </button>
  {/if}
</div>

<style>
  .tiles {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 14px;
  }
  .tile {
    padding: 16px;
    text-align: center;
  }
  .tval {
    font-size: 30px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .tval .of {
    font-size: 18px;
    color: var(--text-faint);
    font-weight: 600;
  }
  .tlab {
    font-size: 12px;
    color: var(--text-dim);
    margin-top: 2px;
  }
  .block {
    padding: 16px;
    margin-bottom: 14px;
  }
  .block h3 {
    font-size: 16px;
    margin-bottom: 12px;
  }
  .small {
    font-size: 12px;
    margin: -6px 0 10px;
  }
  .toggle {
    display: flex;
    background: var(--surface-2);
    border-radius: 10px;
    padding: 3px;
  }
  .toggle button {
    padding: 5px 12px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-dim);
  }
  .toggle button.active {
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow);
  }
  .cumrow {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    text-align: center;
  }
  .cnum {
    font-size: 22px;
    font-weight: 800;
  }
  .clab {
    font-size: 11px;
    color: var(--text-dim);
  }
  .mrow {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 14px;
    border-bottom: 1px solid var(--border);
  }
  .mrow:last-child {
    border-bottom: none;
  }
  .mname {
    font-weight: 600;
  }
  .mstats {
    display: flex;
    gap: 12px;
    font-size: 13px;
    color: var(--text-dim);
  }
  .mstats b {
    color: var(--text);
  }
</style>
