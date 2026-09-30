<script lang="ts">
  import { foods, loadFoods, toast } from '../stores';
  import { saveFood, deleteFood, findFoodByBarcode } from '../db';
  import type { Food } from '../types';
  import Modal from '../components/Modal.svelte';
  import FoodForm from '../components/FoodForm.svelte';
  import Icon from '../components/Icon.svelte';
  import { lookupBarcode } from '../off';

  let query = $state('');
  let editorOpen = $state(false);
  let editing = $state<Partial<Food> | null>(null);

  // ---- barcode → new library food ----
  let ScannerComp = $state<any>(null);
  let scanOpen = $state(false);
  let scanBusy = $state(false);
  async function openScanner() {
    if (!ScannerComp) ScannerComp = (await import('../components/BarcodeScanner.svelte')).default;
    scanOpen = true;
  }
  async function onDetected(code: string) {
    scanOpen = false;
    const existing = await findFoodByBarcode(code);
    if (existing) {
      toast('Already in your library', 'info');
      edit(existing);
      return;
    }
    scanBusy = true;
    try {
      const res = await lookupBarcode(code);
      if (res.found && res.food) {
        editing = res.food;
        if (!res.food.caloriesPerServing) toast('Found it — add the calories', 'info');
      } else {
        editing = { barcode: code, source: 'manual', servingUnit: 'serving', servingSize: 1 };
        toast('Not in Open Food Facts — fill it in and it’s saved', 'info');
      }
    } catch {
      editing = { barcode: code, source: 'manual', servingUnit: 'serving', servingSize: 1 };
      toast('Lookup failed (offline?) — enter it manually', 'error');
    } finally {
      scanBusy = false;
      editorOpen = true;
    }
  }

  const filtered = $derived(
    query.trim()
      ? $foods.filter((f) => (f.name + ' ' + (f.brand ?? '')).toLowerCase().includes(query.toLowerCase()))
      : $foods
  );

  function newFood() {
    editing = null;
    editorOpen = true;
  }
  function edit(f: Food) {
    editing = f;
    editorOpen = true;
  }
  async function onSave(f: Food) {
    await saveFood(f);
    await loadFoods();
    editorOpen = false;
    editing = null;
    toast('Saved', 'success');
  }
  async function remove(f: Food) {
    if (!confirm(`Delete "${f.name}"? Past log entries stay intact.`)) return;
    await deleteFood(f.id);
    await loadFoods();
    toast('Deleted', 'info');
  }
  async function toggleFav(f: Food, e: MouseEvent) {
    e.stopPropagation();
    await saveFood({ ...f, favorite: !f.favorite, updatedAt: Date.now() });
    await loadFoods();
  }

  const sorted = $derived(
    [...filtered].sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite) || a.name.localeCompare(b.name))
  );
</script>

<div class="page fade-in">
  <div class="spread" style="margin-bottom:14px">
    <h1 class="page-title">Your foods</h1>
    <div class="row" style="gap:8px">
      <button class="btn btn-ghost" onclick={openScanner} aria-label="Scan barcode"><Icon name="scan" size={18} /> Scan</button>
      <button class="btn btn-primary" onclick={newFood}><Icon name="plus" size={18} /> New</button>
    </div>
  </div>

  {#if scanBusy}<div class="empty">Looking up product…</div>{/if}

  {#if $foods.length > 0}
    <input placeholder="Search…" bind:value={query} style="margin-bottom:14px" />
  {/if}

  {#if $foods.length === 0}
    <div class="empty card" style="padding:30px">
      <div class="big"><Icon name="apple" size={30} /></div>
      <div style="font-weight:600;color:var(--text)">No foods yet</div>
      <div class="muted" style="margin:6px 0 14px">Build a library of foods you eat often — scan a barcode, or add them by hand with calories and serving sizes.</div>
      <div class="row" style="gap:8px;justify-content:center">
        <button class="btn btn-ghost" onclick={openScanner}><Icon name="scan" size={18} /> Scan</button>
        <button class="btn btn-primary" onclick={newFood}>Create a food</button>
      </div>
    </div>
  {:else}
    <div class="list">
      {#each sorted as f (f.id)}
        <div class="fitem" role="button" tabindex="0" onclick={() => edit(f)} onkeydown={() => {}}>
          <button class="star" class:on={f.favorite} onclick={(e) => toggleFav(f, e)} aria-label="Favorite">
            <Icon name="star" size={18} fill={f.favorite ? 'currentColor' : 'none'} />
          </button>
          <div class="info">
            <div class="fname">{f.name}{#if f.brand}<span class="faint"> · {f.brand}</span>{/if}</div>
            <div class="fmeta">
              {f.caloriesPerServing} kcal · {f.servingSize}{f.servingUnit === 'serving' ? ' serving' : ' ' + f.servingUnit}
              {#if f.barcode}· scanned{/if}
            </div>
          </div>
          <button class="del" onclick={(e) => { e.stopPropagation(); remove(f); }} aria-label="Delete"><Icon name="trash" size={18} /></button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<Modal bind:open={editorOpen} title={editing?.id ? 'Edit food' : 'New food'}>
  {#if editorOpen}
    <FoodForm food={editing} onSave={onSave} onCancel={() => (editorOpen = false)} />
  {/if}
</Modal>

<Modal open={scanOpen} title="Scan barcode" onClose={() => (scanOpen = false)}>
  {#if scanOpen && ScannerComp}
    <ScannerComp onDetected={onDetected} onCancel={() => (scanOpen = false)} />
  {/if}
</Modal>

<style>
  .list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .fitem {
    display: grid;
    grid-template-columns: 34px 1fr 34px;
    align-items: center;
    gap: 8px;
    padding: 11px 4px;
    border-bottom: 1px solid var(--border);
  }
  .star {
    color: var(--text-faint);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .star.on {
    color: var(--accent);
  }
  .info {
    min-width: 0;
  }
  .fname {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .fmeta {
    font-size: 13px;
    color: var(--text-dim);
  }
  .del {
    font-size: 16px;
    opacity: 0.7;
  }
</style>
