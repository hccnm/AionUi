/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import './utils/ui/runtimePatches';
import '@/common/adapter/browser';

import type { PropsWithChildren } from 'react';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { AuthProvider, useAuth } from './hooks/context/AuthContext';
import { FeedbackProvider } from './hooks/context/FeedbackContext';
import { ThemeProvider } from './hooks/context/ThemeContext';
import { PreviewProvider } from './pages/conversation/Preview/context/PreviewContext';

import { ConfigProvider } from '@arco-design/web-react';
import '@arco-design/web-react/es/_util/react-19-adapter';
import '@arco-design/web-react/dist/css/arco.css';
import zhCN from '@arco-design/web-react/es/locale/zh-CN';

import 'uno.css';
import './styles/arco-override.css';
import './styles/themes/index.css';

import { configService } from '@/common/config/configService';
import './services/i18n';
import { registerPwa } from './services/registerPwa';

import Layout from './components/layout/Layout';
import Router from './components/layout/Router';
import Sider from './components/layout/Sider';
import { ConversationHistoryProvider } from './hooks/context/ConversationHistoryContext';
import GlobalRuntimeStatus from './runtime/GlobalRuntimeStatus';
import HOC from './utils/ui/HOC';

const AppProviders: React.FC<PropsWithChildren> = ({ children }) =>
  React.createElement(
    AuthProvider,
    null,
    React.createElement(
      ThemeProvider,
      null,
      React.createElement(
        PreviewProvider,
        null,
        React.createElement(
          FeedbackProvider,
          null,
          React.createElement(React.Fragment, null, React.createElement(GlobalRuntimeStatus, null), children)
        )
      )
    )
  );

const Config: React.FC<PropsWithChildren> = ({ children }) =>
  React.createElement(ConfigProvider, { theme: { primaryColor: '#4E5969' }, locale: zhCN }, children);

const Main = () => {
  const { ready } = useAuth();
  const [configReady, setConfigReady] = useState(false);

  useEffect(() => {
    if (!ready) return;
    configService
      .initialize()
      .catch((err) => {
        console.error('Failed to initialize config:', err);
      })
      .finally(() => setConfigReady(true));
  }, [ready]);

  if (!ready || !configReady) {
    return null;
  }

  return (
    <Router
      layout={
        <ConversationHistoryProvider>
          <Layout sider={<Sider />} />
        </ConversationHistoryProvider>
      }
    />
  );
};

const App = HOC.Wrapper(Config)(Main);

void registerPwa();

createRoot(document.getElementById('root')!).render(
  <AppProviders>
    <App />
  </AppProviders>
);
