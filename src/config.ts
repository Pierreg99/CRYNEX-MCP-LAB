import { isAbsolute } from 'node:path';

export interface LabConfig {
  readonly catalogFile?: string;
  readonly skillsDirectory?: string;
  readonly customToolsFile?: string;
}

function configuredPath(name: string, env: NodeJS.ProcessEnv): string | undefined {
  const value = env[name];
  if (value === undefined || value.trim() === '') return undefined;
  if (!isAbsolute(value) || value.includes('\0')) {
    throw new Error(name + ' must be an absolute filesystem path');
  }
  return value;
}

/** No network or filesystem source is active unless explicitly opted in. */
export function readConfig(env: NodeJS.ProcessEnv): LabConfig {
  const catalogFile = configuredPath('CRYNEX_CATALOG_FILE', env);
  const skillsDirectory = configuredPath('CRYNEX_SKILLS_DIRECTORY', env);
  const customToolsFile = configuredPath('CRYNEX_CUSTOM_TOOLS_FILE', env);
  return { ...(catalogFile ? { catalogFile } : {}), ...(skillsDirectory ? { skillsDirectory } : {}),
    ...(customToolsFile ? { customToolsFile } : {}) };
}
