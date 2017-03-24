(() => {

    /* list holds the shopping items */
    let list = [];

    /* name of the cache, must be the same in sw.js */
    const CACHE = 'shopping-list';

    if ('serviceWorker' in navigator) {

        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                registration.update();
            })
            .catch(console.error);

        navigator.serviceWorker.onmessage = function(evt) {

            const message = evt.data;

            if (message.type === 'refreshList') {

                caches.open(CACHE)
                    .then(cache => cache.match(message.url))
                    .then(response => response.json().then(json => {
                        list = json;
                        renderList(json);
                    }))
                    .catch(console.error);

            }

        };
    }

    /* creates the html for the shopping list */
    const renderList = function(array) {

        const listElem = document.getElementById('list'),
            html = [];

        for (let article of array) {
            html.push(`<li class="item">${article}<button class="delete">Delete</button></li>`);
        }

        listElem.innerHTML = html.join('');

        for (let item of document.getElementsByClassName('item')) {
            item.addEventListener('click', deleteItem, false);
        }

    };

    /* Loads the list items from the server and updates the shoping list */
    const loadList = function() {
        fetch('./items.json')
            .then(response => response.json())
            .then(json => {
                list = json;
                renderList(json);
            })
            .catch(console.error);
    };

    /* Uploads a new shopping list item to the server and updates the list view */
    const saveItem = function(event) {

        const formTag = document.getElementById('save-form'),
            form = new FormData(formTag);

        list.push(form.get('item'));
        renderList(list);

        document.activeElement.blur();

        fetch('./save', {
            method: 'POST',
            body: form
        }).then(() => {
            console.info('Save successful');
        }).catch(console.error);

        formTag.reset();

        event.preventDefault();
        return false;
    };

    /* deletes an item from the server and updates the list */
    const deleteItem = function(event) {

        const form = new FormData(),
            item = event.target.parentNode.childNodes[0].textContent;

        form.append('item', item);

        const tmpList = [];
        for (let i of list) {
            if (i !== item) {
                tmpList.push(i);
            }
        }

        list = tmpList;
        renderList(list);

        fetch('./delete', {
            method: 'POST',
            body: form
        }).then(() => {
            console.info('Delete successful');
        }).catch(console.error);

        event.preventDefault();
        return false;
    };

    document.getElementById('reload').addEventListener('click', loadList, false);
    document.getElementById('save-form').addEventListener('submit', saveItem, false);
    loadList();
})();

