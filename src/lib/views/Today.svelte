<script lang="ts">
  import { selectedDate, currentGoal, settings, dataVersion, navigate, toast, bumpData } from '../stores';
  import { addDays, friendlyDate, isToday, isFuture, todayKey } from '../date';
  import {
    getEntriesForDate,
    getAllEntries,
    saveEntry,
    deleteEntry,
    uid
  } from '../db';
  import type { Entry, MealType } from '../types';
  import { entryCalories, sumCalories, sumMacros, rollingAverage, daysLoggedIn } from '../nutrition';
  import CalorieRing from '../components/CalorieRing.svelte';
  import Modal from '../components/Modal.svelte';
  import NumberStepper from '../components/NumberStepper.svelte';

  let entries = $state<Entry[]>([]);
  let allEntries = $state<Entry[]>([]);
  let loading = $state(true);

  const meals: { id: MealType; label: string; icon: string }[] = [
    { id: 'breakfast', label: 'Breakfast', icon: '🌅' },
    { id: 'lunch', label: 'Lunch', icon: '☀️' },
    { id: 'dinner', label: 'Dinner', icon: '🌙' },
    { id: 'snack', label: 'Snacks', icon: '🍿' }
  ];

  async function load() {
    loading = true;
    entries = await getEntriesForDate($selectedDate);
    allEntries = await getAllEntries();
    loading = false;
  }

  $effect(() => {
    // Re-run whenever the date or the data version changes.
    $selectedDate;
    $dataVersion;
    load();
  });

  const total = $derived(sumCalories(entries));
  const target = $derived($currentGoal?.dailyCalorieTarget);
  const macros = $derived(sumMacros(entries));
  const hasMacros = $derived((macros.protein ?? 0) + (macros.carbs ?? 0) + (macros.fat ?? 0) > 0);

  const avg7 = $derived(rollingAverage(allEntries, 7));
  const logged30 = $derived(daysLoggedIn(allEntries, 30));

  function byMeal(m: MealType) {
    return entries.filter((e) => e.mealType === m);
  }

  function goPrev() {
    selectedDate.set(addDays($selectedDate, -1));
  }
  function goNext() {
    if (!isToday($selectedDate)) selectedDate.set(addDays($selectedDate, 1));
  }

  // ----- copy yesterday -----
  async function copyYesterday() {
    const y = addDays($selectedDate, -1);
    const prev = await getEntriesForDate(y);
    if (prev.length === 0) {
      toast('Nothing logged yesterday to copy.', 'info');
      return;
    }
    for (const e of prev) {
      await saveEntry({ ...e, id: uid(), date: $selectedDate, loggedAt: Date.now() });
    }
    bumpData();
    toast(`Copied ${prev.length} item${prev.length > 1 ? 's' : ''} from yesterday.`, 'success');
  }

  // ----- edit entry -----
  let editing = $state<Entry | null>(null);
  let editServings = $state(1);
  function openEdit(e: Entry) {
    editing = e;
    editServings = e.servings;
  }
  async function saveEdit() {
    if (!editing) return;
    await saveEntry({ ...editing, servings: editServings });
    editing = null;
    bumpData();
  }
  async function removeEntry() {
    if (!editing) return;
    await deleteEntry(editing.id);
    editing = null;
    bumpData();
    toast('Removed.', 'info');
  }

  function addTo(meal: MealType) {
    // Add flow reads the selected meal from a query-ish shared state via navigate.
    navigate('add');
    // stash the desired meal for the Add view
    sessionStorage.setItem('ct_meal', meal);
  }
</script>

<div class="page fade-in">
  <!-- Date navigator -->
  <div class="datenav">
    <button onclick={goPrev} aria-label="Previous day">‹</button>
    <div class="dlabel">
      <div class="d">{friendlyDate($selectedDate)}</div>
      {#if !isToday($selectedDate)}
        <button class="jump" onclick={() => selectedDate.set(todayKey())}>Jump to today</button>
      {/if}
    </div>
    <button onclick={goNext} disabled={isToday($selectedDate)} aria-label="Next day">›</button>
  </div>

  {#if isFuture($selectedDate)}
    <div class="empty card" style="padding:28px">
      <div class="big">🗓️</div>
      That day hasn't happened yet.
    </div>
  {:else}
    <!-- Ring -->
    <div class="ringwrap card">
      <CalorieRing consumed={total} {target} />
      {#if hasMacros}
        <div class="macros">
          <span><b>{Math.round(macros.protein ?? 0)}g</b> protein</span>
          <span><b>{Math.round(macros.carbs ?? 0)}g</b> carbs</span>
          <span><b>{Math.round(macros.fat ?? 0)}g</b> fat</span>
        </div>
      {/if}
    </div>

    <!-- Gentle encouragement, never shame -->
    <div class="encourage">
      {#if avg7 != null}
        <span>7-day average <b>{avg7.toLocaleString()}</b> kcal</span>
        <span class="dot">·</span>
      {/if}
      <span>Logged <b>{logged30}</b> of last 30 days</span>
    </div>

    <div class="quickrow">
      <button class="btn btn-primary" style="flex:1" onclick={() => addTo('snack')}>＋ Add food</button>
      <button class="btn btn-ghost" onclick={copyYesterday}>Copy yesterday</button>
    </div>

    <!-- Meals -->
    {#if loading}
      <div class="empty">Loading…</div>
    {:else if entries.length === 0}
      <div class="empty card" style="padding:30px">
        <div class="big">🍽️</div>
        <div style="font-weight:600;color:var(--text)">No entries yet {isToday($selectedDate) ? 'today' : 'this day'}</div>
        <div class="muted" style="margin-top:4px">Add something whenever you're ready — no pressure.</div>
      </div>
    {:else}
      <div class="meals">
        {#each meals as m}
          {@const list = byMeal(m.id)}
          {#if list.length > 0}
            <div class="meal card">
              <div class="meal-head">
                <span>{m.icon} {m.label}</span>
                <span class="mcal">{sumCalories(list).toLocaleString()} kcal</span>
              </div>
              {#each list as e (e.id)}
                <button class="entry" onclick={() => openEdit(e)}>
                  <span class="ename">
                    {e.name}
                    {#if e.servings !== 1}<span class="faint">×{e.servings}</span>{/if}
                  </span>
                  <span class="ecal">{entryCalories(e)}</span>
                </button>
              {/each}
              <button class="addmore" onclick={() => addTo(m.id)}>＋ Add to {m.label.toLowerCase()}</button>
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  {/if}
</div>

<!-- Edit entry sheet -->
<Modal open={editing != null} title={editing?.name ?? ''} onClose={() => (editing = null)}>
  {#if editing}
    <div class="stack">
      <div class="editcal">
        <div class="big">{Math.round(editing.caloriesPerServing * editServings)}</div>
        <div class="muted">kcal · {editing.caloriesPerServing} per serving</div>
      </div>
      <NumberStepper bind:value={editServings} step={0.5} min={0.25} label="Servings" />
      <div class="row" style="gap:10px">
        <button class="btn btn-danger" onclick={removeEntry}>Delete</button>
        <button class="btn btn-primary" style="flex:1" onclick={saveEdit}>Save</button>
      </div>
    </div>
  {/if}
</Modal>

<style>
  .datenav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .datenav button {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: var(--surface-2);
    font-size: 24px;
    color: var(--text);
  }
  .datenav button:disabled {
    opacity: 0.35;
  }
  .dlabel {
    text-align: center;
  }
  .dlabel .d {
    font-size: 20px;
    font-weight: 700;
  }
  .jump {
    font-size: 12px;
    color: var(--accent);
    font-weight: 600;
  }
  .ringwrap {
    padding: 22px 18px 18px;
    margin-bottom: 12px;
  }
  .macros {
    display: flex;
    justify-content: center;
    gap: 18px;
    margin-top: 14px;
    font-size: 13px;
    color: var(--text-dim);
  }
  .macros b {
    color: var(--text);
  }
  .encourage {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    flex-wrap: wrap;
    font-size: 13px;
    color: var(--text-dim);
    margin-bottom: 14px;
  }
  .encourage b {
    color: var(--text);
  }
  .dot {
    color: var(--text-faint);
  }
  .quickrow {
    display: flex;
    gap: 10px;
    margin-bottom: 16px;
  }
  .meals {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .meal {
    padding: 12px 14px;
  }
  .meal-head {
    display: flex;
    justify-content: space-between;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .mcal {
    color: var(--text-dim);
    font-weight: 600;
  }
  .entry {
    display: flex;
    justify-content: space-between;
    width: 100%;
    padding: 9px 0;
    border-top: 1px solid var(--border);
    text-align: left;
  }
  .ename {
    color: var(--text);
  }
  .ecal {
    color: var(--text-dim);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .addmore {
    margin-top: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--accent);
    padding: 6px 0 2px;
  }
  .editcal {
    text-align: center;
  }
  .editcal .big {
    font-size: 40px;
    font-weight: 800;
  }
</style>
