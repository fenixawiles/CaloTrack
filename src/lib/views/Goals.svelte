<script lang="ts">
  import { settings, currentGoal, updateSettings, loadGoal, toast, navigate, dataVersion } from '../stores';
  import { saveGoal, getWeights, uid } from '../db';
  import type { Goal, Sex, ActivityLevel } from '../types';
  import { todayKey } from '../date';
  import { tdee, calorieTargetForRate } from '../nutrition';
  import { kgToDisplay, displayToKg, weightUnitLabel, cmToDisplay, displayToCm, heightUnitLabel } from '../units';

  const unit = $derived($settings.units);

  let latestKg = $state<number | null>(null);
  $effect(() => {
    $dataVersion;
    getWeights().then((w) => (latestKg = w.length ? w[w.length - 1].value : null));
  });

  // ----- calorie target -----
  let calorieTarget = $state<number | string>($currentGoal?.dailyCalorieTarget ?? '');

  // ----- weight goal -----
  let targetWeight = $state<number | string>(
    $currentGoal?.targetWeightKg != null ? Number(kgToDisplay($currentGoal.targetWeightKg, $settings.units).toFixed(1)) : ''
  );
  let weeklyRate = $state<number | string>(
    $currentGoal?.weeklyRateKg != null ? Number(kgToDisplay(Math.abs($currentGoal.weeklyRateKg), $settings.units).toFixed(2)) : ''
  );
  let direction = $state<'lose' | 'gain' | 'maintain'>(
    !$currentGoal?.weeklyRateKg ? 'maintain' : $currentGoal.weeklyRateKg < 0 ? 'lose' : 'gain'
  );

  // ----- TDEE helper -----
  let showCalc = $state(false);
  let sex = $state<Sex>($settings.profile.sex ?? 'female');
  let age = $state<number | string>($settings.profile.age ?? '');
  let height = $state<number | string>(
    $settings.profile.heightCm != null ? Number(cmToDisplay($settings.profile.heightCm, $settings.units).toFixed(1)) : ''
  );
  let activity = $state<ActivityLevel>($settings.profile.activityLevel ?? 'moderate');
  let calcWeight = $state<number | string>(
    latestKg != null ? Number(kgToDisplay(latestKg, $settings.units).toFixed(1)) : ''
  );

  const activityOpts: { id: ActivityLevel; label: string }[] = [
    { id: 'sedentary', label: 'Sedentary (little exercise)' },
    { id: 'light', label: 'Light (1–3 days/wk)' },
    { id: 'moderate', label: 'Moderate (3–5 days/wk)' },
    { id: 'active', label: 'Active (6–7 days/wk)' },
    { id: 'very_active', label: 'Very active (physical job)' }
  ];

  const computed = $derived.by(() => {
    const wKg = Number(calcWeight) ? displayToKg(Number(calcWeight), unit) : latestKg ?? 0;
    return tdee(
      { sex, age: Number(age) || undefined, heightCm: Number(height) ? displayToCm(Number(height), unit) : undefined, activityLevel: activity },
      wKg
    );
  });

  function applyCalc() {
    if (!computed) return;
    // Persist profile for next time.
    updateSettings({
      profile: {
        sex,
        age: Number(age) || undefined,
        heightCm: Number(height) ? displayToCm(Number(height), unit) : undefined,
        activityLevel: activity
      }
    });
    const rateKg =
      direction === 'maintain'
        ? 0
        : (direction === 'lose' ? -1 : 1) * (Number(weeklyRate) ? displayToKg(Number(weeklyRate), unit) : 0);
    const suggested = calorieTargetForRate(computed.tdee, rateKg);
    calorieTarget = Math.max(1000, suggested);
    toast(`Suggested ${calorieTarget} kcal/day from your TDEE`, 'success');
  }

  async function save() {
    const g: Goal = {
      id: uid(),
      activeFrom: todayKey(),
      createdAt: Date.now(),
      dailyCalorieTarget: Number(calorieTarget) > 0 ? Math.round(Number(calorieTarget)) : undefined,
      targetWeightKg: Number(targetWeight) > 0 ? displayToKg(Number(targetWeight), unit) : undefined,
      startWeightKg: latestKg ?? undefined,
      weeklyRateKg:
        direction === 'maintain'
          ? 0
          : (direction === 'lose' ? -1 : 1) * (Number(weeklyRate) ? displayToKg(Number(weeklyRate), unit) : 0)
    };
    await saveGoal(g);
    await loadGoal();
    toast('Goals saved', 'success');
    navigate('today');
  }
</script>

<div class="page fade-in">
  <h1 class="page-title">Goals</h1>
  <div class="muted" style="margin-bottom:16px">Set targets that fit your life. You can change these any time — past days aren't affected.</div>

  <!-- Calorie target -->
  <div class="card block">
    <h3>Daily calorie target</h3>
    <div class="row" style="gap:10px;margin-top:10px">
      <input type="number" inputmode="numeric" bind:value={calorieTarget} placeholder="e.g. 2000" />
      <span class="muted">kcal</span>
    </div>
    <button class="btn btn-ghost btn-block" style="margin-top:12px" onclick={() => (showCalc = !showCalc)}>
      🧮 {showCalc ? 'Hide' : 'Help me estimate'} (TDEE)
    </button>

    {#if showCalc}
      <div class="calc">
        <div class="grid2">
          <div>
            <label>Sex</label>
            <select bind:value={sex}>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </div>
          <div>
            <label>Age</label>
            <input type="number" inputmode="numeric" bind:value={age} placeholder="years" />
          </div>
        </div>
        <div class="grid2">
          <div>
            <label>Height ({heightUnitLabel(unit)})</label>
            <input type="number" inputmode="decimal" bind:value={height} />
          </div>
          <div>
            <label>Weight ({weightUnitLabel(unit)})</label>
            <input type="number" inputmode="decimal" bind:value={calcWeight} placeholder={latestKg ? '' : 'current'} />
          </div>
        </div>
        <div>
          <label>Activity level</label>
          <select bind:value={activity}>
            {#each activityOpts as a}<option value={a.id}>{a.label}</option>{/each}
          </select>
        </div>
        {#if computed}
          <div class="result">
            <span>BMR <b>{computed.bmr.toLocaleString()}</b></span>
            <span>Maintenance <b>{computed.tdee.toLocaleString()}</b> kcal/day</span>
          </div>
          <button class="btn btn-primary btn-block" onclick={applyCalc}>Use this for my target</button>
        {:else}
          <div class="muted small">Fill in all fields to see your estimate.</div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Weight goal -->
  <div class="card block">
    <h3>Weight goal</h3>
    <div class="chips" style="margin:10px 0">
      <button class="pill" class:active={direction === 'lose'} onclick={() => (direction = 'lose')}>Lose</button>
      <button class="pill" class:active={direction === 'maintain'} onclick={() => (direction = 'maintain')}>Maintain</button>
      <button class="pill" class:active={direction === 'gain'} onclick={() => (direction = 'gain')}>Gain</button>
    </div>
    {#if direction !== 'maintain'}
      <div class="grid2">
        <div>
          <label>Target weight ({weightUnitLabel(unit)})</label>
          <input type="number" inputmode="decimal" bind:value={targetWeight} />
        </div>
        <div>
          <label>Rate ({weightUnitLabel(unit)}/week)</label>
          <input type="number" inputmode="decimal" step="0.1" bind:value={weeklyRate} placeholder="e.g. 0.5" />
        </div>
      </div>
      <div class="muted small" style="margin-top:8px">A gentle 0.25–0.5 {weightUnitLabel(unit)}/week is sustainable and kind to yourself.</div>
    {/if}
  </div>

  <button class="btn btn-primary btn-block" onclick={save}>Save goals</button>
</div>

<style>
  .block {
    padding: 16px;
    margin-bottom: 14px;
  }
  .block h3 {
    font-size: 16px;
  }
  .calc {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .grid2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .result {
    display: flex;
    justify-content: space-between;
    background: var(--surface-2);
    border-radius: var(--radius-sm);
    padding: 12px 14px;
    font-size: 14px;
    color: var(--text-dim);
  }
  .result b {
    color: var(--text);
    font-size: 16px;
  }
  .chips {
    display: flex;
    gap: 8px;
  }
  .chips .pill {
    flex: 1;
    justify-content: center;
    cursor: pointer;
  }
  .small {
    font-size: 12px;
  }
</style>
