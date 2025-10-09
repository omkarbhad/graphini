declare module 'is-hotkey' {
  export function isHotkey(hotkey: string | string[], event: KeyboardEvent): boolean;
  export function isHotkey(hotkey: string | string[], options?: { byKey?: boolean }): (event: KeyboardEvent) => boolean;
  export function isHotkey(hotkey: string | string[], event: KeyboardEvent, options?: { byKey?: boolean }): boolean;
  export function isKeyHotkey(hotkey: string | string[], event: KeyboardEvent): boolean;
}
