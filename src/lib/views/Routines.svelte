<script lang="ts">
  import { routines, loadRoutines, toast, navigate, settings } from '../stores';
  import { saveRoutine, deleteRoutine, uid } from '../db';
  import type { Routine, RoutineExercise, WeightUnit } from '../types';
  import Modal from '../components/Modal.svelte';
  import Icon from '../components/Icon.svelte';

  const defaultUnit: WeightUnit = $derived($settings.units === 'imperial' ? 'lb' : 'kg');

  let editorOpen = $state(false);
  let editingId = $state<string | null>(null);
  let name = $state('');
  let exercises = $state<RoutineExercise[]>([]);

  function newRoutine() {
    editingId = null;
    name = '';
    exercises = [{ name: '', weightUnit: defaultUnit }];
    editorOpen = true;
  }
  function edit(r: Routine) {
    editingId = r.id;
    name = r.name;
    exercises = r.exercises.map((e) => ({ ...e }));
    if (exercises.length === 0) exercises = [{ name: '', weightUnit: defaultUnit }];
    editorOpen = true;
  }
  function addExercise() {
    exercises.push({ name: '', weightUnit: defaultUnit });
  }
  function removeExercise(i: number) {
    exercises.splice(i, 1);
  }

  function numOrUndef(v: number | string | undefined): number | undefined {
    if (v === '' || v == null) return undefined;
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return Number.isFinite(n) ? n : undefined;
  }

  const valid = $derived(name.trim().length > 0 && exercises.some((e) => e.name.trim()));

  async function save() {
    if (!valid) return;
    const now = Date.now();
    const clean = exercises
      .filter((e) => e.name.trim())
      .map((e) => ({
        name: e.name.trim(),
        sets: numOrUndef(e.sets),
        reps: numOrUndef(e.reps),
        weight: numOrUndef(e.weight),
        weightUnit: numOrUndef(e.weight) != null ? e.weightUnit ?? defaultUnit : undefined
      }));
    const r: Routine = {
      id: editingId ?? uid(),
      name: name.trim(),
      exercises: clean,
      createdAt: editingId ? ($routines.find((x) => x.id === editingId)?.createdAt ?? now) : now,
      updatedAt: now
    };
    await saveRoutine(r);
    await loadRoutines();
    editorOpen = false;
    toast('Routine saved', 'success');
  }

  async function remove(r: Routine) {
    if (!confirm(`Delete routine “${r.name}”? Logged workouts are not affected.`)) return;
    await deleteRoutine(r.id);
    await loadRoutines();
    toast('Deleted', 'info');
  }
</script>

<div class="page fade-in">
  <div class="spread" style="margin-bottom:6px">
    <h1 class="page-title">Routines</h1>
    <button class="btn btn-primary" onclick={newRoutine}>＋ New</button>
  </div>
  <div class="muted" style="margin-bottom:16px">Save a named set of exercises (like “Strength B”) and load the whole thing in one tap when you log a workout.</div>

  {#if $routines.length === 0}
    <div class="empty card" style="padding:30px">
      <div class="big"><Icon name="dumbbell" size={30} /></div>
      <div style="font-weight:600;color:var(--text)">No routines yet</div>
      <div class="muted" style="margin:6px 0 14px">Create one, or tick “Save as routine” while logging a workout.</div>
      <button class="btn btn-primary" onclick={newRoutine}>Create a routine</button>
    </div>
  {:else}
    <div class="list">
      {#each $routines as r (r.id)}
        <div class="ritem card" role="button" tabindex="0" onclick={() => edit(r)} onkeydown={() => {}}>
          <div class="rinfo">
            <div class="rname">{r.name}</div>
            <div class="rex">{r.exercises.map((e) => e.name).join(' · ') || 'No exercises'}</div>
          </div>
          <button class="del" onclick={(e) => { e.stopPropagation(); remove(r); }} aria-label="Delete"><Icon name="trash" size={17} /></button>
        </div>
      {/each}
    </div>
  {/if}

  <button class="btn btn-ghost btn-block" style="margin-top:16px" onclick={() => navigate('workouts')}>← Back to workouts</button>
</div>

<Modal bind:open={editorOpen} title={editingId ? 'Edit routine' : 'New routine'}>
  <div class="stack">
    <div>
      <label for="r-name">Routine name</label>
      <input id="r-name" bind:value={name} placeholder="e.g. Strength B" />
    </div>
    <div>
      <label style="margin-bottom:6px">Exercises</label>
      <div class="exlist">
        {#each exercises as ex, i (i)}
          <div class="exrow">
            <input class="exname" bind:value={ex.name} placeholder="Exercise {i + 1}" />
            <div class="exnums">
              <input type="number" inputmode="numeric" bind:value={ex.sets} placeholder="sets" />
              <input type="number" inputmode="numeric" bind:value={ex.reps} placeholder="reps" />
              <div class="loadwrap">
                <input type="number" inputmode="decimal" bind:value={ex.weight} placeholder="load" />
                <span class="unit">{defaultUnit}</span>
              </div>
              <button class="rm" onclick={() => removeExercise(i)} aria-label="Remove">✕</button>
            </div>
          </div>
        {/each}
      </div>
      <button class="btn btn-ghost btn-block" onclick={addExercise}>＋ Add exercise</button>
    </div>
    <button class="btn btn-primary btn-block" onclick={save} disabled={!valid}>Save routine</button>
  </div>
</Modal>

<style>
  .list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .ritem {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px;
  }
  .rname {
    font-weight: 700;
  }
  .rex {
    font-size: 13px;
    color: var(--text-dim);
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 68vw;
  }
  .del {
    font-size: 15px;
    opacity: 0.7;
  }
  .exlist {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 10px;
  }
  .exrow {
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: var(--surface-2);
    border-radius: var(--radius-sm);
    padding: 8px;
  }
  .exnums {
    display: grid;
    grid-template-columns: 1fr 1fr 1.4fr 34px;
    gap: 6px;
    align-items: center;
  }
  .exnums input {
    padding: 9px 8px;
    text-align: center;
    background: var(--surface);
  }
  .loadwrap {
    position: relative;
  }
  .loadwrap input {
    padding-right: 28px;
  }
  .unit {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 12px;
    color: var(--text-faint);
    pointer-events: none;
  }
  .rm {
    color: var(--text-faint);
    font-size: 15px;
  }
</style>
