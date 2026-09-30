<script lang="ts">
  import type { Workout, ExerciseEntry, Routine, WeightUnit } from '../types';
  import { uid } from '../db';
  import { settings } from '../stores';

  let {
    workout,
    onSave,
    onCancel,
    onSaveRoutine,
    canSaveRoutine = true
  }: {
    workout: Partial<Workout>;
    onSave: (w: Workout, alsoRoutine: boolean) => void;
    onCancel?: () => void;
    onSaveRoutine?: (r: Routine) => void;
    canSaveRoutine?: boolean;
  } = $props();

  const defaultUnit: WeightUnit = $derived($settings.units === 'imperial' ? 'lb' : 'kg');

  let name = $state(workout.name ?? '');
  let burned = $state<number | string>(workout.caloriesBurned ?? '');
  let note = $state(workout.note ?? '');
  let exercises = $state<ExerciseEntry[]>(
    (workout.exercises ?? []).map((e) => ({ ...e }))
  );
  let saveAsRoutine = $state(false);

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

  const valid = $derived(
    name.trim().length > 0 || numOrUndef(burned) != null || exercises.some((e) => e.name.trim())
  );

  function build(): Workout {
    const now = Date.now();
    const cleanExercises = exercises
      .filter((e) => e.name.trim())
      .map((e) => ({
        name: e.name.trim(),
        sets: numOrUndef(e.sets),
        reps: numOrUndef(e.reps),
        weight: numOrUndef(e.weight),
        weightUnit: e.weight != null && e.weight !== ('' as any) ? e.weightUnit ?? defaultUnit : undefined
      }));
    return {
      id: workout.id ?? uid(),
      date: workout.date!,
      name: name.trim() || undefined,
      routineId: workout.routineId,
      exercises: cleanExercises,
      caloriesBurned: numOrUndef(burned),
      note: note.trim() || undefined,
      loggedAt: workout.loggedAt ?? now
    };
  }

  function save() {
    if (!valid) return;
    onSave(build(), saveAsRoutine);
  }
</script>

<div class="stack">
  <div>
    <label for="wk-name">Workout name</label>
    <input id="wk-name" bind:value={name} placeholder="e.g. Strength B, or Run" />
  </div>

  <div>
    <label for="wk-burn">Total calories burned <span class="faint">(from WHOOP — optional)</span></label>
    <div class="row" style="gap:10px">
      <input id="wk-burn" type="number" inputmode="numeric" bind:value={burned} placeholder="e.g. 540" />
      <span class="muted">kcal</span>
    </div>
  </div>

  <div>
    <div class="spread" style="margin-bottom:6px">
      <label style="margin:0">Exercises <span class="faint">(optional)</span></label>
      <span class="faint small">sets · reps · load</span>
    </div>
    {#if exercises.length === 0}
      <div class="noex muted">No exercises added — that's fine. Add them only if you want the detail.</div>
    {/if}
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
            <button class="rm" onclick={() => removeExercise(i)} aria-label="Remove exercise">✕</button>
          </div>
        </div>
      {/each}
    </div>
    <button class="btn btn-ghost btn-block" onclick={addExercise}>＋ Add exercise</button>
  </div>

  {#if canSaveRoutine && exercises.some((e) => e.name.trim())}
    <label class="check">
      <input type="checkbox" bind:checked={saveAsRoutine} />
      <span>Save this as a reusable routine{name.trim() ? ` (“${name.trim()}”)` : ''}</span>
    </label>
  {/if}

  <div class="actions">
    {#if onCancel}<button class="btn btn-ghost" onclick={onCancel}>Cancel</button>{/if}
    <button class="btn btn-primary" style="flex:1" onclick={save} disabled={!valid}>Save workout</button>
  </div>
</div>

<style>
  .noex {
    font-size: 13px;
    padding: 10px 12px;
    background: var(--surface-2);
    border-radius: var(--radius-sm);
    margin-bottom: 10px;
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
  .check {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--text-dim);
    font-weight: 500;
  }
  .check input {
    width: 18px;
    height: 18px;
  }
  .small {
    font-size: 12px;
  }
  .actions {
    display: flex;
    gap: 10px;
  }
</style>
