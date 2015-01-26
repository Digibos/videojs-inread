videojs.Vast.model.Trackable = videojs.VastCoreObject.extend({
  init: function (player, options, ready) {
    videojs.VastCoreObject.call(this, player, options, ready);
    // Trackable properties
    this.trackingUris = this.generateTrackingUris();
    this.uniqueId = videojs.Vast.model.Trackable.generateUniqueId();
    this.id_ = 0;
  }
});

videojs.Vast.model.Trackable.prototype.options_ = {
  trackingEvents: {}
};

videojs.Vast.model.Trackable.prototype.trackingEvents = null;
videojs.Vast.model.Trackable.prototype.trackingUris = null;
videojs.Vast.model.Trackable.prototype.uniqueId = null;

videojs.Vast.model.Trackable.prototype.generateTrackingUris = function (trackingE) {
  var trackingUris = {},
    optTrackEvent = videojs.Vast.customTrackingEvents,
    trackingEvents = this.trackingEvents || trackingE;

  for (var trackingEventName in trackingEvents) {
    if (trackingEvents.hasOwnProperty(trackingEventName)) {
      trackingUris[trackingEventName] = [];
      //FIXME On merge les options founri en parms pour dupliquer les events #0001
      videojs.obj.each(optTrackEvent, function (key, value) {
        if (value.hasOwnProperty(trackingEventName)) {
          trackingUris[trackingEventName].push(value[trackingEventName]);
        }
      });
      //End #0001
    }
  }

  return trackingUris;
};
//TODO Use uniqueId froma videojs ????
videojs.Vast.model.Trackable.generateUniqueId = function () {
  return Math.floor(Math.random() * 10000000000000000);
};
