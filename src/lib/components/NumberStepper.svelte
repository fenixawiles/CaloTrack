<script lang="ts">
  let {
    value = $bindable(1),
    step = 0.5,
    min = 0,
    max = 9999,
    label = ''
  }: { value?: number; step?: number; min?: number; max?: number; label?: string } = $props();

  function clamp(v: number) {
    return Math.max(min, Math.min(max, Math.round(v * 100) / 100));
  }
  function dec() {
    value = clamp(value - step);
  }
  function inc() {
    value = clamp(value + step);
  }
  function onInput(e: Event) {
    const v = parseFloat((e.target as HTMLInputElement).value);
    value = Number.isFinite(v) ? v : min;
  }
</script>

<div class="wrap">
  {#if label}<label>{label}</label>{/if}
  <div class="stepper">
    <button type="button" onclick={dec} aria-label="Decrease">−</button>
    <input type="number" inputmode="decimal" value={value} oninput={onInput} {min} {max} step={step} />
    <button type="button" onclick={inc} aria-label="Increase">＋</button>
  </div>
</div>

<style>
  .stepper {
    display: grid;
    grid-template-columns: 52px 1fr 52px;
    align-items: stretch;
    gap: 8px;
  }
  .stepper button {
    background: var(--surface-2);
    border-radius: var(--radius-sm);
    font-size: 22px;
    font-weight: 700;
    color: var(--text);
  }
  .stepper button:active {
    transform: scale(0.95);
  }
  .stepper input {
    text-align: center;
    font-weight: 700;
    -moz-appearance: textfield;
  }
  .stepper input::-webkit-outer-spin-button,
  .stepper input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
</style>
