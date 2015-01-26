videojs.Bucket = videojs.VastCoreObject.extend({
    init: function (player, options, ready) {
        videojs.VastCoreObject.call(this, player, options, ready);
    }
});

videojs.Bucket.isBucketEvent = function (uri) {
    videojs.log('isBucketEvent,', uri);
    return false;
};

videojs.Bucket.prototype.add = function () {
    return false;
};

videojs.Bucket.prototype.empty = function () {
    return false;
};
