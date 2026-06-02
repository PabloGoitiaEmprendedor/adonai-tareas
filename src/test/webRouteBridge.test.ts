import { describe, expect, it } from 'vitest';
import { getLegacyWebRouteRedirect } from '@/lib/webRouteBridge';

describe('webRouteBridge', () => {
  it('converts legacy web hash routes to clean BrowserRouter URLs', () => {
    expect(getLegacyWebRouteRedirect({
      origin: 'https://webadonai.com',
      pathname: '/',
      search: '',
      hash: '#/faq',
      protocol: 'https:',
    })).toBe('https://webadonai.com/faq');

    expect(getLegacyWebRouteRedirect({
      origin: 'https://webadonai.com',
      pathname: '/',
      search: '',
      hash: '#/daily?focus=today',
      protocol: 'https:',
    })).toBe('https://webadonai.com/daily?focus=today');
  });

  it('supports legacy nested routes', () => {
    expect(getLegacyWebRouteRedirect({
      origin: 'https://webadonai.com',
      pathname: '/',
      search: '',
      hash: '#/invite/user-123',
      protocol: 'https:',
    })).toBe('https://webadonai.com/invite/user-123');
  });

  it('does not redirect clean routes, token fragments, or packaged Electron files', () => {
    expect(getLegacyWebRouteRedirect({
      origin: 'https://webadonai.com',
      pathname: '/faq',
      search: '',
      hash: '',
      protocol: 'https:',
    })).toBeNull();

    expect(getLegacyWebRouteRedirect({
      origin: 'https://webadonai.com',
      pathname: '/',
      search: '',
      hash: '#access_token=token',
      protocol: 'https:',
    })).toBeNull();

    expect(getLegacyWebRouteRedirect({
      origin: 'null',
      pathname: '/C:/Program Files/Adonai/resources/app.asar/dist/index.html',
      search: '',
      hash: '#/daily',
      protocol: 'file:',
    })).toBeNull();
  });
});
