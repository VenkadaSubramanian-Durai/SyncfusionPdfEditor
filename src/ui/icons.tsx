// Small inline icon set (24x24, stroke icons) used by our own UI parts.
// The viewer's toolbars keep Syncfusion's own icons.
const PATHS: Record<string, string> = {
  view: 'M5 4l6 15 2-6 6-2z',
  annotate: 'M4 20h16M7 15l8-8 3 3-8 8H7z',
  sign: 'M3 17c3-7 5-10 7-10s-1 10 2 10 3-5 5-5 2 3 4 3M3 21h18',
  redact: 'M3 5h18M3 19h12M3 8h18v8H3z',
  organize: 'M4 3h11v15H4zM9 21h11V8',
  compare: 'M3 4h7v16H3zM14 4h7v16h-7zM10 9h4M12 7l2 2-2 2M14 15h-4M12 13l-2 2 2 2',
  pages: 'M4 3h7v8H4zM13 3h7v8h-7zM4 13h7v8H4zM13 13h7v8h-7z',
  search: 'M11 5a6 6 0 100 12 6 6 0 000-12zM20 20l-4.5-4.5',
  prev: 'M15 6l-6 6 6 6',
  next: 'M9 6l6 6-6 6',
  minus: 'M12 4a8 8 0 100 16 8 8 0 000-16zM8.5 12h7',
  plus: 'M12 4a8 8 0 100 16 8 8 0 000-16zM8.5 12h7M12 8.5v7',
  fit: 'M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4M8 12h8',
  undo: 'M9 7L4 12l5 5M4 12h11a5 5 0 010 10h-2',
  redo: 'M15 7l5 5-5 5M20 12H9a5 5 0 000 10h2',
  comment: 'M5 5h14v10H10l-5 4z',
  share:
    'M6 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM18 3.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM18 15.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM8.2 11l7.6-4M8.2 13l7.6 4',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  print: 'M7 9V4h10v5M7 17H5a2 2 0 01-2-2v-4a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2h-2M7 14h10v6H7z',
  open: 'M3 7h6l2 2h10v10H3z',
  upload: 'M12 16V4M7 9l5-5 5 5M4 16v4h16v-4',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  close: 'M6 6l12 12M18 6L6 18',
  swap: 'M7 4L3 8l4 4M3 8h14M17 12l4 4-4 4M21 16H7',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4',
  home: 'M3 11l9-7 9 7v9h-6v-6H9v6H3z',
};

export function Icon({ name, size = 19 }: { name: string; size?: number }) {
  return (
    <svg
      className="i"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === 'more' ? 3 : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name] ?? ''} />
    </svg>
  );
}
