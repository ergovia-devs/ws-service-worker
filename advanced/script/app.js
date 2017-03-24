(() => {

    const db = new Dexie('shopping-list2');

    // Define a schema
    db.version(1).stores({
        items: '++id, name, state'
    });

    if ('serviceWorker' in navigator) {

        navigator.serviceWorker.register('./sw.js')
            .then(() => navigator.serviceWorker.ready)
            .then(registration => {

                registration.update();

                document.getElementById('reload').addEventListener('click', () => {
                    registration.sync.register('syncShoppingItems');
                }, false);

                return registration.sync.register('syncShoppingItems');
            })
            .catch(console.error);

        navigator.serviceWorker.onmessage = function(evt) {

            const message = evt.data;

            if (message.type === 'refreshList') {
                loadList();
            }

        };
    }

    /* creates the html for the shopping list */
    const renderList = function(array) {

        const listElem = document.getElementById('list'),
            html = [];

        for (let item of array) {
            html.push(`<li class="item">${item.name}${item.state == 'CREATED' ? ' (pending...)' : ''}<button class="delete">Delete</button></li>`);
        }

        listElem.innerHTML = html.join('');

        for (let item of document.getElementsByClassName('item')) {
            item.addEventListener('click', deleteItem, false);
        }

    };

    /* Loads the list items from the server and updates the shoping list */
    const loadList = function() {
        return db.open()
            .then(() => db.items.where('state').equals('LOADED').or('state').equals('CREATED').sortBy("id"))
            .then(renderList)
            .catch(console.error);
    };

    /* Uploads a new shopping list item to the server and updates the list view */
    const saveItem = function(event) {

        const formTag = document.getElementById('save-form'),
            form = new FormData(formTag),
            item = form.get('item');

        db.open()
            .then(() => db.items.add({name: item, state: 'CREATED'}))
            .then(loadList)
            .then(() => navigator.serviceWorker.ready)
            .then(registration => registration.sync.register('syncShoppingItems'))
            .catch(console.error);

        document.activeElement.blur();

        formTag.reset();

        event.preventDefault();
        return false;
    };

    /* deletes an item from the server and updates the list */
    const deleteItem = function(event) {

        const item = event.target.parentNode.childNodes[0].textContent;

        db.open()
            .then(() => db.items.where('name').equals(item).modify({state: 'DELETED'}))
            .then(loadList)
            .then(() => navigator.serviceWorker.ready)
            .then(registration => registration.sync.register('syncShoppingItems'))
            .catch(console.error);

        event.preventDefault();
        return false;
    };

    document.getElementById('save-form').addEventListener('submit', saveItem, false);
})();

