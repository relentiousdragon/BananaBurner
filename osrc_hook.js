(function () {
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) {
        if (key === "OSRC") return "true";
        if (key === "bh-lazy-load") return "true";
        if (key === "bh-start-hidden") return "false";
        return originalGetItem.call(this, key);
    };
    try {
        Object.defineProperty(window.localStorage, 'OSRC', {
            get: () => "true",
            configurable: true
        });
        Object.defineProperty(window.localStorage, 'bh-lazy-load', {
            get: () => "true",
            configurable: true
        });
        Object.defineProperty(window.localStorage, 'bh-start-hidden', {
            get: () => "false",
            configurable: true
        });
    } catch (e) { }

    console.log('Banana Burner: OSRC Interceptor active');
})();
