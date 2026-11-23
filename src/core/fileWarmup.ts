/**
 * Explorer → editor köprüsü. Gezgin bir dosyanın içeriğini önceden okuduğunda
 * buradan haber verir; editör tarafı boşta Monaco modelini kurar. Böylece
 * tıklama anında yalnızca hazır model bağlanır, dosya yeniden ayrıştırılmaz.
 */
export class FileWarmupModel {
  private readonly listeners = new Set<(path: string) => void>();

  request(path: string): void {
    this.listeners.forEach((listener) => listener(path));
  }

  subscribe(listener: (path: string) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const fileWarmup = new FileWarmupModel();
