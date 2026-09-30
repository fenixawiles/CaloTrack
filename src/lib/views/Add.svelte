<script lang="ts">
  import { foods, selectedDate, loadFoods, bumpData, toast, navigate } from '../stores';
  import {
    saveEntry,
    saveFood,
    findFoodByBarcode,
    getRecentEntryNames,
    uid
  } from '../db';
  import type { Food, Entry, MealType } from '../types';
  import { lookupBarcode, offToFood } from '../off';
  import Modal from '../components/Modal.svelte';
  import NumberStepper from '../components/NumberStepper.svelte';
  import FoodForm from '../components/FoodForm.svelte';
  import Icon from '../components/Icon.svelte';
  import { friendlyDate } from '../date';

  // Barcode scanner (and the heavy ZXing library) is loaded on demand.
  let ScannerComp = $state<any>(null);
  async function openScanner() {
    if (!ScannerComp) {
      ScannerComp = (await import('../components/BarcodeScanner.svelte')).default;
    }
    scanOpen = true;
  }

  const meals: { id: MealType; label: string }[] = [
    { id: 'breakfast', label: 'Breakfast' },
    { id: 'lunch', label: 'Lunch' },
    { id: 'dinner', label: 'Dinner' },
    { id: 'snack', label: 'Snack' }
  ];

  let meal = $state<MealType>((sessionStorage.getItem('ct_meal') as MealType) || 'snack');
  let query = $state('');
  let recents = $state<Entry[]>([]);

  $effect(() => {
    getRecentEntryNames(12).then((r) => (recents = r));
  });

  const filtered = $derived(
    query.trim()
      ? $foods.filter((f) => (f.name + ' ' + (f.brand ?? '')).toLowerCase().includes(query.toLowerCase()))
      : $foods
  );

  // ---------- Logging a library food ----------
  let logging = $state<Food | null>(null);
  let logServings = $state(1);
  function openLog(f: Food) {
    logging = f;
    logServings = 1;
  }
  async function confirmLog() {
    if (!logging) return;
    await commitEntry(logging, logServings);
    logging = null;
  }

  async function commitEntry(f: Food, servings: number) {
    const entry: Entry = {
      id: uid(),
      date: $selectedDate,
      foodId: f.id,
      name: f.name,
      caloriesPerServing: f.caloriesPerServing,
      servings,
      mealType: meal,
      macros: f.macros,
      loggedAt: Date.now()
    };
    await saveEntry(entry);
    bumpData();
    toast(`Added ${f.name}`, 'success');
    navigate('today');
  }

  async function logRecent(e: Entry) {
    const entry: Entry = { ...e, id: uid(), date: $selectedDate, mealType: meal, loggedAt: Date.now() };
    await saveEntry(entry);
    bumpData();
    toast(`Added ${e.name}`, 'success');
    navigate('today');
  }

  // ---------- Quick manual (calories only) ----------
  let quickName = $state('');
  let quickCals = $state<number | string>('');
  let saveQuickToLibrary = $state(false);
  const quickValid = $derived(quickName.trim().length > 0 && Number(quickCals) > 0);

  async function logQuick() {
    if (!quickValid) return;
    const cals = Math.round(Number(quickCals));
    let foodId: string | undefined;
    if (saveQuickToLibrary) {
      const now = Date.now();
      const f: Food = {
        id: uid(),
        name: quickName.trim(),
        caloriesPerServing: cals,
        servingSize: 1,
        servingUnit: 'serving',
        source: 'manual',
        createdAt: now,
        updatedAt: now
      };
      await saveFood(f);
      await loadFoods();
      foodId = f.id;
    }
    await saveEntry({
      id: uid(),
      date: $selectedDate,
      foodId,
      name: quickName.trim(),
      caloriesPerServing: cals,
      servings: 1,
      mealType: meal,
      loggedAt: Date.now()
    });
    bumpData();
    toast('Added', 'success');
    navigate('today');
  }

  // ---------- Barcode scanning ----------
  let scanOpen = $state(false);
  let scanBusy = $state(false);
  let scannedFood = $state<Partial<Food> | null>(null);
  let scanConfirmOpen = $state(false);
  let saveScanToLibrary = $state(true);

  async function onDetected(code: string) {
    scanOpen = false;
    scanBusy = true;
    try {
      // If we already have this barcode saved, jump straight to logging.
      const existing = await findFoodByBarcode(code);
      if (existing) {
        scanBusy = false;
        openLog(existing);
        return;
      }
      const res = await lookupBarcode(code);
      scanBusy = false;
      if (res.found && res.food) {
        scannedFood = res.food;
        saveScanToLibrary = true;
        scanConfirmOpen = true;
        if (!res.food.caloriesPerServing) {
          toast('Found the product, but it has no calorie data — please fill it in.', 'info');
        }
      } else {
        // Not in the database — let the user create it manually with the barcode attached.
        scannedFood = { barcode: code, source: 'manual', servingUnit: 'serving', servingSize: 1 };
        saveScanToLibrary = true;
        scanConfirmOpen = true;
        toast('Not in Open Food Facts — add it yourself and it’s saved for next time.', 'info');
      }
    } catch (err) {
      scanBusy = false;
      console.error(err);
      toast('Lookup failed (offline?). You can enter it manually.', 'error');
      scannedFood = { barcode: code, source: 'manual', servingUnit: 'serving', servingSize: 1 };
      scanConfirmOpen = true;
    }
  }

  async function onScannedSave(f: Food) {
    scanConfirmOpen = false;
    scannedFood = null;
    if (saveScanToLibrary) {
      await saveFood(f);
      await loadFoods();
    }
    // Go to the quantity step instead of assuming one serving, so you can log
    // "6" of something in one move.
    openLog(f);
  }
</script>

<div class="page fade-in">
  <h1 class="page-title">Add food</h1>
  <div class="muted" style="margin-bottom:14px">to {friendlyDate($selectedDate)}</div>

  <!-- Meal chooser -->
  <div class="chips">
    {#each meals as m}
      <button class="pill" class:active={meal === m.id} onclick={() => (meal = m.id)}>{m.label}</button>
    {/each}
  </div>

  <!-- Search + scan -->
  <div class="searchrow">
    <input placeholder="Search your foods…" bind:value={query} />
    <button class="scanbtn" onclick={openScanner} aria-label="Scan barcode"><Icon name="scan" size={22} /></button>
  </div>

  {#if scanBusy}
    <div class="empty">Looking up product…</div>
  {/if}

  <!-- Quick add -->
  <div class="card quick">
    <div class="section-title" style="margin-top:0">Quick add (calories only)</div>
    <div class="qgrid">
      <input placeholder="Name" bind:value={quickName} />
      <input type="number" inputmode="numeric" placeholder="kcal" bind:value={quickCals} />
    </div>
    <label class="check">
      <input type="checkbox" bind:checked={saveQuickToLibrary} />
      <span>Also save to my foods</span>
    </label>
    <button class="btn btn-primary btn-block" onclick={logQuick} disabled={!quickValid}>Add</button>
  </div>

  <!-- Recents -->
  {#if recents.length > 0 && !query}
    <div class="section-title">Recent</div>
    <div class="list">
      {#each recents as e (e.id)}
        <button class="fitem" onclick={() => logRecent(e)}>
          <span class="fname">{e.name}</span>
          <span class="fcal">{e.caloriesPerServing} kcal</span>
        </button>
      {/each}
    </div>
  {/if}

  <!-- Library -->
  <div class="section-title">{query ? 'Results' : 'Your foods'}</div>
  {#if filtered.length === 0}
    <div class="empty">
      {#if query}
        No match. Try Quick add above, or
        <button class="link" onclick={openScanner}>scan a barcode</button>.
      {:else}
        Your library is empty. Scan a barcode or use Quick add to start building it.
      {/if}
    </div>
  {:else}
    <div class="list">
      {#each filtered as f (f.id)}
        <button class="fitem" onclick={() => openLog(f)}>
          <span class="fname">
            {f.name}
            {#if f.brand}<span class="faint"> · {f.brand}</span>{/if}
          </span>
          <span class="fcal">{f.caloriesPerServing} kcal</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<!-- Log servings sheet -->
<Modal open={logging != null} title={logging?.name ?? ''} onClose={() => (logging = null)}>
  {#if logging}
    <div class="stack">
      <div class="editcal">
        <div class="big">{Math.round(logging.caloriesPerServing * logServings)}</div>
        <div class="muted">
          kcal · {logging.caloriesPerServing} per {logging.servingSize}{logging.servingUnit === 'serving' ? '' : ' ' + logging.servingUnit}
          {logging.servingUnit === 'serving' ? ' serving' : ''}
        </div>
      </div>
      <NumberStepper bind:value={logServings} step={0.5} min={0.25} label="Servings" />
      <div class="chips">
        {#each meals as m}
          <button class="pill" class:active={meal === m.id} onclick={() => (meal = m.id)}>{m.label}</button>
        {/each}
      </div>
      <button class="btn btn-primary btn-block" onclick={confirmLog}>Add to {meal}</button>
    </div>
  {/if}
</Modal>

<!-- Scanner sheet -->
<Modal open={scanOpen} title="Scan barcode" onClose={() => (scanOpen = false)}>
  {#if scanOpen && ScannerComp}
    <ScannerComp onDetected={onDetected} onCancel={() => (scanOpen = false)} />
  {/if}
</Modal>

<!-- Confirm scanned food -->
<Modal open={scanConfirmOpen} title="Confirm food" onClose={() => (scanConfirmOpen = false)}>
  {#if scannedFood}
    <label class="check" style="margin-bottom:12px">
      <input type="checkbox" bind:checked={saveScanToLibrary} />
      <span>Save to my foods for next time</span>
    </label>
    <FoodForm food={scannedFood} onSave={onScannedSave} onCancel={() => (scanConfirmOpen = false)} saveLabel="Add & log" />
  {/if}
</Modal>

<style>
  .chips {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 14px;
  }
  .chips .pill {
    cursor: pointer;
  }
  .searchrow {
    display: grid;
    grid-template-columns: 1fr 52px;
    gap: 10px;
    margin-bottom: 14px;
  }
  .scanbtn {
    background: var(--surface-2);
    border-radius: var(--radius-sm);
    font-size: 22px;
  }
  .quick {
    padding: 14px;
    margin-bottom: 18px;
  }
  .qgrid {
    display: grid;
    grid-template-columns: 1fr 100px;
    gap: 10px;
    margin-bottom: 10px;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--text-dim);
    font-weight: 500;
    margin-bottom: 10px;
  }
  .check input {
    width: 18px;
    height: 18px;
  }
  .list {
    display: flex;
    flex-direction: column;
  }
  .fitem {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 13px 4px;
    border-bottom: 1px solid var(--border);
    text-align: left;
    width: 100%;
  }
  .fname {
    color: var(--text);
  }
  .fcal {
    color: var(--text-dim);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .link {
    color: var(--accent);
    font-weight: 600;
    text-decoration: underline;
  }
  .editcal {
    text-align: center;
  }
  .editcal .big {
    font-size: 40px;
    font-weight: 800;
  }
</style>
