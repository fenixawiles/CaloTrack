<script lang="ts" module>
  // Minimal line-icon set (Feather/Lucide style), stroke = currentColor.
  export const ICONS: Record<string, string> = {
    today: '<path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/><rect x="8" y="2.5" width="8" height="4" rx="1.2"/><path d="M8 12h8M8 16h5"/>',
    trends: '<path d="M3 3v18h18"/><path d="M7 14l3.5-4 3 3L21 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    apple: '<path d="M12 8.5c-1.2-2.2-5-2.2-6 .3-1 2.6.8 8 3 9.7.9.7 1.9.7 3 .2.5-.2 1.1-.2 1.6 0 1.1.5 2.1.5 3-.2 2.2-1.7 4-7.1 3-9.7-1-2.5-4.8-2.5-6-.3Z"/><path d="M12 8.5c.2-2 1.4-3.4 3-3.5"/>',
    more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
    dumbbell: '<rect x="1.5" y="9" width="3" height="6" rx="1"/><rect x="19.5" y="9" width="3" height="6" rx="1"/><rect x="4.5" y="10.5" width="2.5" height="3" rx=".8"/><rect x="17" y="10.5" width="2.5" height="3" rx=".8"/><path d="M7 12h10"/>',
    gauge: '<path d="M3.5 18a9 9 0 1 1 17 0"/><path d="M12 14l4-4"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
    flame: '<path d="M12 3c.5 2.5 2 4.2 3.5 5.6C17 10 18 11.8 18 14a6 6 0 0 1-12 0c0-1 .3-2 1-2.8.4 1 1.3 1.6 2.2 1.6A2.3 2.3 0 0 0 11.5 10c0-1.3-.7-2-1-3-.6-1.9.3-3.3 1.5-4Z"/>',
    camera: '<path d="M14.5 4l1.5 2.5H20a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V8A1.5 1.5 0 0 1 4 6.5h4L9.5 4Z"/><circle cx="12" cy="12.5" r="3.2"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2"/><path d="M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 17l-5.3 2.7 1-5.8L3.5 9.7l5.9-.9Z"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12l5 5L20 6"/>',
    'chevron-left': '<path d="M15 5l-7 7 7 7"/>',
    'chevron-right': '<path d="M9 5l7 7-7 7"/>',
    'chevron-down': '<path d="M6 9l6 6 6-6"/>',
    'chevron-up': '<path d="M6 15l6-6 6 6"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 4v5h-5"/>',
    download: '<path d="M12 3v12"/><path d="M7 11l5 4 5-4"/><path d="M4 20h16"/>',
    upload: '<path d="M12 21V9"/><path d="M7 13l5-4 5 4"/><path d="M4 4h16"/>',
    pencil: '<path d="M4 20h4L18.5 9.5a2 2 0 0 0-2.8-2.8L5 17v3Z"/><path d="M14 7l3 3"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
    scan: '<path d="M4 7V5.5A1.5 1.5 0 0 1 5.5 4H7M17 4h1.5A1.5 1.5 0 0 1 20 5.5V7M20 17v1.5a1.5 1.5 0 0 1-1.5 1.5H17M7 20H5.5A1.5 1.5 0 0 1 4 18.5V17"/><path d="M7 8v8M10 8v8M13.5 8v8M17 8v8"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15"/>',
    scale: '<path d="M12 3v3"/><rect x="3.5" y="6" width="17" height="15" rx="2"/><path d="M9 10h6"/>',
    heart: '<path d="M12 20s-7-4.4-9.2-8.3C1.3 8.9 2.6 5.5 5.8 5.1 8 4.8 9.5 6 12 8.5 14.5 6 16 4.8 18.2 5.1c3.2.4 4.5 3.8 3 6.6C19 15.6 12 20 12 20Z"/>'
  };
</script>

<script lang="ts">
  let {
    name,
    size = 22,
    stroke = 1.75,
    fill = 'none',
    class: cls = ''
  }: { name: string; size?: number; stroke?: number; fill?: string; class?: string } = $props();
</script>

<svg
  viewBox="0 0 24 24"
  width={size}
  height={size}
  {fill}
  stroke="currentColor"
  stroke-width={stroke}
  stroke-linecap="round"
  stroke-linejoin="round"
  class={cls}
  aria-hidden="true"
>{@html ICONS[name] ?? ''}</svg>

<style>
  svg {
    display: inline-block;
    flex-shrink: 0;
    vertical-align: middle;
  }
</style>
