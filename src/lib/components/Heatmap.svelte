<script lang="ts">
  import { lastNDays, fromKey, friendlyDate } from '../date';

  let {
    byDate,
    weeks = 15
  }: { byDate: Map<string, number>; weeks?: number } = $props();

  let selected = $state<string | null>(null);

  // Align so the grid ends on today and each column is a week (Sun start).
  const totalDays = $derived(weeks * 7);
  const days = $derived(lastNDays(totalDays));

  // Pad the front so the first cell aligns to Sunday.
  const leadPad = $derived(days.length ? fromKey(days[0]).getDay() : 0);

  const maxCal = $derived(Math.max(1, ...[...byDate.values()]));

  function level(date: string): number {
    const c = byDate.get(date);
    if (c == null) return 0;
    if (c === 0) return 0;
    const r = c / maxCal;
    if (r < 0.4) return 1;
    if (r < 0.7) return 2;
    if (r < 0.95) return 3;
    return 4;
  }
</script>

<div class="heat">
  <div class="grid" style="grid-template-rows: repeat(7, 1fr)">
    {#each Array(leadPad) as _}
      <span class="cell pad"></span>
    {/each}
    {#each days as d}
      <button
        class="cell lvl{level(d)}"
        class:sel={selected === d}
        aria-label="{d}"
        onclick={() => (selected = selected === d ? null : d)}
      ></button>
    {/each}
  </div>
  <div class="foot">
    {#if selected}
      <span><strong>{friendlyDate(selected)}</strong> · {(byDate.get(selected) ?? 0).toLocaleString()} kcal</span>
    {:else}
      <span class="scale">
        Less
        <i class="lvl0"></i><i class="lvl1"></i><i class="lvl2"></i><i class="lvl3"></i><i class="lvl4"></i>
        More
      </span>
    {/if}
  </div>
</div>

<style>
  .grid {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    gap: 3px;
  }
  .cell {
    aspect-ratio: 1;
    border-radius: 3px;
    background: var(--surface-2);
    padding: 0;
    border: none;
  }
  .cell.pad {
    background: transparent;
  }
  .cell.sel {
    outline: 2px solid var(--accent);
  }
  .lvl0 {
    background: var(--surface-2);
  }
  .lvl1 {
    background: color-mix(in srgb, var(--accent) 30%, var(--surface-2));
  }
  .lvl2 {
    background: color-mix(in srgb, var(--accent) 55%, var(--surface-2));
  }
  .lvl3 {
    background: color-mix(in srgb, var(--accent) 78%, var(--surface-2));
  }
  .lvl4 {
    background: var(--accent);
  }
  .foot {
    margin-top: 10px;
    font-size: 12px;
    color: var(--text-dim);
  }
  .scale {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .scale i {
    width: 11px;
    height: 11px;
    border-radius: 3px;
    display: inline-block;
  }
</style>
