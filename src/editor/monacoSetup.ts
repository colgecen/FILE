import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { loadLanguage } from 'monaco-editor/esm/vs/basic-languages/_.contribution';
// Use Monaco's lightweight basic-language tokenizers instead of the full
// TypeScript/JSON/CSS/HTML language services. FILE does not expose language
// service features (diagnostics, completion, formatting are off/absent), so the
// full TS worker only added a 12 MB chunk and delayed the first file open while
// the worker booted. Basic tokenizers give the same colours on the main thread.
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution';
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution';
import 'monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution';
import 'monaco-editor/esm/vs/basic-languages/css/css.contribution';
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution';
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution';
import 'monaco-editor/esm/vs/basic-languages/go/go.contribution';
import 'monaco-editor/esm/vs/basic-languages/rust/rust.contribution';
import 'monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution';
import 'monaco-editor/esm/vs/basic-languages/java/java.contribution';
import 'monaco-editor/esm/vs/basic-languages/ruby/ruby.contribution';
import 'monaco-editor/esm/vs/basic-languages/php/php.contribution';
import 'monaco-editor/esm/vs/basic-languages/shell/shell.contribution';
import 'monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution';
import 'monaco-editor/esm/vs/basic-languages/ini/ini.contribution';
import 'monaco-editor/esm/vs/basic-languages/xml/xml.contribution';
import 'monaco-editor/esm/vs/basic-languages/sql/sql.contribution';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

export { monaco };

let installed = false;

export function installMonacoEnvironment(): void {
  if (installed) return;
  installed = true;
  self.MonacoEnvironment = {
    getWorker(): Worker {
      return new editorWorker();
    },
  };
}

let primed = false;

/**
 * İlk TS/JS dosyası açılırken gramer yüklemesi ve regex derlemesi ilk kareyi
 * bloke ediyordu. Uygulama boştayken bu hazırlığı önceden yap.
 */
export function primeLanguages(): void {
  if (primed) return;
  primed = true;
  const run = (): void => {
    for (const id of ['typescript', 'javascript']) {
      void loadLanguage(id)
        .then(() => monaco.editor.tokenize('const value = 1;', id))
        .catch(() => null);
    }
  };
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 800);
  }
}
