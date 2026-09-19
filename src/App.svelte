<script lang="ts">
  import { onMount } from 'svelte';
  import { route, settings, loadAll, navigate } from './lib/stores';
  import { backupDue } from './lib/backup';
  import TabBar from './lib/components/TabBar.svelte';
  import Toasts from './lib/components/Toasts.svelte';
  import Today from './lib/views/Today.svelte';
  import Add from './lib/views/Add.svelte';
  import Foods from './lib/views/Foods.svelte';
  import Trends from './lib/views/Trends.svelte';
  import Weight from './lib/views/Weight.svelte';
  import Goals from './lib/views/Goals.svelte';
  import Settings from './lib/views/Settings.svelte';

  let ready = $state(false);
  let showBackupNudge = $state(false);

  onMount(async () => {
    await loadAll();
    ready = true;
    showBackupNudge = backupDue($settings.lastBackupAt, $settings.backupReminderDays);
  });
</script>

<div class="app-shell">
  {#if ready}
    {#if showBackupNudge}
      <div class="nudge">
        <span>💾 It's been a while — a quick backup keeps your data safe.</span>
        <div class="nudge-actions">
          <button onclick={() => { showBackupNudge = false; navigate('settings'); }}>Back up</button>
          <button class="dismiss" onclick={() => (showBackupNudge = false)} aria-label="Dismiss">✕</button>
        </div>
      </div>
    {/if}

    {#if $route === 'today'}
      <Today />
    {:else if $route === 'add'}
      <Add />
    {:else if $route === 'foods'}
      <Foods />
    {:else if $route === 'trends'}
      <Trends />
    {:else if $route === 'weight'}
      <Weight />
    {:else if $route === 'goals'}
      <Goals />
    {:else if $route === 'settings'}
      <Settings />
    {/if}

    <TabBar />
    <Toasts />
  {:else}
    <div class="boot">
      <div class="logo">🍃</div>
      <div class="name">CaloTrack</div>
    </div>
  {/if}
</div>

<style>
  .nudge {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin: calc(var(--safe-top) + 8px) 12px 0;
    padding: 10px 12px;
    background: color-mix(in srgb, var(--accent) 14%, var(--surface));
    border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border));
    border-radius: 12px;
    font-size: 13px;
    font-weight: 500;
  }
  .nudge-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .nudge-actions button {
    font-weight: 700;
    color: var(--accent);
    padding: 6px 8px;
  }
  .dismiss {
    color: var(--text-faint) !important;
  }
  .boot {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: var(--text-dim);
  }
  .logo {
    font-size: 52px;
  }
  .name {
    font-weight: 800;
    font-size: 20px;
    letter-spacing: -0.01em;
  }
</style>
