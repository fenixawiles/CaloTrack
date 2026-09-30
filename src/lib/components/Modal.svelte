<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  let {
    open = $bindable(false),
    title = '',
    onClose,
    children
  }: {
    open?: boolean;
    title?: string;
    onClose?: () => void;
    children?: Snippet;
  } = $props();

  function close() {
    open = false;
    onClose?.();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }
</script>

<svelte:window on:keydown={onKey} />

{#if open}
  <div class="scrim" role="button" tabindex="-1" onclick={close} onkeydown={() => {}}></div>
  <div class="sheet fade-in" role="dialog" aria-modal="true" aria-label={title}>
    <div class="grabber"></div>
    <div class="head">
      <h3>{title}</h3>
      <button class="x" onclick={close} aria-label="Close"><Icon name="x" size={18} /></button>
    </div>
    <div class="body">
      {@render children?.()}
    </div>
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(2, 6, 23, 0.55);
    z-index: 40;
    animation: fade 0.18s ease;
  }
  .sheet {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 50;
    background: var(--bg-elev);
    border-top-left-radius: 22px;
    border-top-right-radius: 22px;
    box-shadow: var(--shadow-lg);
    max-width: 560px;
    margin: 0 auto;
    max-height: 90dvh;
    display: flex;
    flex-direction: column;
    padding-bottom: var(--safe-bottom);
    animation: rise 0.24s cubic-bezier(0.2, 0.9, 0.3, 1);
  }
  @keyframes rise {
    from {
      transform: translateY(100%);
    }
    to {
      transform: none;
    }
  }
  .grabber {
    width: 40px;
    height: 4px;
    border-radius: 999px;
    background: var(--border);
    margin: 10px auto 4px;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 18px 10px;
    border-bottom: 1px solid var(--border);
  }
  .head h3 {
    font-size: 18px;
  }
  .x {
    color: var(--text-dim);
    font-size: 16px;
    padding: 6px;
  }
  .body {
    padding: 16px 18px 22px;
    overflow-y: auto;
  }
</style>
