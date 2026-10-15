type IconProps = { readonly size?: number };

function Svg({
  size = 14,
  children,
}: IconProps & { readonly children: React.ReactNode }): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function FolderIcon({ open = false }: { readonly open?: boolean }): React.JSX.Element {
  if (open) {
    return (
      <Svg>
        <path d="M1.5 4.5a1 1 0 0 1 1-1h3l1.2 1.5H13a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V4.5Z" />
      </Svg>
    );
  }
  return (
    <Svg>
      <path d="M1.5 5a1 1 0 0 1 1-1h3l1.2 1.5H13a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V5Z" />
    </Svg>
  );
}

export function FileIcon(): React.JSX.Element {
  return (
    <Svg>
      <path d="M4 1.5h5.5L12.5 4.5V14.5H4V1.5Z" />
      <path d="M9.5 1.5v3h3" />
    </Svg>
  );
}

export function ChevronRightIcon(): React.JSX.Element {
  return (
    <Svg size={12}>
      <path d="M6 3.5 10.5 8 6 12.5" />
    </Svg>
  );
}

export function ChevronDownIcon(): React.JSX.Element {
  return (
    <Svg size={12}>
      <path d="M3.5 6 8 10.5 12.5 6" />
    </Svg>
  );
}

export function SplitVerticalIcon(): React.JSX.Element {
  return (
    <Svg>
      <rect x="2" y="2" width="12" height="12" />
      <path d="M8 2v12" />
    </Svg>
  );
}

export function SplitHorizontalIcon(): React.JSX.Element {
  return (
    <Svg>
      <rect x="2" y="2" width="12" height="12" />
      <path d="M2 8h12" />
    </Svg>
  );
}

export type FileBadge = { readonly label: string; readonly variant: string };

export function fileBadge(name: string): FileBadge {
  const dot = name.lastIndexOf('.');
  const ext = dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
  if (ext === 'ts' || ext === 'tsx') return { label: 'TS', variant: 'tab-bar__icon--accent' };
  if (ext === 'js' || ext === 'jsx' || ext === 'mjs' || ext === 'cjs')
    return { label: 'JS', variant: 'tab-bar__icon--warm' };
  if (ext === 'py') return { label: 'PY', variant: 'tab-bar__icon--warm' };
  if (ext === 'json') return { label: 'JSON', variant: 'tab-bar__icon--soft' };
  if (ext === 'css') return { label: 'CSS', variant: 'tab-bar__icon--soft' };
  if (ext === 'html') return { label: 'HTML', variant: 'tab-bar__icon--soft' };
  if (ext === 'md' || ext === 'markdown') return { label: 'MD', variant: '' };
  if (ext.length <= 4 && ext.length > 0) return { label: ext.toUpperCase(), variant: '' };
  return { label: 'TXT', variant: '' };
}
