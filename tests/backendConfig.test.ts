import { describe, expect, it } from 'vitest';
import { resolveHttpUrl, resolveWsUrl } from '../src/config/backend';

describe('backend config', () => {
  it('uses same-origin paths when backend base URL is empty', () => {
    expect(resolveHttpUrl('/api/conversations', '')).toBe('/api/conversations');
    expect(resolveHttpUrl('/login', '')).toBe('/login');
  });

  it('joins remote backend base URL with API and auth paths', () => {
    expect(resolveHttpUrl('/api/conversations', 'https://api.example.com')).toBe(
      'https://api.example.com/api/conversations'
    );
    expect(resolveHttpUrl('/login', 'https://api.example.com/')).toBe('https://api.example.com/login');
    expect(resolveHttpUrl('/logout', 'https://api.example.com/base/')).toBe('https://api.example.com/base/logout');
  });

  it('derives WebSocket URL from HTTP backend URL', () => {
    expect(resolveWsUrl('https://api.example.com')).toBe('wss://api.example.com/ws');
    expect(resolveWsUrl('http://localhost:8080/base')).toBe('ws://localhost:8080/base/ws');
  });
});
