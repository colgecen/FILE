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
        width={22}
        height={22}
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
      width={22}
      height={22}
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
    <Svg size={16}>
      <path d="M6 3.5 10.5 8 6 12.5" />
    </Svg>
  );
}

export function ChevronDownIcon(): React.JSX.Element {
  return (
    <Svg size={16}>
      <path d="M3.5 6 8 10.5 12.5 6" />
    </Svg>
  );
}

export function NewFileIcon(): React.JSX.Element {
  return (
    <Svg size={18}>
      <path d="M4 1.8h5.2L12 4.6v5.1" />
      <path d="M4 1.8v12.4h4.2" />
      <path d="M9 1.8v3h3" />
      <path d="M11.5 10v4M9.5 12h4" />
    </Svg>
  );
}

export function NewFolderIcon(): React.JSX.Element {
  return (
    <Svg size={18}>
      <path d="M1.8 4.2a1 1 0 0 1 1-1h3l1.2 1.5h4.2" />
      <path d="M1.8 4.2v8.1a1 1 0 0 0 1 1h4.1" />
      <path d="M11.5 8.6v4.8M9.1 11h4.8" />
    </Svg>
  );
}

export function RefreshIcon(): React.JSX.Element {
  return (
    <Svg size={18}>
      <path d="M13.2 6.4A5.4 5.4 0 0 0 3.6 4.2L2 5.8" />
      <path d="M2 2.6v3.2h3.2" />
      <path d="M2.8 9.6a5.4 5.4 0 0 0 9.6 2.2l1.6-1.6" />
      <path d="M14 13.4v-3.2h-3.2" />
    </Svg>
  );
}

export function CollapseAllIcon(): React.JSX.Element {
  return (
    <Svg size={18}>
      <path d="M4 2.8 8 6.4l4-3.6" />
      <path d="M4 13.2 8 9.6l4 3.6" />
      <path d="M3 8h10" />
    </Svg>
  );
}

export function TrashIcon(): React.JSX.Element {
  return (
    <Svg size={13}>
      <path d="M2.8 4.5h10.4" />
      <path d="M6 4.5V3.2h4v1.3" />
      <path d="M4.2 4.5l.6 9h6.4l.6-9" />
      <path d="M6.6 7v4.4M9.4 7v4.4" />
    </Svg>
  );
}

export function MaximizeIcon(): React.JSX.Element {
  return (
    <Svg size={14}>
      <path d="M6 2.5H2.5V6" />
      <path d="M10 2.5h3.5V6" />
      <path d="M6 13.5H2.5V10" />
      <path d="M10 13.5h3.5V10" />
    </Svg>
  );
}

export function RestoreIcon(): React.JSX.Element {
  return (
    <Svg size={14}>
      <path d="M2.5 6H6V2.5" />
      <path d="M13.5 10H10v3.5" />
      <path d="M6 6 2.5 2.5" />
      <path d="M10 10l3.5 3.5" />
    </Svg>
  );
}

export function CloseIcon(): React.JSX.Element {
  return (
    <Svg size={14}>
      <path d="m3.5 3.5 9 9M12.5 3.5l-9 9" />
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

const FILE_ICON_URLS = import.meta.glob<string>('./file-icons/*.svg', {
  eager: true,
  import: 'default',
});

// Simgeler Seti UI'dan (MIT) alınmıştır — bkz. src/ui/file-icons/LICENSE.md.
const FALLBACK_ICON = FILE_ICON_URLS['./file-icons/default.svg'] ?? '';

function iconUrl(name: string): string {
  return FILE_ICON_URLS[`./file-icons/${name}.svg`] ?? FALLBACK_ICON;
}

const NAME_ICONS: Readonly<Record<string, string>> = {
  'package.json': 'npm',
  'package-lock.json': 'npm',
  'npm-shrinkwrap.json': 'npm',
  'yarn.lock': 'yarn',
  'pnpm-lock.yaml': 'lock',
  'tsconfig.json': 'typescript',
  'jsconfig.json': 'javascript',
  'vite.config.ts': 'vite',
  'vite.config.js': 'vite',
  'vite.config.mjs': 'vite',
  'vite.config.mts': 'vite',
  'vite.config.cjs': 'vite',
  'vite.config.cts': 'vite',
  dockerfile: 'docker',
  '.dockerignore': 'docker',
  'docker-compose.yml': 'docker',
  'docker-compose.yaml': 'docker',
  makefile: 'makefile',
  'cmakelists.txt': 'makefile',
  license: 'license',
  licence: 'license',
  copying: 'license',
  '.gitignore': 'git',
  '.gitattributes': 'git',
  '.gitmodules': 'git',
  '.editorconfig': 'editorconfig',
  '.npmrc': 'npm',
  '.npmignore': 'npm',
  '.eslintrc': 'eslint',
  '.eslintrc.js': 'eslint',
  '.eslintrc.cjs': 'eslint',
  '.eslintrc.json': 'eslint',
  '.eslintrc.yml': 'eslint',
  '.eslintrc.yaml': 'eslint',
  '.eslintignore': 'eslint',
  'eslint.config.js': 'eslint',
  'eslint.config.mjs': 'eslint',
  'eslint.config.cjs': 'eslint',
};

const EXT_ICONS: Readonly<Record<string, string>> = {
  ts: 'typescript',
  tsx: 'react',
  js: 'javascript',
  jsx: 'react',
  mjs: 'javascript',
  cjs: 'javascript',
  json: 'json',
  md: 'markdown',
  markdown: 'markdown',
  css: 'css',
  scss: 'sass',
  sass: 'sass',
  less: 'less',
  html: 'html',
  htm: 'html',
  vue: 'vue',
  svelte: 'svelte',
  svg: 'svg',
  py: 'python',
  go: 'go2',
  rs: 'rust',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  hh: 'cpp',
  hxx: 'cpp',
  cs: 'c-sharp',
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  swift: 'swift',
  rb: 'ruby',
  php: 'php',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  fish: 'shell',
  ps1: 'powershell',
  lua: 'lua',
  pl: 'perl',
  dart: 'dart',
  scala: 'scala',
  r: 'R',
  yml: 'yml',
  yaml: 'yml',
  xml: 'xml',
  toml: 'config',
  ini: 'config',
  conf: 'config',
  sql: 'db',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  bmp: 'image',
  avif: 'image',
  ico: 'favicon',
  mp3: 'audio',
  wav: 'audio',
  flac: 'audio',
  ogg: 'audio',
  oga: 'audio',
  m4a: 'audio',
  aac: 'audio',
  opus: 'audio',
  wma: 'audio',
  mp4: 'video',
  webm: 'video',
  mkv: 'video',
  mov: 'video',
  avi: 'video',
  m4v: 'video',
  ogv: 'video',
  graphql: 'graphql',
  gql: 'graphql',
  prisma: 'prisma',
  tf: 'terraform',
  wasm: 'wasm',
  csv: 'csv',
  pdf: 'pdf',
  zip: 'zip',
  rar: 'zip',
  '7z': 'zip',
  tar: 'zip',
  gz: 'zip',
  lock: 'lock',
};

export function FileLogo({ name }: { readonly name: string }): React.JSX.Element {
  const dot = name.lastIndexOf('.');
  const ext = dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
  const base = name.toLowerCase();
  const key =
    NAME_ICONS[base] ??
    (base.endsWith('ignore') ? 'ignored' : ext === '' ? 'default' : EXT_ICONS[ext] ?? 'default');
  return (
    <img
      className="file-logo"
      data-logo={ext === '' ? 'file' : ext}
      data-icon={key}
      src={iconUrl(key)}
      alt=""
      width={22}
      height={22}
      draggable={false}
    />
  );
}
