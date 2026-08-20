export type LineFeedResult = {
  readonly echoed: string;
  readonly submitted: string | null;
};

export class TerminalLineBuffer {
  private buffer = '';

  feed(data: string): LineFeedResult {
    let echoed = '';
    for (const char of data) {
      if (char === '\r') {
        const submitted = this.buffer;
        this.buffer = '';
        return { echoed, submitted };
      }
      if (char === '\x7f') {
        if (this.buffer.length > 0) {
          this.buffer = this.buffer.slice(0, -1);
          echoed += '\b \b';
        }
        continue;
      }
      const code = char.codePointAt(0) ?? 0;
      if (code < 0x20 || code === 0x7f) continue;
      this.buffer += char;
      echoed += char;
    }
    return { echoed, submitted: null };
  }
}