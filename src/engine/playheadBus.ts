type PlayheadListener = (timeSec: number) => void;

class PlayheadBus {
  private currentTime = 0;
  private listeners = new Set<PlayheadListener>();

  public getTime(): number {
    return this.currentTime;
  }

  public setTime(timeSec: number): void {
    const safe = Math.max(0, Number.isFinite(timeSec) ? timeSec : 0);
    this.currentTime = safe;
    for (const listener of this.listeners) {
      listener(safe);
    }
  }

  public subscribe(listener: PlayheadListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const playheadBus = new PlayheadBus();
