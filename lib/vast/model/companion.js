videojs.Vast.model.Companion = videojs.Vast.model.NonLinearCreative.extend({
    init: function (player, options, ready) {
        videojs.Vast.model.NonLinearCreative.call(this, player, options, ready);
        this.zoneId = null;
        this.zoneType = null;

        // Creative properties
        this.type = videojs.Vast.model.Creative.creativeTypes.companion;
    }
});

videojs.Vast.model.Companion.zoneTypes = {
    html: 'html'
};
