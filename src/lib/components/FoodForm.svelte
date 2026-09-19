<script lang="ts">
  import type { Food, ServingUnit } from '../types';
  import { uid } from '../db';

  let {
    food,
    onSave,
    onCancel,
    saveLabel = 'Save food'
  }: {
    food?: Partial<Food> | null;
    onSave: (food: Food) => void;
    onCancel?: () => void;
    saveLabel?: string;
  } = $props();

  const units: ServingUnit[] = ['g', 'ml', 'oz', 'piece', 'cup', 'tbsp', 'tsp', 'serving'];

  let name = $state(food?.name ?? '');
  let brand = $state(food?.brand ?? '');
  let calories = $state<number | string>(food?.caloriesPerServing ?? '');
  let servingSize = $state<number | string>(food?.servingSize ?? 1);
  let servingUnit = $state<ServingUnit>(food?.servingUnit ?? 'serving');
  let protein = $state<number | string>(food?.macros?.protein ?? '');
  let carbs = $state<number | string>(food?.macros?.carbs ?? '');
  let fat = $state<number | string>(food?.macros?.fat ?? '');
  let showMacros = $state(!!(food?.macros?.protein || food?.macros?.carbs || food?.macros?.fat));

  const valid = $derived(name.trim().length > 0 && Number(calories) >= 0 && calories !== '');

  function numOrUndef(v: number | string): number | undefined {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return Number.isFinite(n) ? n : undefined;
  }

  function save() {
    if (!valid) return;
    const now = Date.now();
    const macros =
      showMacros && (numOrUndef(protein) || numOrUndef(carbs) || numOrUndef(fat))
        ? { protein: numOrUndef(protein), carbs: numOrUndef(carbs), fat: numOrUndef(fat) }
        : undefined;
    const result: Food = {
      id: food?.id ?? uid(),
      name: name.trim(),
      brand: brand.trim() || undefined,
      caloriesPerServing: Math.round(Number(calories)),
      servingSize: Number(servingSize) || 1,
      servingUnit,
      macros,
      barcode: food?.barcode,
      favorite: food?.favorite,
      source: food?.source ?? 'manual',
      createdAt: food?.createdAt ?? now,
      updatedAt: now
    };
    onSave(result);
  }
</script>

<div class="stack">
  <div>
    <label>Name</label>
    <input bind:value={name} placeholder="e.g. Greek yogurt" autofocus />
  </div>
  <div>
    <label>Brand <span class="faint">(optional)</span></label>
    <input bind:value={brand} placeholder="e.g. Fage" />
  </div>

  <div class="grid2">
    <div>
      <label>Calories per serving</label>
      <input type="number" inputmode="numeric" bind:value={calories} placeholder="kcal" />
    </div>
    <div>
      <label>Serving size</label>
      <div class="serving">
        <input type="number" inputmode="decimal" bind:value={servingSize} />
        <select bind:value={servingUnit}>
          {#each units as u}<option value={u}>{u}</option>{/each}
        </select>
      </div>
    </div>
  </div>

  {#if food?.barcode}
    <div class="pill">🏷️ Barcode {food.barcode}</div>
  {/if}

  {#if showMacros}
    <div>
      <label>Macros per serving (grams, optional)</label>
      <div class="grid3">
        <input type="number" inputmode="decimal" bind:value={protein} placeholder="Protein" />
        <input type="number" inputmode="decimal" bind:value={carbs} placeholder="Carbs" />
        <input type="number" inputmode="decimal" bind:value={fat} placeholder="Fat" />
      </div>
    </div>
  {:else}
    <button class="btn btn-ghost" onclick={() => (showMacros = true)}>+ Add macros (optional)</button>
  {/if}

  <div class="actions">
    {#if onCancel}
      <button class="btn btn-ghost" onclick={onCancel}>Cancel</button>
    {/if}
    <button class="btn btn-primary" style="flex:1" onclick={save} disabled={!valid}>{saveLabel}</button>
  </div>
</div>

<style>
  .grid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .grid3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
  }
  .serving {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .actions {
    display: flex;
    gap: 10px;
    margin-top: 4px;
  }
</style>
