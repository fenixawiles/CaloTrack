<script lang="ts">
  import { foods, loadFoods, toast } from '../stores';
  import { saveFood, deleteFood } from '../db';
  import type { Food } from '../types';
  import Modal from '../components/Modal.svelte';
  import FoodForm from '../components/FoodForm.svelte';

  let query = $state('');
  let editorOpen = $state(false);
  let editing = $state<Partial<Food> | null>(null);

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
    <button class="btn btn-primary" onclick={newFood}>＋ New</button>
  </div>

  {#if $foods.length > 0}
    <input placeholder="Search…" bind:value={query} style="margin-bottom:14px" />
  {/if}

  {#if $foods.length === 0}
    <div class="empty card" style="padding:30px">
      <div class="big">🍎</div>
      <div style="font-weight:600;color:var(--text)">No foods yet</div>
      <div class="muted" style="margin:6px 0 14px">Build a library of foods you eat often — with calories, serving sizes and optional macros.</div>
      <button class="btn btn-primary" onclick={newFood}>Create your first food</button>
    </div>
  {:else}
    <div class="list">
      {#each sorted as f (f.id)}
        <div class="fitem" role="button" tabindex="0" onclick={() => edit(f)} onkeydown={() => {}}>
          <button class="star" class:on={f.favorite} onclick={(e) => toggleFav(f, e)} aria-label="Favorite">
            {f.favorite ? '★' : '☆'}
          </button>
          <div class="info">
            <div class="fname">{f.name}{#if f.brand}<span class="faint"> · {f.brand}</span>{/if}</div>
            <div class="fmeta">
              {f.caloriesPerServing} kcal · {f.servingSize}{f.servingUnit === 'serving' ? ' serving' : ' ' + f.servingUnit}
              {#if f.barcode}· 🏷️{/if}
            </div>
          </div>
          <button class="del" onclick={(e) => { e.stopPropagation(); remove(f); }} aria-label="Delete">🗑️</button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<Modal bind:open={editorOpen} title={editing ? 'Edit food' : 'New food'}>
  {#if editorOpen}
    <FoodForm food={editing} onSave={onSave} onCancel={() => (editorOpen = false)} />
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
    font-size: 20px;
    color: var(--text-faint);
  }
  .star.on {
    color: var(--warn);
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
