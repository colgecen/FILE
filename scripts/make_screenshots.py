#!/usr/bin/env python3
"""Regenerate the README screenshot from the real Electron application.

The script builds the production renderer, launches the app in an isolated
profile with a temporary English demo workspace, and captures the real
window. The PNG capture is embedded unchanged in a macOS-style SVG frame
with a title bar and traffic lights; nothing is stretched, cropped or
resized. Run it from the repository root:

    python3 scripts/make_screenshots.py
"""

from __future__ import annotations

import base64
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "img" / "app.svg"
WIDTH = 1280
HEIGHT = 800
TITLE_BAR = 44
RADIUS = 10
TITLE = "FILE — Editor"

NODE_SCRIPT = r"""
import { _electron as electron } from 'playwright-core';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.env.FILE_SHOT_ROOT;
const demo = process.env.FILE_SHOT_DEMO;
const profile = process.env.FILE_SHOT_PROFILE;
const out = process.env.FILE_SHOT_PNG;
if (!root || !demo || !profile || !out) throw new Error('screenshot paths are missing');

const editorPath = `${demo}/src/editor.ts`;
const themePath = `${demo}/src/theme.ts`;
const appPath = `${demo}/src/app.ts`;
const session = {
  environments: [{
    id: demo,
    name: 'file-demo',
    rootPath: demo,
    tabs: {
      files: [
        { path: editorPath, name: 'editor.ts', content: '', language: 'typescript' },
        { path: themePath, name: 'theme.ts', content: '', language: 'typescript' },
        { path: appPath, name: 'app.ts', content: '', language: 'typescript' },
      ],
      activeId: editorPath,
    },
    browserUrl: null,
  }],
  activeEnvId: demo,
  activeFileId: editorPath,
  files: {},
  wordWrap: 'on',
};

const app = await electron.launch({
  executablePath: require('electron'),
  args: [root, `--user-data-dir=${profile}`],
  env: { ...process.env, DISPLAY: process.env.DISPLAY || ':0' },
  timeout: 30000,
});

try {
  const page = await app.firstWindow({ timeout: 30000 });
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(({ session }) => {
    localStorage.setItem('file:ui-language', 'en');
    localStorage.setItem('file:session:v1', JSON.stringify(session));
    localStorage.setItem(
      'perf:state',
      JSON.stringify({
        telemetry: false,
        modelLimit: 20,
        aiLazy: true,
        reducedMotion: true,
        liteFx: true,
      }),
    );
  }, { session });
  await page.reload();
  await page.waitForSelector('.monaco-editor', { timeout: 30000 });
  await page.waitForFunction(
    () => (document.querySelector('.monaco-editor .view-lines')?.textContent ?? '').includes('createEditor'),
    undefined,
    { timeout: 30000 },
  );
  await page.waitForTimeout(2200);

  // Open the explorer through the real command palette, then expand src.
  await page.keyboard.press('Control+i');
  await page.waitForTimeout(300);
  await page.keyboard.type('tree');
  await page.waitForTimeout(300);
  await page.keyboard.press('Enter');
  await page.waitForSelector('.explorer-view', { timeout: 10000 });
  await page.waitForTimeout(700);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);

  // The screenshot frame supplies the window controls and hides the closing
  // command palette after it has done its real work.
  await page.addStyleTag({
    content: '.traffic-lights { display: none !important; } .command-hud { display: none !important; }',
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: out, animations: 'disabled', caret: 'hide' });
} finally {
  await app.close();
}
"""

DEMO_FILES = {
    "src/editor.ts": """type Theme = 'midnight' | 'daylight';

interface EditorOptions {
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly minimap: boolean;
}

export function createEditor(theme: Theme, options: EditorOptions) {
  const root = document.querySelector<HTMLElement>('#editor');

  if (root === null) {
    throw new Error('Editor root is missing');
  }

  root.dataset.theme = theme;
  root.style.setProperty('--font-family', options.fontFamily);
  root.style.setProperty('--font-size', `${options.fontSize}px`);

  return {
    open(path: string) {
      root.dataset.file = path;
    },
    focus() {
      root.focus();
    },
  };
}
""",
    "src/theme.ts": """export const midnight = {
  background: '#05070D',
  foreground: '#D7E2F0',
  accent: '#00D2FF',
  selection: '#123A55',
  gutter: '#5C5C68',
};

export const daylight = {
  background: '#F7F9FC',
  foreground: '#1B2330',
  accent: '#0066CC',
  selection: '#BBD9FF',
  gutter: '#8A94A6',
};
""",
    "src/app.ts": """import { createEditor } from './editor';
import { midnight } from './theme';

const editor = createEditor(midnight, {
  fontFamily: 'JetBrains Mono',
  fontSize: 13,
  minimap: false,
});

editor.open('src/editor.ts');
editor.focus();
""",
    "src/styles.css": """:root {
  --editor-bg: #05070d;
  --editor-fg: #d7e2f0;
  --editor-accent: #00d2ff;
}

#editor {
  background: var(--editor-bg);
  color: var(--editor-fg);
}

#editor:focus-visible {
  outline: 1px solid var(--editor-accent);
}
""",
    "package.json": """{
  "name": "file-demo",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}
""",
    "index.html": """<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>File demo</title>
  </head>
  <body>
    <div id="editor"></div>
    <script type="module" src="/src/app.ts"></script>
  </body>
</html>
""",
    "assets/logo.svg": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#00D2FF" />
  <path d="M18 18h28v8H26v6h16v8H26v6h20v8H18z" fill="#05070D" />
</svg>
""",
    "notes.txt": """Release checklist
- Build the renderer
- Capture the documentation screenshot
- Verify the package assets
""",
}


def run(command: list[str], **kwargs) -> subprocess.CompletedProcess:
    shown = " ".join(command)
    if len(shown) > 160:
        shown = f"{command[0]} {command[1]} <script>"
    print("+", shown)
    return subprocess.run(command, cwd=ROOT, check=True, **kwargs)


def write_demo(directory: Path) -> None:
    for relative, content in DEMO_FILES.items():
        target = directory / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")


def svg_frame(png: bytes) -> str:
    content = base64.b64encode(png).decode("ascii")
    total_height = TITLE_BAR + HEIGHT
    return f"""<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="{WIDTH}" height="{total_height}"
     viewBox="0 0 {WIDTH} {total_height}">
  <defs>
    <clipPath id="window">
      <rect x="0" y="0" width="{WIDTH}" height="{total_height}" rx="{RADIUS}" ry="{RADIUS}" />
    </clipPath>
    <clipPath id="content">
      <rect x="0" y="{TITLE_BAR}" width="{WIDTH}" height="{HEIGHT}" />
    </clipPath>
  </defs>
  <g clip-path="url(#window)">
    <rect x="0" y="0" width="{WIDTH}" height="{total_height}" fill="#05070D" />
    <rect x="0" y="0" width="{WIDTH}" height="{TITLE_BAR}" fill="#15171C" />
    <line x1="0" y1="{TITLE_BAR - 0.5}" x2="{WIDTH}" y2="{TITLE_BAR - 0.5}"
          stroke="#2A2D34" stroke-width="1" />
    <circle cx="22" cy="22" r="6" fill="#ff5f57" />
    <circle cx="44" cy="22" r="6" fill="#febc2e" />
    <circle cx="66" cy="22" r="6" fill="#28c840" />
    <text x="{WIDTH / 2}" y="27" text-anchor="middle"
          font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif"
          font-size="13.5" font-weight="600" fill="#E8ECF2">{TITLE}</text>
    <image x="0" y="{TITLE_BAR}" width="{WIDTH}" height="{HEIGHT}"
           clip-path="url(#content)" xlink:href="data:image/png;base64,{content}" />
  </g>
  <rect x="0.5" y="0.5" width="{WIDTH - 1}" height="{total_height - 1}"
        rx="{RADIUS - 0.5}" ry="{RADIUS - 0.5}" fill="none"
        stroke="#2A2D34" stroke-width="1" />
</svg>
"""


def main() -> int:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    run(["npm", "run", "build"])
    with tempfile.TemporaryDirectory(prefix="file-screenshot-") as temp:
        temp_path = Path(temp)
        demo = temp_path / "file-demo"
        profile = temp_path / "profile"
        capture = temp_path / "capture.png"
        write_demo(demo)
        profile.mkdir()
        env = {
            **os.environ,
            "FILE_SHOT_ROOT": str(ROOT),
            "FILE_SHOT_DEMO": str(demo),
            "FILE_SHOT_PROFILE": str(profile),
            "FILE_SHOT_PNG": str(capture),
        }
        if "DISPLAY" not in env or not env["DISPLAY"]:
            env["DISPLAY"] = ":0"
        run(["node", "--input-type=module", "-e", NODE_SCRIPT], env=env)
        if not capture.exists():
            raise SystemExit("screenshot capture was not written")
        OUT.write_text(svg_frame(capture.read_bytes()), encoding="utf-8")
        print(f"wrote {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
