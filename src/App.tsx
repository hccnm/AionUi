import React from 'react';
import { Tag, Typography } from '@arco-design/web-react';
import { getBackendBaseUrl } from './config/backend';
import { isInterceptMockMode } from './mock/mockMode';
import './styles.css';

const { Text, Title } = Typography;

export default function App() {
  const backendBaseUrl = getBackendBaseUrl() || 'same-origin';
  const mockMode = isInterceptMockMode();

  return (
    <div className='aionweb-shell'>
      <header className='shell-header'>
        <div className='shell-brand'>AionWeb</div>
        <div className='shell-status'>
          <Tag color={mockMode ? 'orange' : 'green'}>{mockMode ? 'mock intercept' : 'remote backend'}</Tag>
          <Text type='secondary'>{backendBaseUrl}</Text>
        </div>
      </header>

      <main className='shell-main'>
        <section className='shell-panel'>
          <Title heading={3}>AionUi Renderer Migration Shell</Title>
          <Text type='secondary'>
            This project is intentionally a framework shell. The next implementation pass should migrate the existing
            AionUi renderer UI into this shell and replace Electron/IPC/local filesystem dependencies with remote
            backend HTTP and WebSocket bridges.
          </Text>
        </section>
      </main>
    </div>
  );
}
