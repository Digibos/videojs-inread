videojs.LocalStorage = videojs.VastCoreObject.extend({
    init: function (player, options, ready) {
        videojs.VastCoreObject.call(this, player, options, ready);
        this.pidKey = this.id('vpPID');
    }
});

videojs.LocalStorage.prototype.getObjectFromUri = function (uri) {
    var uriObj = {};
    var uriSplit = uri.split('?');
    if (uriSplit.length > 0) {
        uriObj.base = uriSplit[0];
        uriObj.params = {};
        if (uriSplit[1]) {
            var paramsArr = uriSplit[1].split('&');
            for (var i = 0; i < paramsArr.length; i++) {
                var paramSplit = paramsArr[i].split('=');
                uriObj.params[paramSplit[0]] = (paramSplit[1]) ? paramSplit[1] : null;
            }
        } else {
            uriObj.params = null;
        }
        return uriObj;
    } else {
        return null;
    }
};

videojs.LocalStorage.prototype.supportsLocalStorage = function () {
    try {
        return 'localStorage' in window && window.localStorage !== null;
    } catch (e) {
        return false;
    }
};

videojs.LocalStorage.prototype.getData = function (key) {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        return null;
    }
};

videojs.LocalStorage.prototype.setData = function (key, data) {
    try {
        localStorage.setItem(key, data);
        return true;
    } catch (e) {
        return false;
    }
};

videojs.LocalStorage.prototype.removeData = function (key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (e) {
        return false;
    }
};

//extracts the persistent id from ticket
videojs.LocalStorage.prototype.getPersistentIdFromTicket = function (ticket) {
    var pid = null, ticketImpr;
    if (this.supportsLocalStorage()) {
        if (ticket.length > 0) {
            ticketImpr = ticket[0].trackingUris.impression;
            videojs.obj.each(ticketImpr, videojs.bind(this, function (key, value) {
                var uriObj = this.getObjectFromUri(value);
                if (uriObj && uriObj.params && uriObj.params.pid) {
                    pid = uriObj.params.pid;
                    if (!this.setData(this.pidKey, pid)) {
                        return null;
                    }
                }
            }));
        }
    }

    return pid;
};

videojs.LocalStorage.prototype.getPersistentIdFromLocalStorage = function () {
    if (this.supportsLocalStorage()) {
        //try to get stored persistentId
        return this.getData(this.pidKey);
    }
    return null;
};
