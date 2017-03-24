/* name of the cache, must be the same in app.js */
const CACHE = 'shopping-list';

/* event is called on first load, service worker will be installed */
self.addEventListener('install', function(evt) {
    console.info('The service worker is being installed');

    evt.waitUntil(
        caches.open(CACHE)
            .then(cache => cache.addAll(['./', './index.html', './style/main.css', './script/app.js', './items.json', './manifest.json', './dexie.js']))
            .catch(console.error)
    );
});

/* event is called, when any resource (images, css files or ajax) is requested */
self.addEventListener('fetch', function(evt) {
    console.info('The service worker is serving the request');

    if(evt.request.method != 'POST') {

        /* return file from cache */
        evt.respondWith(

            caches.open(CACHE)
                .then(cache => cache.match(evt.request))
                .catch(console.error)
        );

        /* check if there is any newer version available in the server */
        evt.waitUntil(

            caches.open(CACHE).then(cache => {
                return Promise.all([
                    cache.match(evt.request),
                    fetch(evt.request)
                ])
                .then(responses => {

                    const cachedResponse = responses[0],
                        fetchedResponse = responses[1];

                    if(cachedResponse.headers.get('ETag') !== fetchedResponse.headers.get('ETag')) {
                        return cache.put(evt.request, fetchedResponse.clone())
                            .then(() => self.clients.matchAll())
                            .then(clients => {
                                clients.forEach(client => {
                                    client.postMessage({type: 'refreshList', url: fetchedResponse.url});
                                });
                            })
                            .catch(console.error);

                    }

                }).catch(console.error)

            })
        );

    }

});