videojs.Vast.model.MediaFile = videojs.VastCoreObject.extend({
    init: function (player, options, ready) {
        videojs.VastCoreObject.call(this, player, options, ready);
        this.bitRate = null;
        this.deliveryMethod = null;
        this.height = null;
        this.type = null;
        this.src = null;
        this.width = null;
    }
});
