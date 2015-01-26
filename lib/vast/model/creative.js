videojs.Vast.model.Creative = videojs.Vast.model.Trackable.extend({
    init: function (player, options, ready) {
        //FIXME On merge les options founri en parms pour dupliquer les events #0001
        options = videojs.obj.merge(options || {}, player.options_);
        //End #0001
        videojs.Vast.model.Trackable.call(this, player, options, ready);
        this.clickThroughUri = null;
        this.duration = null;
        this.parent = null;
        this.type = null;
    }

});

videojs.Vast.model.Creative.prototype.trackingEvents = videojs.VastTracker.trackingEvents.creative;

videojs.Vast.model.Creative.creativeTypes = {
    linear: 'linear',
    nonLinear: 'nonLinear',
    companion: 'companion'
};
