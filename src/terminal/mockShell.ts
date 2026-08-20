export type MockShellResult = {
  readonly output: readonly string[];
  readonly clear: boolean;
};

export class MockShell {
  private cwd = '/kök';

  run(input: string): MockShellResult {
    const trimmed = input.trim();
    if (trimmed === '') return { output: [], clear: false };
    if (trimmed === 'clear') return { output: [], clear: true };
    if (trimmed === 'pwd') return { output: [this.cwd], clear: false };
    if (trimmed === 'whoami') return { output: ['misafir'], clear: false };
    if (trimmed === 'help') {
      return {
        output: [
          'Yardım — taklit kabuk',
          '  clear   ekranı temizler',
          '  echo X  X metnini yazar',
          '  help    bu listeyi gösterir',
          '  pwd     çalışma dizinini yazar',
          '  whoami  kullanıcıyı yazar',
        ],
        clear: false,
      };
    }
    if (trimmed.startsWith('echo ')) {
      return { output: [trimmed.slice(5)], clear: false };
    }
    return { output: [`komut bulunamadı: ${trimmed}`], clear: false };
  }
}