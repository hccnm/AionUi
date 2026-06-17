import '@web/bootstrap/processShim';
import '@web/mock/runtime';
import '@/common/adapter/browser';
import '@arco-design/web-react/es/_util/react-19-adapter';
import '@arco-design/web-react/dist/css/arco.css';
import { ConfigProvider } from '@arco-design/web-react';
import zhCN from '@arco-design/web-react/es/locale/zh-CN';
import { configService } from '@/common/config/configService';
import { AuthProvider, useAuth } from '@renderer/hooks/context/AuthContext';
import { ConversationHistoryProvider } from '@renderer/hooks/context/ConversationHistoryContext';
import { FeedbackProvider } from '@renderer/hooks/context/FeedbackContext';
import { ThemeProvider } from '@renderer/hooks/context/ThemeContext';
import { PreviewProvider } from '@renderer/pages/conversation/Preview/context/PreviewContext';
import GlobalRuntimeStatus from '@renderer/runtime/GlobalRuntimeStatus';
import '@renderer/services/i18n';
import '@renderer/styles/arco-override.css';
import '@renderer/styles/themes/index.css';
import { useEffect, useState, type PropsWithChildren } from 'react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerMockServiceWorker } from '@web/mock/mockMode';
import { AppRouter } from '@web/app/AppRouter';
import 'virtual:uno.css';

const AppProviders: React.FC<PropsWithChildren> = ({ children }) => (
  <AuthProvider>
    <ThemeProvider>
      <PreviewProvider>
        <FeedbackProvider>
          <GlobalRuntimeStatus />
          {children}
        </FeedbackProvider>
      </PreviewProvider>
    </ThemeProvider>
  </AuthProvider>
);

const ArcoConfig: React.FC<PropsWithChildren> = ({ children }) => (
  <ConfigProvider theme={{ primaryColor: '#4E5969' }} locale={zhCN}>
    {children}
  </ConfigProvider>
);

const MainApp = () => {
  const { ready, status } = useAuth();
  const [configReady, setConfigReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (status !== 'authenticated') {
      configService.reset();
      setConfigReady(true);
      return () => {
        cancelled = true;
      };
    }

    setConfigReady(false);
    configService
      .initialize()
      .catch((error) => {
        console.error('Failed to initialize config service:', error);
      })
      .finally(() => {
        if (!cancelled) {
          setConfigReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [status]);

  if (!ready || (status === 'authenticated' && !configReady)) {
    return null;
  }

  return (
    <ConversationHistoryProvider>
      <AppRouter />
    </ConversationHistoryProvider>
  );
};

async function bootstrap() {
  await registerMockServiceWorker();

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <AppProviders>
        <ArcoConfig>
          <MainApp />
        </ArcoConfig>
      </AppProviders>
    </React.StrictMode>
  );
}

void bootstrap();
