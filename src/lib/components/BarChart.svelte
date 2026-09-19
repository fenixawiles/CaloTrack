<script lang="ts">
  import type { DayPoint } from '../nutrition';
  import { friendlyDate } from '../date';

  let {
    data,
    target,
    average,
    height = 180
  }: { data: DayPoint[]; target?: number; average?: number | null; height?: number } = $props();

  let selected = $state<number | null>(null);

  const maxVal = $derived(
    Math.max(target ?? 0, average ?? 0, ...data.map((d) => d.calories), 1) * 1.12
  );
  const w = 320;
  const padB = 18;
  const chartH = $derived(height - padB);
  const barW = $derived((w / Math.max(data.length, 1)) * 0.62);
  const gap = $derived(w / Math.max(data.length, 1));

  function y(v: number) {
    return chartH - (v / maxVal) * chartH;
  }
</script>

<div class="chart">
  <svg viewBox="0 0 {w} {height}" preserveAspectRatio="none" role="img" aria-label="Daily calories">
    {#if target}
      <line x1="0" y1={y(target)} x2={w} y2={y(target)} class="target" stroke-dasharray="4 4" />
    {/if}
    {#if average}
      <line x1="0" y1={y(average)} x2={w} y2={y(average)} class="avg" />
    {/if}
    {#each data as d, i}
      {@const bx = i * gap + (gap - barW) / 2}
      <rect
        x={bx}
        y={d.calories > 0 ? y(d.calories) : chartH - 2}
        width={barW}
        height={d.calories > 0 ? chartH - y(d.calories) : 2}
        rx="3"
        class="bar"
        class:empty={!d.logged}
        class:sel={selected === i}
        role="button"
        tabindex="0"
        onclick={() => (selected = selected === i ? null : i)}
        onkeydown={() => {}}
      />
    {/each}
  </svg>
  {#if selected != null && data[selected]}
    <div class="tip">
      <strong>{friendlyDate(data[selected].date)}</strong>
      <span>{data[selected].logged ? data[selected].calories.toLocaleString() + ' kcal' : 'Not logged'}</span>
    </div>
  {:else}
    <div class="legend">
      {#if target}<span class="k target">Goal</span>{/if}
      {#if average}<span class="k avg">Avg</span>{/if}
      <span class="hint">Tap a bar for detail</span>
    </div>
  {/if}
</div>

<style>
  .chart {
    width: 100%;
  }
  svg {
    width: 100%;
    height: auto;
    display: block;
  }
  .bar {
    fill: var(--accent);
    transition: opacity 0.15s;
  }
  .bar.empty {
    fill: var(--border);
  }
  .bar.sel {
    fill: var(--brand-soft);
  }
  .target {
    stroke: var(--warn);
    stroke-width: 1.5;
  }
  .avg {
    stroke: var(--text-faint);
    stroke-width: 1.5;
  }
  .legend,
  .tip {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 8px;
    font-size: 12px;
    color: var(--text-dim);
    flex-wrap: wrap;
  }
  .tip strong {
    color: var(--text);
  }
  .k {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-weight: 600;
  }
  .k::before {
    content: '';
    width: 14px;
    height: 0;
    border-top: 2px solid;
  }
  .k.target::before {
    border-color: var(--warn);
    border-top-style: dashed;
  }
  .k.avg::before {
    border-color: var(--text-faint);
  }
  .hint {
    color: var(--text-faint);
    margin-left: auto;
  }
</style>
