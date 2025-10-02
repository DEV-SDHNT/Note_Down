export function loadIndexedDB(dbname,storeName){
    return new Promise((resolve,reject)=>{
        const request=indexedDB.open(dbname);

        request.onerror=()=>{
            reject('Could not open IndexedDB');
        };
    });

}