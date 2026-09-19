<script lang="ts">
  import { route, navigate, type Route } from '../stores';

  const tabs: { id: Route; label: string; icon: string }[] = [
    { id: 'today', label: 'Today', icon: '📋' },
    { id: 'trends', label: 'Trends', icon: '📈' },
    { id: 'add', label: 'Add', icon: '＋' },
    { id: 'foods', label: 'Foods', icon: '🍎' },
    { id: 'settings', label: 'More', icon: '⚙️' }
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
      <span class="icon">{t.icon}</span>
      {#if t.id !== 'add'}<span class="label">{t.label}</span>{/if}
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
    background: color-mix(in srgb, var(--bg-elev) 92%, transparent);
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
    gap: 2px;
    height: 100%;
    color: var(--text-faint);
    font-size: 11px;
    font-weight: 600;
  }
  .tab .icon {
    font-size: 20px;
    filter: grayscale(0.4);
    opacity: 0.8;
  }
  .tab.active {
    color: var(--accent);
  }
  .tab.active .icon {
    filter: none;
    opacity: 1;
  }
  .fab .icon {
    background: var(--accent);
    color: var(--accent-text);
    width: 46px;
    height: 46px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    font-weight: 700;
    filter: none;
    opacity: 1;
    box-shadow: 0 6px 16px color-mix(in srgb, var(--accent) 45%, transparent);
    margin-top: -14px;
  }
</style>
