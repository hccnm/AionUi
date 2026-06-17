export type UnmigratedCapabilityId =
  | 'local-directory-selection'
  | 'local-shell-open'
  | 'local-reveal-in-folder'
  | 'local-auto-update'
  | 'local-start-on-boot'
  | 'local-devtools'
  | 'local-system-gpu-cdp'
  | 'local-pet'
  | 'local-extension-scan';

export type UnmigratedCapability = {
  id: UnmigratedCapabilityId;
  sourceFeature: string;
  originalDependency: string;
  webTargetBehavior: string;
  backendRequirement: string;
  currentHandling: 'unavailable' | 'documented' | 'backend-required';
};

export class WebUnavailableError extends Error {
  readonly capability: UnmigratedCapabilityId;

  constructor(capability: UnmigratedCapabilityId, message: string) {
    super(message);
    this.name = 'WebUnavailableError';
    this.capability = capability;
  }
}

const UNMIGRATED_CAPABILITIES: UnmigratedCapability[] = [
  {
    id: 'local-directory-selection',
    sourceFeature: 'Native directory picker',
    originalDependency: 'Electron dialog / current PC filesystem path',
    webTargetBehavior: 'Select or create a workspace on the remote server through backend APIs.',
    backendRequirement: 'Remote workspace browse/create endpoint with server-side path validation.',
    currentHandling: 'unavailable',
  },
  {
    id: 'local-shell-open',
    sourceFeature: 'Open file or folder from the desktop shell',
    originalDependency: 'Electron shell.openPath / OS shell',
    webTargetBehavior: 'Open a remote server file preview or download URL in the browser.',
    backendRequirement: 'Remote file preview/download endpoint.',
    currentHandling: 'unavailable',
  },
  {
    id: 'local-reveal-in-folder',
    sourceFeature: 'Reveal file in current PC folder',
    originalDependency: 'Electron shell.showItemInFolder',
    webTargetBehavior: 'Navigate to the remote server workspace tree location.',
    backendRequirement: 'Remote workspace tree endpoint and path-to-node lookup.',
    currentHandling: 'unavailable',
  },
  {
    id: 'local-auto-update',
    sourceFeature: 'Desktop app auto update',
    originalDependency: 'electron-updater',
    webTargetBehavior: 'Handled by static asset deployment pipeline outside the browser app.',
    backendRequirement: 'None for frontend runtime; deployment metadata optional.',
    currentHandling: 'documented',
  },
  {
    id: 'local-start-on-boot',
    sourceFeature: 'Start desktop app on boot',
    originalDependency: 'Electron app system login item',
    webTargetBehavior: 'Not applicable to a static Web client.',
    backendRequirement: 'None.',
    currentHandling: 'documented',
  },
  {
    id: 'local-devtools',
    sourceFeature: 'Open desktop DevTools from UI',
    originalDependency: 'Electron BrowserWindow devtools',
    webTargetBehavior: 'Use browser developer tools manually.',
    backendRequirement: 'None.',
    currentHandling: 'documented',
  },
  {
    id: 'local-system-gpu-cdp',
    sourceFeature: 'Desktop GPU and CDP local settings',
    originalDependency: 'Electron/Chromium process configuration',
    webTargetBehavior: 'If needed, expose remote backend diagnostics only.',
    backendRequirement: 'Remote diagnostics endpoint.',
    currentHandling: 'backend-required',
  },
  {
    id: 'local-pet',
    sourceFeature: 'Desktop pet overlay windows',
    originalDependency: 'Electron transparent always-on-top windows',
    webTargetBehavior: 'Not part of the pure Web client unless redesigned as in-page UI.',
    backendRequirement: 'None for current migration.',
    currentHandling: 'documented',
  },
  {
    id: 'local-extension-scan',
    sourceFeature: 'Scan local extension folders',
    originalDependency: 'Current PC filesystem scan',
    webTargetBehavior: 'List and manage extensions installed on the remote backend server.',
    backendRequirement: 'Remote extension list/install/import APIs.',
    currentHandling: 'backend-required',
  },
];

export function listUnmigratedCapabilities(): UnmigratedCapability[] {
  return UNMIGRATED_CAPABILITIES;
}

export function getUnmigratedCapability(id: UnmigratedCapabilityId): UnmigratedCapability | undefined {
  return UNMIGRATED_CAPABILITIES.find((capability) => capability.id === id);
}

export function createWebUnavailableError(id: UnmigratedCapabilityId): WebUnavailableError {
  const capability = getUnmigratedCapability(id);
  return new WebUnavailableError(
    id,
    capability
      ? `${capability.sourceFeature} is not available in AionWeb. ${capability.webTargetBehavior}`
      : `${id} is not available in AionWeb.`
  );
}
