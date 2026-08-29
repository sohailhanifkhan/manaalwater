// Manaal Water Service Worker

const CACHE_NAME = 'manaal-water-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/order.html',
  '/account.html',
  '/contact.html',
  '/assets/style.css',
  '/assets/app.js'
];


// --------------------------------------------------
// INSTALL
// --------------------------------------------------

self.addEventListener('install', event => {

  event.waitUntil(

    caches
      .open(CACHE_NAME)
      .then(cache => {

        return cache.addAll(
          STATIC_ASSETS
        );

      })

  );

  self.skipWaiting();

});


// --------------------------------------------------
// ACTIVATE
// Remove previous Manaal Water cache versions
// --------------------------------------------------

self.addEventListener('activate', event => {

  event.waitUntil(

    caches
      .keys()
      .then(cacheNames => {

        return Promise.all(

          cacheNames.map(name => {

            if (
              name !== CACHE_NAME &&
              name.startsWith('manaal-water')
            ) {

              return caches.delete(name);

            }

          })

        );

      })

  );

  self.clients.claim();

});


// --------------------------------------------------
// FETCH
// Network first for pages/scripts,
// cache fallback if customer is offline.
// --------------------------------------------------

self.addEventListener('fetch', event => {

  const request = event.request;


  if (
    request.method !== 'GET'
  ) {

    return;

  }


  const url =
    new URL(request.url);


  // Do not interfere with external services
  // such as Firebase or Google Sheets.

  if (
    url.origin !== self.location.origin
  ) {

    return;

  }


  event.respondWith(

    fetch(request)

      .then(response => {

        if (
          !response ||
          response.status !== 200 ||
          response.type !== 'basic'
        ) {

          return response;

        }


        const copy =
          response.clone();


        caches
          .open(CACHE_NAME)
          .then(cache => {

            cache.put(
              request,
              copy
            );

          });


        return response;

      })

      .catch(() => {

        return caches
          .match(request)
          .then(cached => {

            if (cached) {

              return cached;

            }


            if (
              request.mode === 'navigate'
            ) {

              return caches.match(
                '/index.html'
              );

            }


            return Response.error();

          });

      })

  );

});
