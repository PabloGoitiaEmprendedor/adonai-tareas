type WebLocation = Pick<Location, 'origin' | 'pathname' | 'search' | 'hash' | 'protocol'>;

export function getLegacyWebRouteRedirect(location: WebLocation): string | null {
  const isWebProtocol = location.protocol === 'http:' || location.protocol === 'https:';

  if (!isWebProtocol || !location.hash.startsWith('#/')) {
    return null;
  }

  return `${location.origin}${location.hash.slice(1)}`;
}
