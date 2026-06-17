const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

function json(payload, init = {}) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      ...JSON_HEADERS,
      ...(init.headers || {}),
    },
  });
}

function endpointPath(url) {
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (path.startsWith('/api/')) return path;
  if (path === '/api') return '/api';
  if (path === '/login') return '/login';
  if (path === '/logout') return '/logout';
  if (path === '/healthz') return '/healthz';
  return null;
}

async function route(request) {
  const url = new URL(request.url);
  const path = endpointPath(url);

  if (!path) return null;
  if (request.method.toUpperCase() === 'OPTIONS') return new Response(null, { status: 204 });

  if (path === '/healthz') {
    return new Response('ok', {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }

  return json(
    {
      error: 'mock route not implemented',
      path,
    },
    { status: 501 }
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    route(event.request).then((response) => {
      if (response) return response;
      return fetch(event.request);
    })
  );
});
