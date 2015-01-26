videojs.AdCallModule = videojs.VastCoreObject.extend({
  init: function (player, options, ready) {
    videojs.VastCoreObject.call(this, player, options, ready);
  }
});

videojs.AdCallModule.prototype.options_ = {
  host: '',
  adCallModuleSettings: {},
  children: {
    vastXHR: {},
    vastParser: {},
    localStorage: {}
  }
};
videojs.AdCallModule.PREVIEW = 0;
videojs.AdCallModule.PREVIEW_QUERY = 'vp-preview';
videojs.AdCallModule.prototype.buildUrl = function (contentMetadata, requestSettings) {
  var formatHost = videojs.AdCallModule.updateUrlParameter(this.options().host, 'rnd', videojs.Vast.model.Trackable.generateUniqueId());
  var vppreview = this.getURLParameter(videojs.AdCallModule.PREVIEW_QUERY);
  if (this.hasData(vppreview)) {
    videojs.AdCallModule.PREVIEW = 1;
    formatHost += '&' + videojs.AdCallModule.PREVIEW_QUERY.replace('-', '') + '=' + vppreview;
  }
  return videojs.getAbsoluteURL(formatHost);
};

videojs.AdCallModule.updateUrlParameter = function (url, param, value) {
  var re = new RegExp('([?|&])' + param + '=.*?(&|$)', 'i');
  if (url.match(re)) {
    return url.replace(re, '$1' + param + '=' + value + '$2');
  } else {
    return url + '&' + param + '=' + value;
  }
};

videojs.AdCallModule.prototype.verifyHost = function () {
  var host = this.options().host;
  return host && host !== '' && host !== undefined;
};

videojs.AdCallModule.prototype.requestAds = function (contentMetadata, requestSettings, adRequestSucceeded, adRequestFailed) {
  var that = this,
    ads = [],
    activeTicketRequests = 0,
    ticketRequestTimeouts = {},
    timedOut = false,
    timeoutValue = 4000;

  function requestTicket(uri, wrapperAd) {
    function mergeTrackingUris(trackingUris, baseTrackingUris) {
      for (var trackingUri in trackingUris) { // add the tracking links
        if (trackingUris.hasOwnProperty(trackingUri)) {
          baseTrackingUris[trackingUri] = baseTrackingUris[trackingUri].concat(trackingUris[trackingUri]);
        }
      }

      return baseTrackingUris;
    }

    function mergeAdIntoWrapperAd(ad, wrapperAd) {
      wrapperAd.trackingUris = mergeTrackingUris(ad.trackingUris, wrapperAd.trackingUris);

      if (ad.vastAdTagUri) { // add the vast ad tag uri
        wrapperAd.vastAdTagUri = ad.vastAdTagUri;
      } else {
        delete wrapperAd.vastAdTagUri;
      }

      if (ad.creatives) {
        for (var creative in ad.creatives) {
          if (ad.creatives.hasOwnProperty(creative) && !(ad.creatives[creative] instanceof videojs.Vast.model.Companion)) {
            wrapperAd.creatives[creative].duration = ad.creatives[creative].duration;
            wrapperAd.creatives[creative].trackingUris = mergeTrackingUris(ad.creatives[creative].trackingUris, wrapperAd.creatives[creative].trackingUris);
            wrapperAd.creatives[creative].mediaFiles = ad.creatives[creative].mediaFiles;
            wrapperAd.creatives[creative].clickThroughUri = ad.creatives[creative].clickThroughUri;

          }
        }
      }

      return wrapperAd;
    }

    function adRequestFinished(ads) {
      activeTicketRequests -= 1;
      if (activeTicketRequests === 0) {
        adRequestSucceeded(ads);
      }
    }

    function thirdPartyRequestFailed(ad, ads) {
      var slotPosition = ads.indexOf(ad);

      ads[slotPosition] = videojs.VastTracker.createInventory(ad); // Add inventory ad for falid third-party VAST, TODO: Check if indexOf means cross-browsers problems.
      adRequestFinished(ads);
    }

    function makeAllInventory(ads) {
      for (var i = 0; i < ads.length; i++) {
        ads[i] = videojs.VastTracker.createInventory(ads[i]);
      }
    }

    activeTicketRequests += 1;

    that.vastXHR.request(uri, timeoutValue, function (response) {

      var ticket,
        ad;

      try {
        ticket = that.vastParser.parse(response);
      } catch (error) {
        if (wrapperAd) {
          thirdPartyRequestFailed(wrapperAd, ads);
        } else {
          adRequestFailed(error.message);
        }
        return;
      }

      if (wrapperAd === undefined && videojs.IS_SAFARI || videojs.IS_MSIE) {
        that.localStorage.getPersistentIdFromTicket(ticket); // We get the persistent id and set it in the local storage.
      }

      for (var i = 0; i < ticket.length; i++) {
        ad = ticket[i];

        if (wrapperAd) {
          if (ticket.length > 1) {
            thirdPartyRequestFailed(wrapperAd, ads);
          }

          ad = mergeAdIntoWrapperAd(ad, wrapperAd);
        } else {
          ads[i] = ad; // It's important that the order of the ads is keept even if the asynchronous call returns in a different order.
        }

        if (ad.vastAdTagUri !== undefined) {

          if (wrapperAd === undefined) {
            ticketRequestTimeouts[ad.id()] = (function (ad) {
              return window.setTimeout(function () {
                timedOut = true;
                thirdPartyRequestFailed(ad, ads);
              }, timeoutValue);
            })(ad); // TODO: Research default value.
          }

          if (!timedOut) {
            requestTicket(ad.vastAdTagUri, ad);
          }
        } else if (ticketRequestTimeouts[ad.id()] !== undefined) {
          window.clearTimeout(ticketRequestTimeouts[ad.id()]);
        }
      }

      adRequestFinished(ads);
    }, function (errorMessage) {
      if (wrapperAd) {
        thirdPartyRequestFailed(wrapperAd, ads);
      } else {
        adRequestFailed(errorMessage);
      }
    });
  }

  if (typeof adRequestSucceeded !== 'function' && typeof adRequestFailed !== 'function') {
    throw new Error('adRequestMissingMandatoryCallbacks');
  }

  if (!this.verifyHost()) {
    throw new Error('invalidVpHost');
  }

  try {
    this.verifyContentMetadata(contentMetadata);
    this.verifyRequestSettings(requestSettings, contentMetadata.duration);
  } catch (error) {
    adRequestFailed(error.message);
    return;
  }

  requestTicket(this.buildUrl(contentMetadata, requestSettings));
};

// Verifies the contentMetadata object and will throw exceptions if the contentForm or duration
videojs.AdCallModule.prototype.verifyContentMetadata = function (contentMetadata) {
  //for unit test code
  var vres = {
    contentForm: '',
    duration: ''
  };

  if (contentMetadata) {
    if (this.hasData(contentMetadata.contentForm)) {
      var cf = contentMetadata.contentForm.toLowerCase();
      vres.contentForm = 'true';
      if (cf !== 'shortform' && cf !== 'longform') {
        throw new Error('invalidContentForm');
      }
    } else {
      vres.contentForm = 'contentFormIsMissing';
    }
    vres.duration = videojs.AdCallModule.validateNumber(contentMetadata.duration, 'duration');
  } else {
    throw new Error('contentMetadataIsUndefined');
  }
  return vres;
};

videojs.AdCallModule.prototype.hasData = function (obj) {
  if (!!obj) {
    if (obj.constructor === Array) {
      if (obj.length === 0) {
        return false;
      }
    }
    return true;
  }
  return false;
};

videojs.AdCallModule.prototype.getURLParameter = function (paramName) {
  var paramValue = '',
    regexS = '[\\?&]' + paramName + '=([^&#]*)',
    regex = new RegExp(regexS),
    results = regex.exec(window.location.href.toString());

  if (results !== null) {
    paramValue = results[1];
  }

  return paramValue;
};

// Validates if property of type number is actually a number
videojs.AdCallModule.validateNumber = function (num, propertyName) {
  if (num) {
    if (videojs.AdCallModule.isNumber(num)) {
      if (num < 0) {
        throw new Error(propertyName + 'IsLessThanZero');
      }
      return true;
    } else {
      throw new Error(propertyName + 'IsNaN');
    }
  } else {
    return propertyName + 'IsMissing';
  }
};

videojs.AdCallModule.isNumber = function (num) {
  return !isNaN(parseFloat(num)) && isFinite(num);
};


// Verfies that valid data is sent in the requestSettings
videojs.AdCallModule.prototype.verifyRequestSettings = function (requestSettings, duration) {
  //validation result
  var vres = {
      height: '',
      width: '',
      maxBitRate: '',
      insertionPointType: '',
      playbackPosition: ''
    },
    ipt = '';

  if (requestSettings) {
    vres.height = videojs.AdCallModule.validateNumber(requestSettings.height, 'height');
    vres.width = videojs.AdCallModule.validateNumber(requestSettings.width, 'width');
    vres.maxBitRate = videojs.AdCallModule.validateNumber(requestSettings.maxBitRate, 'maxBitRate');
    //validate insertionPointType
    if (requestSettings.insertionPointType) {
      ipt = requestSettings.insertionPointType.toLowerCase();
      switch (ipt) {
        case 'onbeforecontent':
        case 'oncontentend':
        case 'playbacktime':
          vres.insertionPointType = 'true';
          break;
        case 'playbackposition':
          vres.insertionPointType = 'true';
          if (requestSettings.playbackPosition) {
            vres.playbackPosition = 'true';
            if (!videojs.AdCallModule.isNumber(requestSettings.playbackPosition)) {
              throw new Error('invalidPlaybackPosition');
            }
            if (this.hasData(duration)) {
              if (Number(requestSettings.playbackPosition) > Number(duration)) {
                throw new Error('playbackPositionIsGtDuration');
              }
            } // verifyContentMetadata will print debug message if duration is not set.
          } else {
            throw new Error('undefinedPlaybackPosition');
          }
          break;
        default:
          throw new Error('invalidInsertionPointType');
      } // end validate insertionPointType
    } else {
      throw new Error('undefinedInsertionPointType');
    }
  } else {
    throw new Error('requestSettingsIsUndefined');
  }
  return vres;
};
