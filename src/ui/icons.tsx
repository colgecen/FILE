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
        <path d="M2.5 6h11" opacity={0.6} />
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

type LogoSpec = { readonly bg: string; readonly fg: string; readonly text: string };

function logoSpec(name: string): LogoSpec | null {
  const dot = name.lastIndexOf('.');
  const ext = dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
  if (ext === 'ts' || ext === 'tsx') return { bg: '#3178c6', fg: '#ffffff', text: 'TS' };
  if (ext === 'js' || ext === 'jsx' || ext === 'mjs' || ext === 'cjs')
    return { bg: '#f7df1e', fg: '#000000', text: 'JS' };
  if (ext === 'py') return { bg: '#3776ab', fg: '#ffd43b', text: 'Py' };
  if (ext === 'json') return { bg: '#555555', fg: '#ffffff', text: '{}' };
  if (ext === 'css') return { bg: '#2965f1', fg: '#ffffff', text: 'CSS' };
  if (ext === 'html') return { bg: '#e34f26', fg: '#ffffff', text: '5' };
  if (ext === 'md' || ext === 'markdown') return { bg: '#6b7280', fg: '#ffffff', text: 'Md' };
  return null;
}

export function FileLogo({ name }: { readonly name: string }): React.JSX.Element {
  const dot = name.lastIndexOf('.');
  const ext = dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
  const spec = logoSpec(name);
  if (spec === null) {
    return (
      <span className="file-logo file-logo--generic" data-logo={ext === '' ? 'file' : ext}>
        <FileIcon />
      </span>
    );
  }
  const size = 15;
  const fontSize = spec.text.length > 2 ? 5 : 6.5;
  return (
    <svg
      className="file-logo"
      data-logo={ext}
      width={size}
      height={size}
      viewBox="0 0 15 15"
      aria-hidden="true"
      focusable="false"
    >
      <rect x={0.5} y={0.5} width={14} height={14} fill={spec.bg} />
      <text
        x={7.5}
        y={spec.text.length > 2 ? 10.5 : 11}
        textAnchor="middle"
        fontFamily="monospace"
        fontWeight="bold"
        fontSize={fontSize}
        fill={spec.fg}
      >
        {spec.text}
      </text>
    </svg>
  );
}
