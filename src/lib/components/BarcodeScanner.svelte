<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { startScanning } from '../scan';
  import type { IScannerControls } from '@zxing/browser';

  let { onDetected, onCancel }: { onDetected: (code: string) => void; onCancel: () => void } =
    $props();

  let video = $state<HTMLVideoElement>();
  let controls: IScannerControls | null = null;
  let error = $state<string | null>(null);
  let done = false;

  onMount(async () => {
    if (!video) return;
    controls = await startScanning(
      video,
      (text) => {
        if (done) return;
        done = true;
        if (navigator.vibrate) navigator.vibrate(40);
        stop();
        onDetected(text);
      },
      (err) => {
        console.error(err);
        const name = (err as Error)?.name;
        if (name === 'NotAllowedError') {
          error = 'Camera access was blocked. Enable it in your browser settings, or enter the barcode manually.';
        } else if (name === 'NotFoundError') {
          error = 'No camera found on this device.';
        } else {
          error = 'Could not start the camera. You can type the barcode instead.';
        }
      }
    );
  });

  function stop() {
    try {
      controls?.stop();
    } catch {
      /* noop */
    }
    controls = null;
  }

  onDestroy(stop);

  let manual = $state('');
  function submitManual() {
    const code = manual.trim();
    if (code) {
      stop();
      onDetected(code);
    }
  }
</script>

<div class="scanner">
  {#if error}
    <div class="err">{error}</div>
  {:else}
    <div class="viewport">
      <!-- svelte-ignore a11y_media_has_caption -->
      <video bind:this={video} playsinline muted></video>
      <div class="reticle"></div>
      <div class="hint">Point at a barcode</div>
    </div>
  {/if}

  <div class="manual">
    <label for="manual-barcode">Or enter barcode manually</label>
    <div class="row">
      <input id="manual-barcode" inputmode="numeric" placeholder="e.g. 3017620422003" bind:value={manual} />
      <button class="btn btn-primary" onclick={submitManual} disabled={!manual.trim()}>Go</button>
    </div>
  </div>

  <button class="btn btn-ghost btn-block" onclick={() => { stop(); onCancel(); }}>Cancel</button>
</div>

<style>
  .scanner {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .viewport {
    position: relative;
    width: 100%;
    aspect-ratio: 4 / 3;
    background: #000;
    border-radius: var(--radius);
    overflow: hidden;
  }
  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .reticle {
    position: absolute;
    inset: 22% 12%;
    border: 3px solid rgba(255, 255, 255, 0.9);
    border-radius: 14px;
    box-shadow: 0 0 0 2000px rgba(0, 0, 0, 0.25);
  }
  .hint {
    position: absolute;
    bottom: 12px;
    left: 0;
    right: 0;
    text-align: center;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
  }
  .err {
    background: var(--danger-soft);
    color: var(--danger);
    padding: 14px;
    border-radius: var(--radius-sm);
    font-size: 14px;
    font-weight: 500;
  }
</style>
