videojs.VastXHR = videojs.VastCoreObject.extend({
    init: function (player, options, ready) {
        videojs.VastCoreObject.call(this, player, options, ready);
    }
});

videojs.VastXHR.httpErrorCodeTranslation = {
    503: 'serviceUnavailableCode503',
    500: 'internalServerErrorCode500',
    404: 'requestedResourceNotFoundCode404',
    400: 'badRequestToServerCode400',
    0: 'requestCouldNotBeSentToServerCode0',
    ieError: 'requestFailedError'
};

videojs.VastXHR.prototype.request = function (uri, timeout, onSuccess, onError) {
    var xhr,
        method = 'GET', // TODO: Refactor this variable into a parameter so this can be used by the bucket.
        abortCalled,
        xhrTimeout;

    if (!timeout) {
        timeout = 2000; // TODO: Clean up!!!
    }

    if (!onSuccess) {
        onSuccess = function () {
        }; // TODO: Clean up!!!
    }

    if (!onError) {
        onError = function () {
        }; // TODO: Clean up!!!
    }

    if (window.XMLHttpRequest) {
        xhr = new window.XMLHttpRequest();

        if ('withCredentials' in xhr) {
            try {
                xhr.withCredentials = true;
            } catch (e) {
                // TODO: Handle?!
            }
            xhr.open(method, uri, true);
            abortCalled = false;

            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        onSuccess(xhr.responseText);
                    } else {
                        if (!abortCalled) {
                            onError(videojs.VastXHR.httpErrorCodeTranslation[xhr.status] || 'unknownError');
                        }
                    }

                    if (xhrTimeout) {
                        window.clearTimeout(xhrTimeout);
                    }
                }
            };

            xhr.send();

            xhrTimeout = window.setTimeout(function () {
                abortCalled = true;
                xhr.abort();
                onError('requestTimeout');
            }, timeout); // TODO: Research default value.
        } else if (window.XDomainRequest) { // IE CORS for IE9
            xhr = new window.XDomainRequest();

            xhr.onload = function () {
                onSuccess(xhr.responseText);
            };

            xhr.onerror = function () {
                onError(videojs.VastXHR.httpErrorCodeTranslation.ieError || 'unknownError');
            };

            //we need to set all handler, if not the call be aborted. That is why we set a empty function.
            xhr.onprogress = function () {
            };

            xhr.ontimeout = function () {
                onError('requestTimeout');
            };

            try {
                xhr.open(method, uri);
                xhr.timeout = timeout; // in milliseconds
                xhr.send();
            } catch (e) {
                //we remove line endings
                onError(videojs.VastXHR.httpErrorCodeTranslation.ieError || 'unknownError');
            }
        } else {
            onError('corsNotSupportedInBrowser');
        }
    }
};
