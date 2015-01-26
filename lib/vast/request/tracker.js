videojs.VastTracker = videojs.VastCoreObject.extend({
    init: function (player, options, ready) {
        videojs.VastCoreObject.call(this, player, options, ready);
    }
});

videojs.VastTracker.prototype.blocked = {};

videojs.VastTracker.prototype.options_ = {
    trackingEvents: {},
    children: {
        vastXHR: {},
        bucket: {}
    }
};


videojs.VastTracker.errorEvents = {
    creative: {
        invalidCreativeUri: 'invalidCreativeUri',
        invalidCreative: 'invalidCreative'
    }
};

videojs.VastTracker.trackingEvents = {
    ad: {
        impression: '0',
        // Hidden Videoplaza tracking events
        impression2: '3'
    },
    creative: {
        acceptInvitation: '1',
        clickThrough: '20', // companionClickThrough (92) for companions
        close: '7',
        creativeView: '90', // companionImpression (90) for companions
        collapse: '2',
        complete: '18',
        expand: '31',
        firstQuartile: '15',
        fullscreen: '37',
        midpoint: '16',
        mute: '32',
        pause: '34',
        resume: '36',
        rewind: '35',
        start: '14',
        skip: '23',
        thirdQuartile: '17',
        timeSpent: '100',
        unmute: '33',
        // Hidden Videoplaza tracking events
        creativeView2: '91',// companionImpression2 (91) for companions
        acceptInvitation2: '4',
        interaction: '10'
    }
};

// Helper function for the errorEventNames and trackingEventNames

videojs.VastTracker.generateEventIds = function (events) {
    var eventIds = {};

    for (var trackable in events) {
        if (events.hasOwnProperty(trackable)) {
            eventIds[trackable] = {};
            for (var name in events[trackable]) {
                if (events[trackable].hasOwnProperty(name)) {
                    eventIds[trackable][events[trackable][name]] = name;
                }
            }
        }
    }

    return eventIds;
};
// Generate id event name mapping
videojs.VastTracker.errorEventNames = videojs.VastTracker.generateEventIds(videojs.VastTracker.errorEvents);
videojs.VastTracker.trackingEventNames = videojs.VastTracker.generateEventIds(videojs.VastTracker.trackingEvents);

videojs.VastTracker.prototype.track = function (trackable, trackingEventId) {
    if (!trackable) {
        return false;
    }

    if (trackable.constructor === videojs.Vast.model.Ad) {
        return this.trackAdEvent(trackable, trackingEventId);
    } else if (trackable instanceof videojs.Vast.model.Creative) {
        return this.trackCreativeEvent(trackable, trackingEventId);
    }

    return false;
};


videojs.VastTracker.prototype.isBlocked = function (trackable, trackingEventId) {
    if (!trackingEventId) {
        trackingEventId = '';
    }

    if (trackable instanceof videojs.Vast.model.Trackable) {
        return trackable.uniqueId + trackingEventId in this.blocked;
    }
    return false;
};


videojs.VastTracker.prototype.trackAdEvent = function (ad, trackingEventId) {
    if (ad.constructor !== videojs.Vast.model.Ad || !videojs.VastTracker.trackingEventNames.ad[trackingEventId]) {
        return false;
    }

    if (this.isBlocked(ad)) {
        return false;
    }

    if (!this.isBlocked(ad, trackingEventId)) {
        if (trackingEventId === videojs.VastTracker.trackingEvents.ad.impression) {
            this.block(ad, trackingEventId);
        }

        this.trackUris(ad.trackingUris[videojs.VastTracker.trackingEventNames.ad[trackingEventId]]);
    } else if (trackingEventId === videojs.VastTracker.trackingEvents.ad.impression) {
        this.track(ad, videojs.VastTracker.trackingEvents.ad.impression2);
    }

    return true;
};


videojs.VastTracker.prototype.cachebustingMacroReplace = function (uri) {
    var digit8;
    var cbPattern = /\[CACHEBUSTING\]|%5BCACHEBUSTING%5D/;

    if (cbPattern.test(uri)) {
        digit8 = Math.floor(Math.random() * 89999999 + 10000000);
        uri = uri.replace(cbPattern, digit8.toString());
    }

    return uri;
};


videojs.VastTracker.prototype.trackUris = function (uris) {
    var uri = '';
    for (var i = 0; i < uris.length; i++) {
        uri = uris[i];
        if (videojs.Bucket.isBucketEvent(uri)) {
            this.bucket.add(this.cachebustingMacroReplace(uris[i]));
        } else {
            //yeah this is bad, to have it hard coded. Also, this is the default of the xhr request.
            this.vastXHR.request(this.cachebustingMacroReplace(uri), 2000);
        }
    }
};

videojs.VastTracker.prototype.trackCreativeEvent = function (creative, trackingEventId) {
    var ad,
        trackingEvents = videojs.VastTracker.trackingEvents.creative,
        companionEvents = [
            trackingEvents.clickThrough,
            trackingEvents.creativeView,
            trackingEvents.creativeView2
        ],
        interactionEvents = [
            trackingEvents.acceptInvitation,
            trackingEvents.clickThrough,
            trackingEvents.close,
            trackingEvents.collapse,
            trackingEvents.expand,
            trackingEvents.fullscreen,
            trackingEvents.pause,
            trackingEvents.resume,
            trackingEvents.rewind,
            trackingEvents.mute,
            trackingEvents.unmute
        ],
        adCappedEvents = [
            trackingEvents.acceptInvitation,
            trackingEvents.interaction,
            trackingEvents.start,
            trackingEvents.firstQuartile,
            trackingEvents.midpoint,
            trackingEvents.thirdQuartile,
            trackingEvents.skip,
            trackingEvents.complete
        ],
        creativeCappedEvents = [
            trackingEvents.creativeView
        ];

    if (!(creative instanceof videojs.Vast.model.Creative) || !videojs.VastTracker.trackingEventNames.creative[trackingEventId]) {
        return false;
    }

    if (creative instanceof videojs.Vast.model.Companion && (companionEvents.indexOf(trackingEventId) < 0)) {
        return false;
    }

    ad = creative.player();
    if (this.isBlocked(ad) || this.isBlocked(creative)) {
        return false;
    }

    if (interactionEvents.indexOf(trackingEventId) > -1 && creative.type !== videojs.Vast.model.Creative.creativeTypes.companion) {
        this.track(creative, trackingEvents.interaction);
    }

    if (trackingEventId === trackingEvents.complete) {
        this.track(creative, trackingEvents.thirdQuartile);
    } else if (trackingEventId === trackingEvents.thirdQuartile) {
        this.track(creative, trackingEvents.midpoint);
    } else if (trackingEventId === trackingEvents.midpoint) {
        this.track(creative, trackingEvents.firstQuartile);
    } else if (trackingEventId === trackingEvents.firstQuartile) {
        this.track(creative, trackingEvents.start);
    }

    if (trackingEventId === trackingEvents.timeSpent) {
        return true; // timeSpent is't implemented jet.
    }

    if (trackingEventId === trackingEvents.clickThrough && (creative.type === videojs.Vast.model.Creative.creativeTypes.nonLinear || creative.type === videojs.Vast.model.Creative.creativeTypes.companion)) {
        if (creative.resourceType !== videojs.Vast.model.NonLinearCreative.resourceTypes.staticResource) {
            return false; // clickThrough (20) / companionClickThrough (92) is only allowed on static nonlinears and companions
        }

        return true; // clickThrough for static nonlinears and companions isn't implemented jet.
    }

    if (!this.isBlocked(ad, trackingEventId) && !this.isBlocked(creative, trackingEventId)) {
        if (adCappedEvents.indexOf(trackingEventId) > -1) {
            this.block(ad, trackingEventId);
        }

        if (creativeCappedEvents.indexOf(trackingEventId) > -1) {
            this.block(creative, trackingEventId);
        }

        this.trackUris(creative.trackingUris[videojs.VastTracker.trackingEventNames.creative[trackingEventId]]);
    } else if (trackingEventId === trackingEvents.acceptInvitation) {
        this.track(creative, videojs.VastTracker.trackingEvents.creative.acceptInvitation2);
    } else if (trackingEventId === trackingEvents.creativeView) {
        this.track(creative, videojs.VastTracker.trackingEvents.creative.creativeView2);
    }

    return true;
};


videojs.VastTracker.prototype.block = function (trackable, trackingEventId) {
    if (!trackingEventId) {
        trackingEventId = '';
    }

    if (trackable instanceof videojs.Vast.model.Trackable) {
        this.blocked[trackable.uniqueId + trackingEventId] = true;
        return true;
    }
    return false;
};

//FIXME Qu'est ce que un inventory ?
videojs.VastTracker.createInventory = function (ad) {
    var inventory;

    if (!ad || ad.constructor !== videojs.Vast.model.Ad) {
        return false;
    }

    inventory = new videojs.Vast.model.Ad(ad.format_);
    inventory.type = videojs.Vast.model.Ad.types.inventory;

    for (var i = 0; i < ad.trackingUris.impression.length; i++) {
        if (ad.trackingUris.impression[i].search('aid=' + ad.id()) > -1) {
            inventory.trackingUris.impression.push(ad.trackingUris.impression[i].replace('aid=' + ad.id(), 'aid=' + inventory.id()));
        }
    }

    return inventory;
};

videojs.VastTracker.prototype.reportError = function (creative, errorEventId) {
    var ad;

    if (!creative || !(creative instanceof videojs.Vast.model.Creative) || !this.errorEventNames.creative[errorEventId]) {
        return false;
    }

    ad = creative.player();
    if (this.isBlocked(ad) || this.isBlocked(creative)) {
        return false;
    }

    if (creative.type === videojs.Vast.model.Creative.creativeTypes.companion) {
        this.block(creative);
    } else {
        if (!this.isBlocked(ad, videojs.VastTracker.trackingEvents.ad.impression)) {
            this.track(videojs.VastTracker.createInventory(ad), videojs.VastTracker.trackingEvents.ad.impression);
        }
        this.block(ad);
    }

    return true;
};
