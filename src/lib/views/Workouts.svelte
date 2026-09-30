<script lang="ts">
  import { selectedDate, routines, loadRoutines, dataVersion, bumpData, toast, navigate, settings } from '../stores';
  import { isConnected, syncRecentWorkouts } from '../whoop';
  import {
    getWorkoutsForDate,
    getAllWorkouts,
    saveWorkout,
    deleteWorkout,
    saveRoutine,
    uid
  } from '../db';
  import type { Workout, Routine } from '../types';
  import { friendlyDate, todayKey } from '../date';
  import Modal from '../components/Modal.svelte';
  import WorkoutEditor from '../components/WorkoutEditor.svelte';

  let dayWorkouts = $state<Workout[]>([]);
  let history = $state<Workout[]>([]);

  $effect(() => {
    $selectedDate;
    $dataVersion;
    getWorkoutsForDate($selectedDate).then((w) => (dayWorkouts = w));
    getAllWorkouts().then((w) => (history = w.sort((a, b) => b.loggedAt - a.loggedAt)));
  });

  // ---- editor ----
  let editorOpen = $state(false);
  let editing = $state<Partial<Workout> | null>(null);

  function blank() {
    editing = { date: $selectedDate, exercises: [] };
    editorOpen = true;
  }
  function fromRoutine(r: Routine) {
    editing = {
      date: $selectedDate,
      name: r.name,
      routineId: r.id,
      exercises: r.exercises.map((e) => ({ ...e }))
    };
    editorOpen = true;
  }
  function edit(w: Workout) {
    editing = { ...w };
    editorOpen = true;
  }

  async function onSave(w: Workout, alsoRoutine: boolean) {
    await saveWorkout(w);
    if (alsoRoutine && w.exercises.length > 0) {
      const now = Date.now();
      const r: Routine = {
        id: uid(),
        name: w.name || 'Untitled routine',
        exercises: w.exercises.map((e) => ({
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          weightUnit: e.weightUnit
        })),
        createdAt: now,
        updatedAt: now
      };
      await saveRoutine(r);
      await loadRoutines();
      toast(`Saved workout & routine “${r.name}”`, 'success');
    } else {
      toast('Workout saved', 'success');
    }
    editorOpen = false;
    editing = null;
    bumpData();
  }

  async function remove(w: Workout) {
    if (!confirm('Delete this workout?')) return;
    await deleteWorkout(w.id);
    bumpData();
    toast('Deleted', 'info');
  }

  // Auto-open the logger when arriving from the Today shortcut.
  $effect(() => {
    if (sessionStorage.getItem('ct_open_logger') === '1') {
      sessionStorage.removeItem('ct_open_logger');
      blank();
    }
  });

  // ---- WHOOP sync ----
  let whoopConnected = $state(isConnected());
  let syncing = $state(false);
  async function syncWhoop() {
    if (!$settings.whoop) return;
    syncing = true;
    try {
      const { added, updated } = await syncRecentWorkouts($settings.whoop, 30);
      bumpData();
      if (added || updated) toast(`Synced: ${added} new, ${updated} updated`, 'success');
      else toast('Already up to date', 'info');
    } catch (e) {
      toast((e as Error).message || 'Sync failed', 'error');
    } finally {
      syncing = false;
    }
  }

  function summary(w: Workout): string {
    const parts: string[] = [];
    if (w.exercises.length) parts.push(`${w.exercises.length} exercise${w.exercises.length > 1 ? 's' : ''}`);
    if (w.caloriesBurned) parts.push(`🔥 ${w.caloriesBurned} kcal`);
    return parts.join(' · ') || 'No details';
  }
</script>

<div class="page fade-in">
  <div class="spread" style="margin-bottom:6px">
    <h1 class="page-title">Workouts</h1>
    <button class="btn btn-primary" onclick={blank}>＋ Log</button>
  </div>

  <!-- Date target -->
  <div class="row" style="gap:8px;margin-bottom:14px">
    <span class="muted small">Logging to</span>
    <input type="date" value={$selectedDate} max={todayKey()} onchange={(e) => selectedDate.set((e.target as HTMLInputElement).value)} style="width:auto;padding:8px 10px" />
  </div>

  <!-- WHOOP sync -->
  {#if whoopConnected}
    <button class="btn btn-ghost btn-block whoop" onclick={syncWhoop} disabled={syncing}>
      {syncing ? 'Syncing…' : '⌚ Sync from WHOOP'}
    </button>
  {/if}

  <!-- Routine quick-starts -->
  {#if $routines.length > 0}
    <div class="section-title">Start from a routine</div>
    <div class="routines">
      {#each $routines as r (r.id)}
        <button class="rchip" onclick={() => fromRoutine(r)}>
          <span class="rname">{r.name}</span>
          <span class="rmeta">{r.exercises.length} ex</span>
        </button>
      {/each}
    </div>
    <button class="link small" onclick={() => navigate('routines')}>Manage routines →</button>
  {:else}
    <div class="card hint">
      <b>Tip:</b> log a workout with its exercises and tick “Save as routine” to reuse the whole set next time — pick it in one tap.
      <button class="link" onclick={() => navigate('routines')}>Create a routine</button>
    </div>
  {/if}

  <!-- This day -->
  <div class="section-title">{friendlyDate($selectedDate)}</div>
  {#if dayWorkouts.length === 0}
    <div class="empty">Nothing logged for this day.</div>
  {:else}
    <div class="wlist">
      {#each dayWorkouts as w (w.id)}
        <div class="witem card" role="button" tabindex="0" onclick={() => edit(w)} onkeydown={() => {}}>
          <div class="winfo">
            <div class="wname">{w.name || 'Workout'}</div>
            <div class="wsum">{summary(w)}</div>
          </div>
          <button class="del" onclick={(e) => { e.stopPropagation(); remove(w); }} aria-label="Delete">🗑️</button>
        </div>
      {/each}
    </div>
  {/if}

  <!-- History -->
  {#if history.length > 0}
    <div class="section-title">Recent history</div>
    <div class="card">
      {#each history.slice(0, 30) as w (w.id)}
        <button class="hrow" onclick={() => edit(w)}>
          <span class="hdate">{friendlyDate(w.date)}</span>
          <span class="hname">{w.name || 'Workout'}</span>
          <span class="hburn">{w.caloriesBurned ? `🔥 ${w.caloriesBurned}` : ''}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<Modal bind:open={editorOpen} title={editing?.id ? 'Edit workout' : 'Log workout'}>
  {#if editorOpen && editing}
    <WorkoutEditor workout={editing} onSave={onSave} onCancel={() => (editorOpen = false)} />
  {/if}
</Modal>

<style>
  .small {
    font-size: 12px;
  }
  .whoop {
    margin-bottom: 14px;
  }
  .routines {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 6px;
    margin-bottom: 6px;
  }
  .rchip {
    flex: 0 0 auto;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 10px 14px;
    text-align: left;
    box-shadow: var(--shadow);
  }
  .rname {
    display: block;
    font-weight: 700;
  }
  .rmeta {
    font-size: 12px;
    color: var(--text-dim);
  }
  .hint {
    padding: 14px;
    font-size: 14px;
    color: var(--text-dim);
    line-height: 1.5;
  }
  .hint b {
    color: var(--text);
  }
  .link {
    color: var(--accent);
    font-weight: 600;
    display: inline-block;
    margin-top: 6px;
  }
  .wlist {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .witem {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px;
  }
  .wname {
    font-weight: 700;
  }
  .wsum {
    font-size: 13px;
    color: var(--text-dim);
    margin-top: 2px;
  }
  .del {
    font-size: 15px;
    opacity: 0.7;
  }
  .hrow {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 10px;
    align-items: center;
    width: 100%;
    padding: 12px 14px;
    border-bottom: 1px solid var(--border);
    text-align: left;
  }
  .hrow:last-child {
    border-bottom: none;
  }
  .hdate {
    font-size: 13px;
    color: var(--text-dim);
    white-space: nowrap;
  }
  .hname {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .hburn {
    font-size: 13px;
    color: var(--text-dim);
    white-space: nowrap;
  }
</style>
