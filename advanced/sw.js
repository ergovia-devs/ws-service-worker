self.importScripts('dexie.js');

const db = new Dexie('shopping-list2');

db.version(1).stores({
    items: '++id, name, state'
});

/* name of the cache, must be the same in app.js */
const CACHE = 'shopping-list';

/* event is called on first load, service worker will be installed */
self.addEventListener('install', function(evt) {
    console.info('The service worker is being installed');

    evt.waitUntil(
        caches.open(CACHE)
            .then(cache => cache.addAll(['./', './index.html', './style/main.css', './script/app.js', './manifest.json', './dexie.js']))
            .catch(console.error)
    );

});

self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim());
});

/* event is called, when any resource (images, css files or ajax) is requested */
self.addEventListener('fetch', function(evt) {
    console.info('The service worker is serving the request');

    if(evt.request.method != 'POST' && evt.request.url.indexOf('items.json') < 0) {

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
                            return cache.put(evt.request, fetchedResponse.clone());
                        }

                    }).catch(console.error)

            })
        );

    }

});

self.addEventListener('sync', function(event) {

    console.info('sync: ' + event.tag);

    if (event.tag == 'syncShoppingItems') {
        event.waitUntil(syncItems());
    }
});

const syncItems = function() {

    let names, url;

    return db.open()
        .then(() => db.items.where('state').equals('CREATED').sortBy("id"))
        .then(items => {

            let saveRequests = [];

            for(let item of items) {
                const formData = new FormData();
                formData.append('item', item.name);
                saveRequests.push(fetch('./save', {
                    method: 'POST',
                    body: formData
                }));
            }

            return Promise.all(saveRequests);
        })
        .then(() => db.items.where('state').equals('DELETED').sortBy("id"))
        .then(items => {

            let deleteRequests = [];

            for(let item of items) {
                const formData = new FormData();
                formData.append('item', item.name);
                deleteRequests.push(fetch('./delete', {
                    method: 'POST',
                    body: formData
                }));
            }

            return Promise.all(deleteRequests);

        })
        .then(() => fetch('./items.json'))
        .then(response => {
            url = response.url;
            return response.json();
        })
        .then(json => {
            names = json;
            return db.open();
        })
        .then(() => {

            let items = [];

            for(let name of names) {
                items.push({name, state: 'LOADED'})
            }

            return db.items.clear()
                .then(() => db.items.bulkAdd(items));
        })
        .catch(Dexie.BulkError, (e) => {console.log('it does not matter')})
        .then(() => self.clients.matchAll())
        .then(clients => {
            clients.forEach(client => {
                client.postMessage({type: 'refreshList', url: url});
            });
        })
        .catch(console.error)
};