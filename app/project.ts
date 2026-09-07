export const project = {
  repository: 'https://github.com/vaenshine/ic-atlas',
  preview: 'https://vaenshine.github.io/ic-atlas/',
  manifest: 'https://vaenshine.github.io/ic-atlas/version.json',
  archive: 'https://github.com/vaenshine/ic-atlas/archive/refs/heads/main.zip',
  compareApi: 'https://api.github.com/repos/vaenshine/ic-atlas/compare/',
} as const;

export interface BuildInfo {
  schema: number;
  name: string;
  version: string;
  commit: string | null;
  builtAt: string;
}
declare const __IC_ATLAS_BUILD__: BuildInfo;
export const buildInfo: BuildInfo =
  typeof __IC_ATLAS_BUILD__ === 'undefined'
    ? {
        schema: 1,
        name: 'ic-atlas',
        version: 'development',
        commit: null,
        builtAt: '',
      }
    : __IC_ATLAS_BUILD__;
