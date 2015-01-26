videojs.Vast.model.Ad = videojs.Vast.model.Trackable.extend({
    init: function (player, options, ready) {
        videojs.Vast.model.Trackable.call(this, player, options, ready);
    }
});

videojs.Vast.model.Ad.prototype.trackingEvents = videojs.VastTracker.trackingEvents.ad;

videojs.Vast.model.Ad.types = {
    inventory: 'inventory',
    standard: 'standard_spot'
};

videojs.Vast.model.Ad.variants = {
    normal: 'normal',
    sponsor: 'sponsor'
};

videojs.Vast.model.Ad.prototype.skipAd = {
    enabled: 0,
    timeOut: 0
};

videojs.Vast.model.Ad.prototype.campaignId = null;
videojs.Vast.model.Ad.prototype.creatives = [];
videojs.Vast.model.Ad.prototype.customId = null;
videojs.Vast.model.Ad.prototype.customGoalId = null;
videojs.Vast.model.Ad.prototype.customCampaignId = null;
videojs.Vast.model.Ad.prototype.goalId = null;
videojs.Vast.model.Ad.prototype.labels = {};
videojs.Vast.model.Ad.prototype.type = videojs.Vast.model.Ad.types.standard;
videojs.Vast.model.Ad.prototype.variant = null;


