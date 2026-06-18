/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { bridge, logger } from '@office-ai/platform';
import type { ElectronBridgeAPI } from '@/common/types/platform/electron';
import {
  connectSharedWebSocket,
  reconnectSharedWebSocket,
  sendSharedWebSocketMessage,
  subscribeSharedWebSocketAll,
} from '@/common/adapter/sharedWebSocket';

interface CustomWindow extends Window {
  electronAPI?: ElectronBridgeAPI;
  __bridgeEmitter?: { emit: (name: string, data: unknown) => void };
  __emitBridgeCallback?: (name: string, data: unknown) => void;
  __websocketReconnect?: () => void;
}

const win = window as CustomWindow;

if (win.electronAPI) {
  bridge.adapter({
    emit(name, data) {
      return win.electronAPI.emit(name, data);
    },
    on(emitter) {
      win.electronAPI?.on((event) => {
        try {
          const { value } = event;
          const { name, data } = JSON.parse(value);
          emitter.emit(name, data);
        } catch (error) {
          console.warn('JSON parsing error:', error);
        }
      });
    },
  });
} else {
  bridge.adapter({
    emit(name, data) {
      sendSharedWebSocketMessage(name, data);
    },
    on(emitter) {
      win.__bridgeEmitter = emitter;
      win.__emitBridgeCallback = (name: string, data: unknown) => {
        emitter.emit(name, data);
      };

      subscribeSharedWebSocketAll((data, name) => {
        emitter.emit(name, data);
      });
    },
  });

  win.__websocketReconnect = () => {
    reconnectSharedWebSocket();
  };
}

logger.provider({
  log(log) {
    console.log('process.log', log.type, ...log.logs);
  },
  path() {
    return Promise.resolve('');
  },
});
