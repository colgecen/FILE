export type OpenFileRef = {
  readonly name: string;
  readonly path: string;
};

export class OpenFilesModel {
  private entries: readonly OpenFileRef[] = [];

  set(entries: readonly OpenFileRef[]): void {
    this.entries = entries;
  }

  list(): readonly OpenFileRef[] {
    return this.entries;
  }
}

export const openFilesModel = new OpenFilesModel();