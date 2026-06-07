// Browser mock for @tauri-apps/plugin-dialog
export async function open(_options?: unknown): Promise<string | null> {
  return "/home/user/projects/acme-platform";
}

export async function save(_options?: unknown): Promise<string | null> {
  return "/home/user/exports/config.yaml";
}

export async function message(_msg: string, _options?: unknown): Promise<void> {}
export async function ask(_msg: string, _options?: unknown): Promise<boolean> { return true; }
export async function confirm(_msg: string, _options?: unknown): Promise<boolean> { return true; }
