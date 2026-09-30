<script lang="ts">
  import { route, navigate, type Route } from '../stores';
  import Icon from './Icon.svelte';

  const tabs: { id: Route; label: string; icon: string }[] = [
    { id: 'today', label: 'Today', icon: 'today' },
    { id: 'trends', label: 'Trends', icon: 'trends' },
    { id: 'add', label: 'Add', icon: 'plus' },
    { id: 'foods', label: 'Foods', icon: 'apple' },
    { id: 'settings', label: 'More', icon: 'more' }
  ];
</script>

<nav class="tabbar">
  {#each tabs as t}
    <button
      class="tab"
      class:active={$route === t.id}
      class:fab={t.id === 'add'}
      onclick={() => navigate(t.id)}
      aria-label={t.label}
    >
      {#if t.id === 'add'}
        <span class="fab-btn"><Icon name="plus" size={24} stroke={2.2} /></span>
      {:else}
        <Icon name={t.icon} size={22} />
        <span class="label">{t.label}</span>
      {/if}
    </button>
  {/each}
</nav>

<style>
  .tabbar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 30;
    max-width: 560px;
    margin: 0 auto;
    height: calc(var(--tab-h) + var(--safe-bottom));
    padding-bottom: var(--safe-bottom);
    background: color-mix(in srgb, var(--bg-elev) 90%, transparent);
    backdrop-filter: blur(12px);
    border-top: 1px solid var(--border);
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    align-items: center;
  }
  .tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    height: 100%;
    color: var(--text-faint);
    font-size: 11px;
    font-weight: 550;
  }
  .tab.active {
    color: var(--accent);
  }
  .fab-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: var(--accent);
    color: var(--accent-text);
    margin-top: -12px;
  }
</style>
