import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { toast } from './lib/stores';

// Surface otherwise-silent failures (e.g. a storage write that fails on iOS)
// as a visible message instead of a button that appears to do nothing.
function describe(err: unknown): string {
  if (err instanceof Error) return err.message || err.name;
  if (typeof err === 'string') return err;
  return 'Something went wrong.';
}

window.addEventListener('unhandledrejection', (e) => {
  toast(`Couldn't save: ${describe(e.reason)}`, 'error');
});
window.addEventListener('error', (e) => {
  if (e.message) toast(`Error: ${e.message}`, 'error');
});

const app = mount(App, { target: document.getElementById('app')! });

export default app;
