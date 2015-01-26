videojs.Vast = videojs.VastCoreObject.extend({
  init: function (player, options, ready) {
    videojs.VastCoreObject.call(this, player, options, ready);
    videojs.Vast.customTrackingEvents = this.options().trackingEvents;
    this.contentMetadata = this.options().contentMetadata;
    this.requestSettings = this.options().requestSettings;
    this.trackingEvents = videojs.VastTracker.trackingEvents;
    this.ready(this.onReady);
    this.triggerReady();
  }
});

videojs.Vast.prototype.createEl = function () {
  return videojs.Component.prototype.createEl.call(this, 'div', {
    className: 'videojs-vast-plugin'
  });
};

videojs.Vast.customTrackingEvents = [];

videojs.Vast.prototype.options_ = {
  bitRate: 200,
  version: '3.0',
  host: '',
  contentMetadata: {
    category: 'validation',
    contentPartner: 'myContentPartner',
    contentForm: 'shortForm',
    contentId: 'myContentId',
    tags: ['standard'],
    flags: [],
    playbackPosition: [] // mid-roll cue points, if any.
  },
  requestSettings: {
    width: null,
    height: null,
    bitrate: null,
    insertionPointType: null,
    playbackPosition: null
  },
  children: {
    adCallModule: {},
    vastTracker: {},
    skipAdButton: {}
  }
};

videojs.Vast.model = {};

videojs.Vast.prototype.adsError = function (error) {
  videojs.log('error getting ads from server api');
};

videojs.Vast.prototype.playerState = {
  initialControls: false,
  originalAutoPlay: false,
  originalSrc: null,
  timeToResume: 0,
  ended: false
};

videojs.Vast.prototype.takeoverCallbacks = {
  onTakeover: null,
  onRelease: null
};

videojs.Vast.prototype.skipHandler = {
  start: function (timeOut) {
    this.player().trigger('autoCloseExit');
  },
  end: null
};

videojs.Vast.prototype.clickEvent = 'click';
videojs.Vast.prototype.midrolls = [];
videojs.Vast.prototype.adPlaying = false;
videojs.Vast.prototype.adsEnabled = true;
videojs.Vast.prototype.lastPlayedMidroll = null;

videojs.Vast.prototype.adCallModule = {};
videojs.Vast.prototype.tracker = {};
videojs.Vast.prototype.trackingEvents = {};

videojs.Vast.prototype.on = function (type, fn) {
  if (this.player() && type && fn) {
    this.player().on(type, videojs.bind(this, fn));
  }
};

videojs.Vast.prototype.off = function (type, fn) {
  if (this.player() && type && fn) {
    this.player().off(type, videojs.bind(this, fn));
  }
};

videojs.Vast.prototype.dispose = function () {
  videojs.Component.prototype.dispose.call(this);
};

videojs.Vast.prototype.onReady = function () {
  var options = this.options();
  this.clickEvent = videojs.IS_IPAD ? 'touchstart' : 'click';
  //this.on('preload', this.initCalls);
  if (this.player().autoplay()) {
    this.checkForPreroll();
  }
  else {
    this.on('preload', this.checkForPreroll);
  }
};

videojs.Vast.prototype.onError = function () {
  this.player().trigger('error');
};


videojs.Vast.prototype.onSkip = function () {
  this.vastTracker.track(this.adVideo, this.trackingEvents.creative.skip);
  this.skipCurrentAd();
};

//=====================================   INNER SDK  =================================//
videojs.Vast.prototype.logError = function () {
  videojs.log.call(this, arguments);
};

videojs.Vast.prototype.companionHandler = function (cb, zone, width, height) {
  videojs.log('got companion banner for zone ' + zone + ' with dimensions ' + width + 'x' + height);
  var cpEvent = {
    type: 'showCompanion',
    cb: cb,
    zone: zone,
    width: width,
    height: height
  };

  this.player().trigger(cpEvent);

  return true;
};

/**
 * Set or clear the function to call to display a companion banner
 *
 * The function will be passed the HTML of the companion banner (usually an iframe).
 * It will also receive the companion ad's zone ID, its width and its height.
 * This function MUST return true if the companion banner was successfully shown.
 *
 * If the argument to this function is not a function, the existing handler will be cleared
 *
 * @param {?function(object): boolean} companionHandlerCallback
 *   Function to call when companion banners are to be displayed.
 */
videojs.Vast.prototype.setCompanionHandler = function (callBack) {
  this.companionHandler = callBack;
};


/**
 * Returns shared gesture properties across event types
 * @param {Object} settingsObj
 */
videojs.Vast.prototype._extendGestureObj = function (settings) {
  return videojs.Button.prototype._extendGestureObj.call(this, settings);
};

videojs.Vast.prototype.takeover = function () {
  videojs.log('take over player');
  this.playerState.initialControls = this.player().controls();
  this.player().controls(false);

  this.off('canplay', this.onVideoCanPlay);
  this.off('play', this.checkForPreroll);
  this.off('timeupdate', this.checkForMidroll);
  this.off('ended', this.checkForPostroll);

  this.on(this.clickEvent, this.onAdClick);

  this.on('play', this.onAdPlay);

  //TODO, avec flash le canplay tourne en boucle (flv)
  this.on('canplay', this.onAdCanPlay);
  this.on('timeupdate', this.onAdTick);
  this.on('ended', this.showNextAd);
  this.on('error', this.onAdError);


  if (typeof this.takeoverCallbacks.onTakeover === 'function') {
    this.takeoverCallbacks.onTakeover(this.player());
  }
};

videojs.Vast.prototype.release = function () {
  videojs.log('release player');
  this.player().controls(this.playerState.initialControls);
  this.player().autoplay(this.playerState.originalAutoPlay);
  this.player().trigger('hideSkip');

  this.off('play', this.onAdPlay);
  this.off(this.clickEvent, this.onAdClick);
  this.off(this.clickEvent, this.onAdClickToResume);
  //TODO, avec flash le canplay tourne en boucle (flv)
  this.off('canplay', this.onAdCanPlay);
  this.off('timeupdate', this.onAdTick);
  this.off('ended', this.showNextAd);

  this.on('canplay', this.onVideoCanPlay);
  this.on('play', this.checkForPreroll);
  this.on('timeupdate', this.checkForMidroll);
  this.on('ended', this.checkForPostroll);

  if (typeof this.takeoverCallbacks.onRelease === 'function') {
    this.takeoverCallbacks.onRelease(this.player());
  }
};
/**
 * Called when ads are received from VastParser
 *
 * @param {object[]} ads The ads received
 */
videojs.Vast.prototype.onAdsReceived = function (ads) {
  videojs.log('got ads', ads);
  this.ads = ads;
  this.adIndex = -1;

  this.showNextAd();
};


videojs.Vast.prototype.initCalls = function (e) {
  this.off('preload', this.initCalls);
  this.checkForPreroll();
};

videojs.Vast.prototype.checkForPreroll = function (e) {

  e = videojs.fixEvent(e);
  if (e.isDefaultPrevented()) {
    return false;
  }

  if (!this.hasShownPreroll) {
    this.runAds('onBeforeContent');
    this.hasShownPreroll = true;
  }
};

/**
 * Shows a midroll if a midroll should be played
 *
 * This is determined by looking through the list of midrolls (which is sorted),
 * and finding the latest timestamp which has been passed.
 * If the last midroll shown was not the one we last passed, then we
 * show that one.
 */
videojs.Vast.prototype.checkForMidroll = function (e) {

  e = videojs.fixEvent(e);
  if (e.isDefaultPrevented()) {
    return false;
  }

  if (this.adPlaying) {
    return false;
  }
  if (this.midrolls.length === 0) {
    return false;
  }
  var potentialMidroll = null;
  for (var i = 0, l = this.midrolls.length; i < l; i++) {
    if (this.midrolls[i] > this.player().currentTime()) {
      break;
    }
    potentialMidroll = i;
  }
  if (potentialMidroll !== null && potentialMidroll !== this.lastPlayedMidroll) {
    videojs.log('playing overdue midroll ' + potentialMidroll);
    this.lastPlayedMidroll = potentialMidroll;
    this.runAds('playbackPosition', true);

    return true;
  }

  return false;
};

/**
 * Shows a postroll if a postroll should be played
 */
videojs.Vast.prototype.checkForPostroll = function (e) {

  e = videojs.fixEvent(e);
  if (e.isDefaultPrevented()) {
    return false;
  }

  if (!this.hasShownPostroll) {
    this.hasShownPostroll = true;
    this.runAds('onContentEnd');
  }
};

videojs.Vast.prototype.showNextAd = function (e) {
  e = videojs.fixEvent(e);
  if (e.isDefaultPrevented()) {
    return false;
  }

  //apres le premier preroll on force en autoplay
  //if (this.adIndex >= 0) {
  this.player().autoplay(true);
  //}

  this.adPlaying = false;
  this.adIndex++;

  if (!this.adsEnabled || this.adIndex >= this.ads.length) {
    videojs.log('no more ads');

    if (typeof this.skipHandler.end === 'function') {
      this.skipHandler.end.call(this);
    }

    this.resumeOriginalVideo();
    return false;
  }

  videojs.log('showing ad #' + this.adIndex);
  this.ad = this.ads[this.adIndex];

  switch (this.ad.type) {
    case 'standard_spot':
      videojs.log('found standard spot');
      this.displayAdCreatives(this.ad.creatives);
      return true;
    case 'inventory':
      videojs.log('found inventory');
      this.vastTracker.track(this.ad, this.trackingEvents.ad.impression);
      return this.showNextAd();
    default:
      this.onVastParserError('ad player ' + this.ad.type + ' not supported');
      return false;
  }
}
;
/**
 * Show the given companion banner
 *
 * @param {object} companion The companion banner to display
 * @param {string} companion.id Companion banner ID
 * @param {string} companion.resource Companion resource to display
 * @param {string} companion.resourceType Companion type
 * @param {object} companion.trackingUrls
 * @param {string} companion.type Always === 'companion'
 * @return {boolean} Whether the companion banner was successfully shown
 */
videojs.Vast.prototype.showCompanionBanner = function (companion) {
  videojs.log('show companion banner', companion);
  if (typeof this.companionHandler !== 'function') {
    return false;
  }

  var cb = videojs.createEl('iframe', {
      scrolling: 'no',
      frameborder: 0,
      width: companion.width,
      height: companion.height,
      src: companion.resource
    }
  );

  if (this.companionHandler(cb, companion.zoneId, companion.width, companion.height)) {
    this.vastTracker.track(companion, this.trackingEvents.creative.creativeView);
    return true;
  }

  return false;
};
/**
 * Display all the given creatives
 *
 * Will play the last video in the list, and call showCompanion on every
 * creative with .type === 'companion'
 *
 * @param {object[]} creatives List of creatives to display
 */
videojs.Vast.prototype.displayAdCreatives = function (creatives) {
  this.adVideo = null;

  videojs.log('found ' + creatives.length + ' creatives for ad');
  for (var i = 0, l = creatives.length; i < l; i++) {
    if (this.adVideo) {
      continue;

    }
    var creative = creatives[i];
    switch (creative.type) {
      case videojs.Vast.model.Creative.creativeTypes.companion:
        videojs.log('found companion creative', creative);
        if (!this.showCompanionBanner(creative)) {
          this.logError('VastParser error: no way of displaying companion ad');
        }
        break;
      default:
        videojs.log('found video creative', creative);
        this.adVideo = creative;
        break;
    }
  }

  if (!this.adVideo) {
    this.logError('VastParser error: bad ad - no video', this.ad);
    this.showNextAd();
    return;
  }

  //On met a jour le clickTag du player, s'il existe
  var clickEvent = {type: 'updateClickTag', clickTag: this.adVideo.clickThroughUri};
  this.player().trigger(clickEvent);

  this.playVideoAd();
};

/**
 * Should be called if VastParser encounters an error
 *
 * Will log an error message and resume normal video playback
 *
 * @param {string} message A message describing the error
 */
videojs.Vast.prototype.onVastParserError = function (message) {
  this.logError('VastParser error: ' + message);
  if (videojs.IS_ANDROID && this.adPlaying && message === 'equestTimeout') {
    return;
  }
  this.resumeOriginalVideo();
};

/**
 * Fetches and displays ads
 *
 * @param {string} insertionPoint The type of ad to fetch
 *      May be one of: onBeforeContent, playbackPosition, onContentEnd, playbackTime, onSeek
 * @param {boolean} [includePosition] Whether to send the current video position
 */
videojs.Vast.prototype.runAds = function (insertionPoint, includePosition) {
  this.player().pause();
  this.prepareAdPlayback();
  this.requestSettings.insertionPointType = insertionPoint;

  if (includePosition) {
    this.requestSettings.playbackPosition = this.player().currentTime();
  } else {
    this.requestSettings.playbackPosition = null;
  }

  var onSuccess = videojs.bind(this, this.onAdsReceived);
  var onFail = videojs.bind(this, this.onVastParserError);

  this.adCallModule.requestAds(this.contentMetadata, this.requestSettings, onSuccess, onFail);
};

/**
 * Callback for tracking when an ad starts playing or resumes
 */
videojs.Vast.prototype.onAdPlay = function () {
  if (!this.adPlaying) {
    videojs.log('ad started playing');
    this.vastTracker.track(this.ad, this.trackingEvents.ad.impression);
    this.vastTracker.track(this.adVideo, this.trackingEvents.creative.creativeView);
    this.vastTracker.track(this.adVideo, this.trackingEvents.creative.start);
  } else {
    // resume
    videojs.log('ad resumed');
    this.vastTracker.track(this.adVideo, this.trackingEvents.creative.resume);
  }

  this.adPlaying = true;
};
/**
 * Ad click handler
 *
 * @param {Event} e Click event
 */
videojs.Vast.prototype.onAdClick = function (e) {
  e = videojs.fixEvent(e);
  if (e.isDefaultPrevented()) {
    return false;
  }
  if (!this.adPlaying) {
    return;
  }
  videojs.log('ad click through to ' + this.adVideo.clickThroughUri);
  this.vastTracker.track(this.adVideo, this.trackingEvents.creative.clickThrough);
  window.open(this.adVideo.clickThroughUri, '_blank');

  this.player().controls(true);
  this.player().pause();

  this.off(this.clickEvent, this.onAdClick);
  // This event will not fire on iPads, since we show controls after returning
  // @see http://apto.ma/ipadvideotouchevents
  this.on(this.clickEvent, this.onAdClickToResume);
  //this.on('play', this.onAdResume);

  e.preventDefault();
  return false;
};


/**
 * Track progress on ad playback
 */
videojs.Vast.prototype.onAdTick = function () {
  if (!(this.player() && this.adVideo && this.adPlaying)) {
    videojs.log('Player or ad video not ready');
    return false;
  }
  var currentTime = this.player().currentTime();
  if (this.ad.skipAd && videojs.getBool(this.ad.skipAd.enabled) && Math.round(currentTime) >= this.ad.skipAd.timeOut) {
    this.player().trigger('showSkip');
  }

  var percent = currentTime / this.adVideo.duration;
  if (this.unsentQuartiles.length && percent > this.unsentQuartiles[0]) {
    var q = this.unsentQuartiles.shift();
    switch (q) {
      case 0.25:
        videojs.log('logged first quartile');
        this.vastTracker.track(this.adVideo, this.trackingEvents.creative.firstQuartile);
        break;
      case 0.5:
        videojs.log('logged midpoint');
        this.vastTracker.track(this.adVideo, this.trackingEvents.creative.midpoint);
        break;
      case 0.75:
        videojs.log('logged third quartile');
        this.vastTracker.track(this.adVideo, this.trackingEvents.creative.thirdQuartile);
        break;
      case 0.99:
        videojs.log('logged last quartile');
        this.vastTracker.track(this.adVideo, this.trackingEvents.creative.complete);
        break;
    }
  }

  return true;
};

/**
 * Store state of original player and prepare for ad playback
 *
 * @return {boolean} Whether player needed to be prepared
 */
videojs.Vast.prototype.prepareAdPlayback = function () {
  videojs.log('told to create ad player');
  if (this.adPlaying) {
    return false;
  }

  if (this.player()) {
    videojs.log('actually created ad player');
    if (this.playerState.originalSrc !== null) {
      videojs.log('Player state has src set', this.playerState.originalSrc, this.player().currentSrc());
    }
    this.playerState.originalAutoPlay = this.player().autoplay();
    this.playerState.originalSrc = this.player().currentSrc();
    this.playerState.timeToResume = this.player().currentTime();
    this.playerState.ended = this.player().ended();

    videojs.log('saved state', this.playerState, this.player().currentTime());
    this.takeover();

    this.adPlaying = false;

    return true;
  }

  return false;
};

videojs.Vast.prototype.onAdError = function (e) {
  if (e.target.error) {
    switch (e.target.error.code) {
      case e.target.error.MEDIA_ERR_ABORTED:
        this.logError('Ad playback aborted.');
        break;
      case e.target.error.MEDIA_ERR_NETWORK:
        this.logError('A network error caused the video download to fail part-way');
        break;
      case e.target.error.MEDIA_ERR_DECODE:
        this.logError('The video playback was aborted due to a corruption problem or because the video used features your browser did not support');
        break;
      case e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
        this.logError('The video could not be loaded, either because the server or network failed or because the player is not supported');
        break;
      default:
        this.logError('An unknown error occurred');
        break;
    }
  }

  this.showNextAd();
};

videojs.Vast.distance = function (p1, p2) {
  return Math.sqrt(Math.pow(p1.bitRate - p2.bitRate, 2));
};

videojs.Vast.prototype.getBrandWidth = function (medias) {
  //var connection
  // create a custom object if navigator.connection isn't available
  //connection = navigator.connection || { 'type': '0' };

  var bitRat = {bitRate: this.options_.bitRate/*this.player().width()*/};

  medias.sort(function (a, b) {
    return videojs.Vast.distance(bitRat, a) - videojs.Vast.distance(bitRat, b);
  });

  videojs.log(bitRat, medias);
};
/**
 * Parse les creatives retournées par L'adserver Et player les valeurs pour le player
 * @param medias
 * @returns {*}
 */
videojs.Vast.prototype.parseMediaFiles = function (medias) {

  videojs.obj.each(medias, function (key, value) {
    value.src = value.uri;
    value.type = value.mimeType;
  });

  this.getBrandWidth(medias);

  return medias;
};
/**
 * Play the current video ad
 */
videojs.Vast.prototype.playVideoAd = function () {
  videojs.log('playing ad', this.adVideo);
  this.unsentQuartiles = [0.25, 0.5, 0.75, 0.99];

  if (typeof this.skipHandler.start === 'function') {
    this.skipHandler.start.call(this, this.adVideo.duration);
  }

  var mediaFiles = this.parseMediaFiles(this.adVideo.mediaFiles);
  if (!mediaFiles) {
    this.onVastParserError('No mediaFile for ad player ' + this.ad.type + ' not supported');
    return;
  }

  this.player().src(mediaFiles);
  this.player().load();
  if (videojs.IS_ANDROID) {
    this.onAdCanPlay();
  }
};

/**
 * Called when the ad has loaded and can be played
 */
videojs.Vast.prototype.onAdCanPlay = function () {
  if (this.player().autoplay() === false) {
    return;
  }
  //this.player().play();
  // FIXME suppress on firefox bug v22*/
  /*if (!videojs.IS_FIREFOX)
   this.player().currentTime(0);*/
};
videojs.Vast.prototype.resumeClick = function () {
  this.off('play', this.resumeClick);
  this.on(this.clickEvent, this.onAdClick);
};

videojs.Vast.prototype.onAdResume = function () {
  videojs.log('-- ad resume');
  this.off(this.clickEvent, this.onAdClickToResume);
  //this.off('play', this.onAdResume);
  this.player().controls(this.playerState.initialControls);
  //this.on('play', this.resumeClick);
  //on patiente 300 milliseconds car des element de clics sont partis
  setTimeout(videojs.bind(this, function () {
    this.on(this.clickEvent, this.onAdClick);
  }), 300);

};
/**
 * Called when ad is clicked after clicktrough
 */
videojs.Vast.prototype.onAdClickToResume = function (e) {
  e = videojs.fixEvent(e);
  if (e.isDefaultPrevented()) {
    return false;
  }
  videojs.log('-- click to resume');
  this.onAdResume();
  this.player().play();
};

/**
 * Called when the video has loaded and can be played
 */
videojs.Vast.prototype.onVideoCanPlay = function () {
  if (this.playerState.ended && (videojs.IS_IOS || videojs.IS_ANDROID)) {
    // Apple and Android devices will always load video after setting src. Need to pause.
    this.player().pause();
    return;
  }

  if (this.playerState.timeToResume === 0 || this.playerState.timeToResume === null) {
    this.player().play();
    return;
  }

  if (!this.playerState.isBuffering) {
    this.player().play();
  }

  /*if (this.player().seekable.length === 0 ||
   this.player().seekable.end(0) < this.playerState.timeToResume) {
   this.player().pause();
   this.playerState.isBuffering = true;
   setTimeout(this.onVideoCanPlay, 200);
   return;
   }*/
  if (!videojs.IS_FIREFOX) {
    this.player().currentTime(this.playerState.timeToResume);
  }
  this.player().play();
  this.playerState.isBuffering = false;
  this.playerState.timeToResume = 0;
};

/**
 * Resumes normal video playback and releases event capturing
 */
videojs.Vast.prototype.resumeOriginalVideo = function () {
  videojs.log('resuming watched player', this.playerState);
  this.player().trigger('seeked');

  this.release();

  if (this.player() && !this.playerState.ended) {
    if (this.player().currentSrc() === this.playerState.originalSrc || !this.playerState.originalSrc) {
      if (this.playerState.originalSrc) {
        this.player().play();
      }
      else {
        this.takeover();
        this.triggerVideoEvent('ended');
        return;
      }

    } else {
      this.player().src(this.playerState.originalSrc);
      this.player().load();

      // Android doesn't respond to canplay event
      if (videojs.IS_ANDROID) {
        this.player().play();
      }
    }
  }


  this.adPlaying = false;

  if (this.playerState.ended) {
    this.player().autoplay(false);
    if (this.player().currentSrc() !== this.playerState.originalSrc) {
      this.player().src(this.playerState.originalSrc);
    }

    this.triggerVideoEvent('ended');
  }

};

/**
 * Trigger an event with the given type on the currently watched player
 *
 * @see http://stackoverflow.com/questions/2490825/how-to-trigger-event-in-javascript
 * @param {string} eType Event type to trigger
 */
videojs.Vast.prototype.triggerVideoEvent = function (eType) {
  if (!this.player()) {
    return;
  }

  var event;
  event = document.createEvent('HTMLEvents');
  event.initEvent(eType, true, true);
  event = videojs.fixEvent(event);
  event.preventDefault();
  this.player().trigger(event);
};

videojs.Vast.prototype.skipCurrentAd = function () {
  this.showNextAd();
};
