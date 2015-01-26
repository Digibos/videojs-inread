videojs.Vast.model.LinearCreative = videojs.Vast.model.Creative.extend({
    init: function (player, options, ready) {
        videojs.Vast.model.Creative.call(this, player, options, ready);
        this.mediaFiles = [];

        // Creative properties
        this.type = videojs.Vast.model.Creative.creativeTypes.linear;
    }
});
