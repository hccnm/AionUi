import officePlatformPkg from '../../../../AionUi/node_modules/@office-ai/platform/dist/index.js';

const officePlatform = officePlatformPkg as Record<string, unknown>;

export const bridge = officePlatform.bridge;
export const http = officePlatform.http;
export const logger = officePlatform.logger;
export const Modal = officePlatform.Modal;
export const storage = officePlatform.storage;
export const system = officePlatform.system;
export const theme = officePlatform.theme;

export default officePlatformPkg;
