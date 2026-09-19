<script lang="ts">
  import { toasts } from '../stores';
</script>

<div class="wrap">
  {#each $toasts as t (t.id)}
    <div class="toast {t.kind}">{t.message}</div>
  {/each}
</div>

<style>
  .wrap {
    position: fixed;
    left: 0;
    right: 0;
    bottom: calc(var(--tab-h) + var(--safe-bottom) + 14px);
    z-index: 60;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    pointer-events: none;
    padding: 0 16px;
  }
  .toast {
    background: #1e293b;
    color: #f8fafc;
    padding: 11px 16px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    box-shadow: var(--shadow-lg);
    max-width: 92%;
    animation: pop 0.2s ease;
  }
  .toast.success {
    background: #166534;
  }
  .toast.error {
    background: #991b1b;
  }
  @keyframes pop {
    from {
      transform: translateY(8px);
      opacity: 0;
    }
    to {
      transform: none;
      opacity: 1;
    }
  }
</style>
