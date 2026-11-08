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
  // macOS tarzı dolu klasör: gövde dolu, ortasında dosyaların açıldığı boşluk (yarık).
  // Kapalı ve açık durumlar farklı silüet: kapalıda dar yarık, açıkta kapak yukarı kalkar
  // ve içerik (bir belge) yarıkta görünür.
  if (open) {
    return (
      <svg
        width={14}
        height={14}
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M2 2.2a1 1 0 0 1 1-1h3l1.2 1.5H13a1 1 0 0 1 1 1v1.5H2z" />
        <path d="M2 5h12v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5z" />
        <rect x={2} y={4.2} width={12} height={1.6} fill="rgba(0,0,0,0.22)" />
        <rect x={4} y={7} width={8} height={1} fill="rgba(255,255,255,0.45)" />
        <rect x={4} y={9} width={6} height={1} fill="rgba(255,255,255,0.45)" />
      </svg>
    );
  }
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 3a1 1 0 0 1 1-1h3l1.2 1.5H13a1 1 0 0 1 1 1v1.5H2z" />
      <path d="M2 6h12v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6z" />
      <rect x={2} y={5} width={12} height={1.6} fill="rgba(0,0,0,0.22)" />
    </svg>
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

const LOGO_MAP: Readonly<Record<string, LogoSpec>> = {
  // Web
  ts: { bg: '#3178c6', fg: '#ffffff', text: 'TS' },
  tsx: { bg: '#3178c6', fg: '#ffffff', text: 'TS' },
  js: { bg: '#f7df1e', fg: '#000000', text: 'JS' },
  jsx: { bg: '#f7df1e', fg: '#000000', text: 'JS' },
  mjs: { bg: '#f7df1e', fg: '#000000', text: 'JS' },
  cjs: { bg: '#f7df1e', fg: '#000000', text: 'JS' },
  html: { bg: '#e34f26', fg: '#ffffff', text: '5' },
  css: { bg: '#2965f1', fg: '#ffffff', text: 'CSS' },
  scss: { bg: '#cd6799', fg: '#ffffff', text: 'SC' },
  sass: { bg: '#cd6799', fg: '#ffffff', text: 'SA' },
  less: { bg: '#1d365d', fg: '#ffffff', text: 'LESS' },
  svg: { bg: '#ffb13b', fg: '#000000', text: 'SVG' },
  vue: { bg: '#42b883', fg: '#ffffff', text: 'VUE' },
  svelte: { bg: '#ff3e00', fg: '#ffffff', text: 'SV' },
  // Veri
  json: { bg: '#555555', fg: '#ffffff', text: '{}' },
  yaml: { bg: '#cb171e', fg: '#ffffff', text: 'YML' },
  yml: { bg: '#cb171e', fg: '#ffffff', text: 'YML' },
  xml: { bg: '#e37933', fg: '#ffffff', text: 'XML' },
  toml: { bg: '#9c4221', fg: '#ffffff', text: 'TOML' },
  csv: { bg: '#217346', fg: '#ffffff', text: 'CSV' },
  // Programlama
  py: { bg: '#3776ab', fg: '#ffd43b', text: 'Py' },
  rs: { bg: '#dea584', fg: '#000000', text: 'Rs' },
  go: { bg: '#00add8', fg: '#ffffff', text: 'Go' },
  java: { bg: '#b07219', fg: '#ffffff', text: 'Ja' },
  kt: { bg: '#a97bff', fg: '#ffffff', text: 'Kt' },
  c: { bg: '#555555', fg: '#ffffff', text: 'C' },
  cpp: { bg: '#f34b7d', fg: '#ffffff', text: 'C++' },
  cc: { bg: '#f34b7d', fg: '#ffffff', text: 'C++' },
  cxx: { bg: '#f34b7d', fg: '#ffffff', text: 'C++' },
  h: { bg: '#555555', fg: '#ffffff', text: 'H' },
  hpp: { bg: '#f34b7d', fg: '#ffffff', text: 'H' },
  cs: { bg: '#178600', fg: '#ffffff', text: 'C#' },
  rb: { bg: '#cc342d', fg: '#ffffff', text: 'Rb' },
  php: { bg: '#4f5d95', fg: '#ffffff', text: 'PHP' },
  sh: { bg: '#89e051', fg: '#000000', text: 'Sh' },
  bash: { bg: '#89e051', fg: '#000000', text: 'Sh' },
  sql: { bg: '#e38c00', fg: '#ffffff', text: 'SQL' },
  swift: { bg: '#f05138', fg: '#ffffff', text: 'Sw' },
  // İşaretleme / doküman
  md: { bg: '#6b7280', fg: '#ffffff', text: 'Md' },
  markdown: { bg: '#6b7280', fg: '#ffffff', text: 'Md' },
  txt: { bg: '#9ca3af', fg: '#1f2937', text: 'TXT' },
  pdf: { bg: '#dc2626', fg: '#ffffff', text: 'PDF' },
  // Yapılandırma / meta
  env: { bg: '#ecd53f', fg: '#000000', text: 'ENV' },
  lock: { bg: '#6b7280', fg: '#ffffff', text: '🔒' },
  gitignore: { bg: '#f05032', fg: '#ffffff', text: 'Git' },
  dockerfile: { bg: '#2496ed', fg: '#ffffff', text: 'Dk' },
  makefile: { bg: '#6b7280', fg: '#ffffff', text: 'Mk' },
  // Görüntü
  png: { bg: '#10b981', fg: '#ffffff', text: 'IMG' },
  jpg: { bg: '#10b981', fg: '#ffffff', text: 'IMG' },
  jpeg: { bg: '#10b981', fg: '#ffffff', text: 'IMG' },
  gif: { bg: '#10b981', fg: '#ffffff', text: 'IMG' },
  webp: { bg: '#10b981', fg: '#ffffff', text: 'IMG' },
  ico: { bg: '#10b981', fg: '#ffffff', text: 'IMG' },
};

function logoSpec(name: string): LogoSpec | null {
  const dot = name.lastIndexOf('.');
  const ext = dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
  const base = name.toLowerCase();
  if (base === 'dockerfile' || base === 'makefile') {
    return LOGO_MAP[base] ?? null;
  }
  if (ext === '') return null;
  return LOGO_MAP[ext] ?? null;
}

export function FileLogo({ name }: { readonly name: string }): React.JSX.Element {
  const dot = name.lastIndexOf('.');
  const ext = dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
  const spec = logoSpec(name);
  if (spec === null) {
    // Bilinmeyen tür: uzantıyı gri bir rozet olarak göster (her dosya bir ikon alır).
    const label = ext === '' ? 'FILE' : ext.slice(0, 4).toUpperCase();
    return (
      <span className="file-logo file-logo--generic" data-logo={ext === '' ? 'file' : ext}>
        <svg
          className="file-logo"
          width={15}
          height={15}
          viewBox="0 0 15 15"
          aria-hidden="true"
          focusable="false"
        >
          <rect x={0.5} y={0.5} width={14} height={14} fill="#6b7280" />
          <text
            x={7.5}
            y={label.length > 3 ? 10 : 11}
            textAnchor="middle"
            fontFamily="monospace"
            fontWeight="bold"
            fontSize={label.length > 3 ? 4.5 : 6}
            fill="#ffffff"
          >
            {label}
          </text>
        </svg>
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
