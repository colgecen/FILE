import { reportError } from './appErrors';
import type { CommandDef, CommandResult } from './types';

type CommandHandlers = {
  onCommandNotFound: (id: string) => void;
};

export class CommandRegistry {
  private readonly commands = new Map<string, CommandDef>();
  private readonly handlers: CommandHandlers;

  constructor(handlers?: Partial<CommandHandlers>) {
    this.handlers = {
      onCommandNotFound: (id: string) => {
        console.warn(`Bilinmeyen komut: ${id}`);
      },
      ...handlers,
    };
  }

  register(def: CommandDef): void {
    this.commands.set(def.id, def);
  }

  get(id: string): CommandDef | undefined {
    return this.commands.get(id);
  }

  list(): readonly CommandDef[] {
    return [...this.commands.values()];
  }

  has(id: string): boolean {
    return this.commands.has(id);
  }

  async run(id: string): Promise<CommandResult> {
    const def = this.commands.get(id);
    if (!def) {
      this.handlers.onCommandNotFound(id);
      return { ok: false, error: `Bilinmeyen komut: ${id}` };
    }
    try {
      return await def.run();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      reportError(message);
      return { ok: false, error: message };
    }
  }
}