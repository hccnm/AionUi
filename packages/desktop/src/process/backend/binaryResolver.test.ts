import { execSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveBinaryPath } from './binaryResolver';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
}));

const originalResourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
const originalBackendBinaryOverride = process.env.AIONUI_BACKEND_BINARY;
const originalBackendBundledDirOverride = process.env.AIONUI_BACKEND_BUNDLED_DIR;

function setResourcesPath(resourcesPath: string | undefined): void {
  Object.defineProperty(process, 'resourcesPath', {
    configurable: true,
    value: resourcesPath,
  });
}

function dirEntry(name: string, isDirectory = false): ReturnType<typeof readdirSync>[number] {
  return {
    name,
    isDirectory: () => isDirectory,
  } as unknown as ReturnType<typeof readdirSync>[number];
}

describe('resolveBinaryPath', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AIONUI_BACKEND_BINARY;
    delete process.env.AIONUI_BACKEND_BUNDLED_DIR;
  });

  afterEach(() => {
    setResourcesPath(originalResourcesPath);
    if (originalBackendBinaryOverride) {
      process.env.AIONUI_BACKEND_BINARY = originalBackendBinaryOverride;
    } else {
      delete process.env.AIONUI_BACKEND_BINARY;
    }
    if (originalBackendBundledDirOverride) {
      process.env.AIONUI_BACKEND_BUNDLED_DIR = originalBackendBundledDirOverride;
    } else {
      delete process.env.AIONUI_BACKEND_BUNDLED_DIR;
    }
  });

  it('attaches bundled path diagnostics when aioncore cannot be resolved', () => {
    const resourcesPath = '/app/resources';
    const runtimeKey = `${process.platform}-${process.arch}`;
    const binaryName = process.platform === 'win32' ? 'aioncore.exe' : 'aioncore';
    const bundledDir = join(resourcesPath, 'bundled-aioncore');
    const runtimeDir = join(bundledDir, runtimeKey);
    const checkedBundledPath = join(runtimeDir, binaryName);

    setResourcesPath(resourcesPath);
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(readdirSync).mockImplementation((path) => {
      if (path === resourcesPath) return [dirEntry('bundled-aioncore', true)];
      if (path === runtimeDir) return [dirEntry('manifest.json')];
      return [] as ReturnType<typeof readdirSync>;
    });
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('not found on PATH');
    });

    expect(() => resolveBinaryPath()).toThrow('Cannot find "aioncore" binary');

    try {
      resolveBinaryPath();
    } catch (error) {
      expect(error).toMatchObject({
        name: 'BackendBinaryResolveError',
        diagnostics: expect.objectContaining({
          resourcesPath,
          runtimeKey,
          binaryName,
          checkedBundledPath,
          bundledDirExists: false,
          runtimeDirExists: false,
          resourcesDirEntries: ['bundled-aioncore/'],
          runtimeDirEntries: ['manifest.json'],
          pathLookupCommand: process.platform === 'win32' ? 'where aioncore' : 'which aioncore',
          pathLookupError: expect.stringContaining('not found on PATH'),
        }),
      });
    }
  });

  it('prefers AIONUI_BACKEND_BINARY when explicitly provided', () => {
    process.env.AIONUI_BACKEND_BINARY = '/custom/bin/aioncore';
    vi.mocked(existsSync).mockImplementation((path) => path === '/custom/bin/aioncore');

    expect(resolveBinaryPath()).toBe('/custom/bin/aioncore');
    expect(execSync).not.toHaveBeenCalled();
  });

  it('falls back to repository resources during desktop development', () => {
    const runtimeKey = `${process.platform}-${process.arch}`;
    const binaryName = process.platform === 'win32' ? 'aioncore.exe' : 'aioncore';
    const devCandidate = join(process.cwd(), 'resources', 'bundled-aioncore', runtimeKey, binaryName);

    setResourcesPath('/Electron/resources');
    vi.mocked(existsSync).mockImplementation((path) => path === devCandidate);

    expect(resolveBinaryPath()).toBe(devCandidate);
    expect(execSync).not.toHaveBeenCalled();
  });
});
