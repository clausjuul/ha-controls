/** A scene in a scene row or scene popup, with its own name, icon and colour. */
export interface SceneChipConfig {
  entity: string;
  /** Shown instead of the scene's name. */
  name?: string;
  /** Shown instead of the scene's icon. */
  icon?: string;
  /** Hide the icon (default shown). */
  show_icon?: boolean;
  /** Any CSS colour, e.g. `#ff9800` or `orange`, or `auto` for the colours the scene sets its lights to. */
  color?: string;
}

export type SceneEntry = string | SceneChipConfig;

export interface SceneChip {
  entity: string;
  name?: string;
  icon?: string;
  showIcon: boolean;
  color?: string;
}

/** Scene IDs or scene objects from the config, checked. */
export function sceneChips(value: unknown, where: string): SceneChip[] {
  if (value === undefined || value === null) return [];
  const bad = () => new Error(`"scenes" in ${where} must be a list of scene entities`);
  if (!Array.isArray(value)) throw bad();
  return value.map((s): SceneChip => {
    const c = (typeof s === 'string' ? { entity: s } : s) as SceneChipConfig;
    if (!c || typeof c !== 'object' || typeof c.entity !== 'string' || !c.entity.startsWith('scene.')) {
      throw bad();
    }
    return {
      entity: c.entity,
      name: c.name || undefined,
      icon: c.icon || undefined,
      showIcon: c.show_icon !== false,
      color: typeof c.color === 'string' && c.color ? c.color : undefined,
    };
  });
}

export const sceneId = (s: string | SceneChip) => (typeof s === 'string' ? s : s.entity);
