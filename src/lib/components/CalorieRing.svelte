<script lang="ts">
  let {
    consumed,
    target,
    size = 208
  }: { consumed: number; target?: number; size?: number } = $props();

  const stroke = 16;
  const r = $derived((size - stroke) / 2);
  const c = $derived(2 * Math.PI * r);

  const pct = $derived(target && target > 0 ? Math.min(consumed / target, 1) : 0);
  const over = $derived(target ? consumed > target : false);
  const remaining = $derived(target ? target - consumed : null);
  const dash = $derived(c * pct);

  // Colour shifts gently as you approach goal — never an alarming red.
  const ringColor = $derived(
    !target ? 'var(--accent)' : over ? 'var(--warn)' : 'var(--accent)'
  );
</script>

<div class="ring" style="width:{size}px;height:{size}px">
  <svg viewBox="0 0 {size} {size}" width={size} height={size}>
    <circle cx={size / 2} cy={size / 2} {r} fill="none" stroke="var(--ring-track)" stroke-width={stroke} />
    {#if target}
      <circle
        cx={size / 2}
        cy={size / 2}
        {r}
        fill="none"
        stroke={ringColor}
        stroke-width={stroke}
        stroke-linecap="round"
        stroke-dasharray="{dash} {c}"
        transform="rotate(-90 {size / 2} {size / 2})"
        style="transition: stroke-dasharray 0.5s ease, stroke 0.3s ease"
      />
    {/if}
  </svg>
  <div class="center">
    <div class="num">{consumed.toLocaleString()}</div>
    {#if target}
      {#if over}
        <div class="sub warn">{Math.abs(remaining!).toLocaleString()} over</div>
      {:else}
        <div class="sub">{remaining!.toLocaleString()} left</div>
      {/if}
      <div class="goal">of {target.toLocaleString()} kcal</div>
    {:else}
      <div class="sub">kcal today</div>
      <div class="goal">set a goal →</div>
    {/if}
  </div>
</div>

<style>
  .ring {
    position: relative;
    margin: 0 auto;
  }
  .center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .num {
    font-size: 44px;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1;
  }
  .sub {
    margin-top: 6px;
    font-size: 15px;
    font-weight: 700;
    color: var(--accent);
  }
  .sub.warn {
    color: var(--warn);
  }
  .goal {
    font-size: 12px;
    color: var(--text-faint);
    margin-top: 2px;
  }
</style>
