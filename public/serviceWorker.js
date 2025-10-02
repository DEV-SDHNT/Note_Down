const CACHE = "NoteDown-Cache";
const urlsToCache = [
    '/',
    '/index.html',
    '/ws',
    '/static/js/bundle.js',
    '/static/css/main.css'
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE).then((cache) => {
            console.log("cache opened");
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response)=>{
            if(response){
                return response;
            }
            return fetch(event.request).then(
                (networkResponse)=>{
                    if(!networkResponse || networkResponse.status!==200 || networkResponse.type!=='basic'){
                        return networkResponse;
                    }
                    const responseToCache=networkResponse.clone();
                    
                    caches.open(CACHE).then((cache)=>{
                        cache.put(event.request,responseToCache);
                    });
                    return networkResponse;
                }
            );           
        })
    );
});
self.addEventListener("activate", (event) => {
    console.log("Service worker activated");
    const cacheWhiteList=[CACHE];
    event.waitUntil(
        caches.keys().then((cacheNames)=>{
            return Promises.all(
                cacheNames.map((cacheName)=>{
                    if(cacheWhiteList.indexOf(cacheName)===-1){
                        return caches.delete(cacheName);
                    }
                })
            )
        })
    )
});

