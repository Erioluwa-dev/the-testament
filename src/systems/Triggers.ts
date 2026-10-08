import type { TriggerData } from '../types/sceneData';

export interface TriggerZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  npc?: string;
  verses: string[];
  once: boolean;
  fired: boolean;
}

export class Triggers {
  private zones: TriggerZone[] = [];

  fromData(triggers: TriggerData[]): TriggerZone[] {
    this.zones = triggers.map((t) => ({
      id: t.id,
      x: t.zone?.x ?? 0,
      y: t.zone?.y ?? 0,
      width: t.zone?.width ?? 40,
      height: t.zone?.height ?? 40,
      npc: t.npc,
      verses: [...t.verses],
      once: t.once ?? true,
      fired: false,
    }));
    return this.zones;
  }

  pending(): TriggerZone[] {
    return this.zones.filter((z) => !z.fired);
  }

  pendingCount(): number {
    return this.pending().length;
  }

  hasFiredAll(): boolean {
    return this.zones.length > 0 && this.zones.every((z) => z.fired);
  }

  isFired(id: string): boolean {
    return this.zones.find((z) => z.id === id)?.fired ?? false;
  }

  tryFire(x: number, y: number): string[] | null {
    for (const zone of this.zones) {
      if (zone.npc !== undefined) continue;
      if (zone.fired && zone.once) continue;
      if (
        x >= zone.x &&
        x <= zone.x + zone.width &&
        y >= zone.y &&
        y <= zone.y + zone.height
      ) {
        zone.fired = true;
        return [...zone.verses];
      }
    }
    return null;
  }

  fire(id: string): string[] | null {
    const zone = this.zones.find((z) => z.id === id);
    if (zone === undefined) return null;
    if (zone.fired && zone.once) return null;
    zone.fired = true;
    return [...zone.verses];
  }

  reset(): void {
    for (const zone of this.zones) zone.fired = false;
  }
}
