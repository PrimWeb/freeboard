
//https://gomakethings.com/how-to-set-an-expiration-date-for-items-in-a-service-worker-cache/
/*
Made with ❤️ in Massachusetts. Unless otherwise noted, all code is free to use under the MIT License. I also very irregularly share non-coding thoughts.
*/


const channel = new BroadcastChannel('offroad-js-sw');

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open("offroad-v1").then(self.skipWaiting())
    );
});


// Listen for messages on "my_bus".
channel.onmessage = function (e) {
    console.log('Received', e.data);

        if (e.data.addToCache) {
            for (i in e.data.addToCache) {
                cachedRequest(new Request(i), e);
        }
    }
};


var isValid = function (response) {
    if (!response) return false;
    var fetched = response.headers.get('sw-fetched-on');
    var expire = response.headers.get('sw-valid-for');

    if (fetched && (parseFloat(fetched) + parseFloat(expire || (1000 * 3600 * 24))) > new Date().getTime()) return true;
    return false;
};


self.addEventListener('fetch', function (event) {
    var request = event.request

    console.log('Handling fetch event for', event.request.url);

    event.respondWith(cachedRequest(request,event));
})


function cachedRequest(request,event) {
    return caches.match(request).then(function (response) {
        //Nothing already in the cache, meaning we don't have any settings for it yet.
        //So we just have to return the file as is.
        if (!response) {
            return fetch(request).then(function (response) {
                // Return the requested file
                return response;
            })
        }

        // If there's a cached API and it's still valid, use it
        if (isValid(response)) {
            return response;
        }

        //Get the expiry time we have, refresh it for that long.
        var expire = response.headers.get('sw-valid-for');
        // Otherwise, make a fresh API call
        return fetch(request).then(function (response) {

            // Cache for offline access
            var copy = response.clone();
            event.waitUntil(caches.open('api').then(function (cache) {
                var headers = new Headers(copy.headers);
                headers.append('sw-fetched-on', new Date().getTime());
                headers.append('sw-valid-for', expire);

                headers.append('sw-last-used', new Date().getTime());

                return copy.blob().then(function (body) {
                    return cache.put(request, new Response(body, {
                        status: copy.status,
                        statusText: copy.statusText,
                        headers: headers
                    }));
                });
            }));

            // Return the requested file
            return response;
        }).catch(function (error) {
            return caches.match(request).then(function (response) {


                var lastused = response.headers.get('sw-last-used')

                //More tham a month old, we need to refresh the last-used time.
                //We don't want to do that on every page load, that might wear out flash mem.
                //But we do it once a month, plenty of margin to refresh before the 3 month window when everything gets deleted.
                if (fetched && (parseFloat(fetched) + parseFloat(expire || (1000 * 3600 * 24 * 60))) < new Date().getTime()) {
                    // Cache for offline access
                    var copy = response.clone();
                    event.waitUntil(caches.open('api').then(function (cache) {
                        var headers = new Headers(copy.headers);
                        headers.append('sw-last-used', new Date().getTime());
                        return copy.blob().then(function (body) {
                            return cache.put(request, new Response(body, {
                                status: copy.status,
                                statusText: copy.statusText,
                                headers: headers
                            }));
                        });
                    }));
                }

                return response;
            });
        });

    })
}