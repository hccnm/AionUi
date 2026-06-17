import { beforeEach, describe, expect, it } from 'vitest';
import { __mockRuntime } from '../src/mock/runtime';

describe('intercept mock runtime', () => {
  beforeEach(() => {
    __mockRuntime.resetInterceptMockState();
  });

  it('serves unauthenticated auth state before login and authenticated state after login', async () => {
    const beforeLogin = await __mockRuntime.handleMockApi('http://aionweb.mock/api/auth/user', { method: 'GET' });
    expect(beforeLogin).not.toBeNull();
    expect(await beforeLogin!.json()).toEqual({ success: false });

    await __mockRuntime.handleMockApi('http://aionweb.mock/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'demo' }),
    });

    const afterLogin = await __mockRuntime.handleMockApi('http://aionweb.mock/api/auth/user', { method: 'GET' });
    expect(await afterLogin!.json()).toEqual({
      success: true,
      user: {
        id: 'user-demo',
        username: 'demo',
      },
    });
  });

  it('lists seeded conversations and appends a new one on create', async () => {
    const initial = await __mockRuntime.handleMockApi('http://aionweb.mock/api/conversations', { method: 'GET' });
    const initialJson = await initial!.json();
    expect(initialJson.data.items).toHaveLength(1);

    await __mockRuntime.handleMockApi('http://aionweb.mock/api/conversations', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Created in test',
        extra: { workspace: '/srv/aion/test-space' },
      }),
    });

    const afterCreate = await __mockRuntime.handleMockApi('http://aionweb.mock/api/conversations', { method: 'GET' });
    const afterCreateJson = await afterCreate!.json();
    expect(afterCreateJson.data.items).toHaveLength(2);
    expect(afterCreateJson.data.items[0].name).toBe('Created in test');
  });

  it('returns a server msg id when posting a message', async () => {
    const response = await __mockRuntime.handleMockApi('http://aionweb.mock/api/conversations/conv-demo/messages', {
      method: 'POST',
      body: JSON.stringify({ content: 'hello mock backend' }),
    });

    const json = await response!.json();
    expect(json.data.msg_id).toMatch(/^user-/);

    const messages = await __mockRuntime.handleMockApi(
      'http://aionweb.mock/api/conversations/conv-demo/messages?page=1&page_size=50',
      { method: 'GET' }
    );
    const messagesJson = await messages!.json();
    expect(messagesJson.data.items.some((item: { content: { content: string } }) => item.content.content === 'hello mock backend')).toBe(true);
  });
});
