<script lang="ts">
  // Generic point line chart used for weight trend & cumulative intake.
  let {
    points,
    target,
    height = 180,
    color = 'var(--accent)',
    fill = true
  }: {
    points: { x: string; y: number }[];
    target?: number;
    height?: number;
    color?: string;
    fill?: boolean;
  } = $props();

  const w = 320;
  const padY = 14;
  const padX = 6;

  const ys = $derived(points.map((p) => p.y));
  const minY = $derived(Math.min(target ?? Infinity, ...ys));
  const maxY = $derived(Math.max(target ?? -Infinity, ...ys));
  const range = $derived(Math.max(maxY - minY, 1));

  function sx(i: number) {
    if (points.length <= 1) return padX;
    return padX + (i / (points.length - 1)) * (w - padX * 2);
  }
  function sy(v: number) {
    return padY + (1 - (v - minY) / range) * (height - padY * 2);
  }

  const path = $derived(
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ')
  );
  const area = $derived(
    points.length
      ? `${path} L ${sx(points.length - 1).toFixed(1)} ${height - padY} L ${padX} ${height - padY} Z`
      : ''
  );
</script>

<svg viewBox="0 0 {w} {height}" preserveAspectRatio="none" role="img" aria-label="Trend">
  {#if target != null}
    <line x1={padX} y1={sy(target)} x2={w - padX} y2={sy(target)} class="target" stroke-dasharray="4 4" />
  {/if}
  {#if fill && points.length > 1}
    <path d={area} fill={color} opacity="0.12" />
  {/if}
  <path d={path} fill="none" stroke={color} stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
  {#each points as p, i}
    <circle cx={sx(i)} cy={sy(p.y)} r={points.length > 40 ? 0 : 3} fill={color} />
  {/each}
</svg>

<style>
  svg {
    width: 100%;
    height: auto;
    display: block;
  }
  .target {
    stroke: var(--warn);
    stroke-width: 1.5;
  }
</style>
