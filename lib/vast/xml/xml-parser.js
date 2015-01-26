videojs.VastParser = videojs.VastCoreObject.extend({
  init: function (player, options, ready) {
    // Trackable properties
    videojs.VastCoreObject.call(this, player, options, ready);
    this.parser = new window.DOMParser();
  }
});

// Helper function to convert duration from standard Standard player time (ISO 8601 <hh:mm:ss[.ff]) to seconds.

videojs.VastParser.convertFromStandardFormatTimeToSeconds = function (time) {
  var components = time.split(':'),
    secs = 0;

  if (!(components.length > 0 && components.length <= 3)) {
    return null;
  }

  for (var i = 0; i < components.length; i++) {
    secs += Number(components[components.length - i - 1] * (i ? Math.pow(60, i) : 1));
  }

  if (isNaN(secs)) {
    return null;
  }

  return secs;
};

videojs.VastParser.addCacheBusting = function (uri, version) {
  if (version === '2.0' && uri.indexOf('[CACHEBUSTING]') === -1 && uri.indexOf('%5BCACHEBUSTING%5D') === -1 && uri.length > 0) {
    if (uri.indexOf('?') > -1) {
      uri = uri + '&rnd=[CACHEBUSTING]';
    } else {
      uri = uri + '?rnd=[CACHEBUSTING]';
    }
  }
  return uri;
};

videojs.VastParser.validateAdVariant = function (variant) {

  if (variant) {
    variant = variant.toLowerCase();
    if (variant === 'bumper' || variant === videojs.Vast.model.Ad.variants.sponsor) {
      return videojs.Vast.model.Ad.variants.sponsor;
    }
  }

  return videojs.Vast.model.Ad.variants.normal;
};

videojs.VastParser.prototype.getAttributeValue = function (node, attributeName) {
  var attribute;

  if (node && node.attributes) {
    attribute = node.attributes.getNamedItem(attributeName);
    if (attribute) {
      return attribute.value;
    }
  }
  return null;
};

videojs.VastParser.prototype.createTrackingUris = function (trackingUris, trackingEventsNode, vastVersion) {
  var newTrackingUris,
    trackingNodes,
    trackingNode,
    trackingEvent;

  newTrackingUris = {};
  trackingNodes = trackingEventsNode.getElementsByTagName('Tracking');
  for (var i = 0; i < trackingNodes.length; i++) {
    trackingNode = trackingNodes.item(i);

    trackingEvent = this.getAttributeValue(trackingNode, 'event');
    if (trackingEvent in videojs.VastTracker.trackingEvents.ad || trackingEvent in videojs.VastTracker.trackingEvents.creative || trackingEvent in videojs.VastTracker.trackingEventNames.ad || trackingEvent in videojs.VastTracker.trackingEventNames.creative) {
      if (trackingEvent in videojs.VastTracker.trackingEventNames.ad) {
        trackingEvent = videojs.VastTracker.trackingEventNames.ad[trackingEvent];
      } else if (trackingEvent in videojs.VastTracker.trackingEventNames.creative) {
        trackingEvent = videojs.VastTracker.trackingEventNames.creative[trackingEvent];
      }

      if (!newTrackingUris[trackingEvent]) {
        newTrackingUris[trackingEvent] = [];
      }

      newTrackingUris[trackingEvent].push(videojs.VastParser.addCacheBusting(this.trim(trackingNode.textContent), vastVersion));
    }
  }

  for (trackingEvent in newTrackingUris) { // TODO: TEST CASE that event acutally exists
    if (trackingUris[trackingEvent]) {
      trackingUris[trackingEvent] = trackingUris[trackingEvent].concat(newTrackingUris[trackingEvent]);
    }
  }

  return trackingUris;
};

videojs.VastParser.prototype.createCreatives = function (creativeNodes, ad, companionZones, vastVersion) {
  var creatives = [],
    creativeId,
    creativeTypeTranslation = {
      'Linear': videojs.Vast.model.Creative.creativeTypes.linear,
      'NonLinearAds': videojs.Vast.model.Creative.creativeTypes.nonLinear,
      'CompanionAds': videojs.Vast.model.Creative.creativeTypes.companion
    },
    creativeType,
    creative,
    duration,
    trackingEventsUris,
    j,
    clickTrackingNodes,
    clickThroughUris,
    mediaFileNodes,
    mediaFile,
    resourceTypeTranslation = {
      'StaticResource': videojs.Vast.model.NonLinearCreative.prototype.resourceTypes.staticResource,
      'IFrameResource': videojs.Vast.model.NonLinearCreative.prototype.resourceTypes.iFrame,
      'HTMLResource': videojs.Vast.model.NonLinearCreative.prototype.resourceTypes.html
    },
    resourceNode,
    nonLinearNodes,
    companionNodes;

  // TODO: Clean up and maybe split this method in to many.
  for (var i = 0; i < creativeNodes.length; i++) {
    creativeId = this.getAttributeValue(creativeNodes[i], 'id');

    creativeType = creativeTypeTranslation[creativeNodes[i].firstChild.nodeName]; // TODO: will probably run in to problem with whitespace TEST CASE
    if (creativeType === videojs.Vast.model.Creative.creativeTypes.linear) {
      creative = new videojs.Vast.model.LinearCreative(ad);
      creative.id(creativeId);

      duration = creativeNodes[i].getElementsByTagName('Duration');
      if (duration.length > 0) {
        creative.duration = videojs.VastParser.convertFromStandardFormatTimeToSeconds(duration[0].textContent);
      }

      trackingEventsUris = creativeNodes[i].getElementsByTagName('TrackingEvents');
      if (trackingEventsUris.length > 0) {
        creative.trackingUris = this.createTrackingUris(creative.trackingUris, trackingEventsUris[0], vastVersion);
      }

      clickTrackingNodes = creativeNodes[i].getElementsByTagName('ClickTracking');
      for (j = 0; j < clickTrackingNodes.length; j++) {
        creative.trackingUris.clickThrough.push(videojs.VastParser.addCacheBusting(this.trim(clickTrackingNodes[j].textContent), vastVersion));
      }

      clickThroughUris = creativeNodes[i].getElementsByTagName('ClickThrough');
      if (clickThroughUris.length > 0) {
        creative.clickThroughUri = this.trim(clickThroughUris[0].textContent);
      }

      mediaFileNodes = creativeNodes[i].getElementsByTagName('MediaFile');
      for (j = 0; j < mediaFileNodes.length; j++) {
        mediaFile = new videojs.Vast.model.MediaFile(this);

        mediaFile.bitRate = this.getAttributeValue(mediaFileNodes[j], 'bitrate');
        mediaFile.deliveryMethod = this.getAttributeValue(mediaFileNodes[j], 'delivery');
        mediaFile.height = this.getAttributeValue(mediaFileNodes[j], 'height');
        mediaFile.id(this.getAttributeValue(mediaFileNodes[j], 'id'));
        mediaFile.mimeType = this.getAttributeValue(mediaFileNodes[j], 'type');
        mediaFile.uri = mediaFileNodes[j].textContent;
        mediaFile.width = this.getAttributeValue(mediaFileNodes[j], 'width');

        creative.mediaFiles.push(mediaFile);
      }

      creatives.push(creative);
    } else if (creativeType === videojs.Vast.model.Creative.creativeTypes.nonLinear) {
      nonLinearNodes = creativeNodes[i].getElementsByTagName('NonLinear');
      //creative = new videojs.Vast.model.NonLinearCreative(this, ad);
      //creative.id(creativeId);

      //creatives.push(creative);
    } else if (creativeType === videojs.Vast.model.Creative.creativeTypes.companion) {
      companionNodes = creativeNodes[i].getElementsByTagName('Companion');
      for (j = 0; j < companionNodes.length; j++) {
        creative = new videojs.Vast.model.Companion(ad);

        if (companionNodes[j].getElementsByTagName('TrackingEvents')[0]) {
          creative.trackingUris = this.createTrackingUris(creative.trackingUris, companionNodes[j].getElementsByTagName('TrackingEvents')[0]); // TODO: Add error handling
        }
        // TODO: Make sure the static companion is supported on the level they should TEST CASE

        resourceNode = companionNodes[j].firstChild; // TODO: will probably run in to problem with whitespace TEST CASE
        creative.resourceType = resourceTypeTranslation[resourceNode.nodeName];
        creative.resource = resourceNode.textContent;

        creative.height = this.getAttributeValue(companionNodes[j], 'height');
        creative.id(this.getAttributeValue(companionNodes[j], 'id'));
        creative.width = this.getAttributeValue(companionNodes[j], 'width');

        if (companionZones && companionZones[creative.id]) {
          creative.zoneId = companionZones[creative.id].zoneId;
          creative.zoneType = companionZones[creative.id].zoneMethod;
        } else {
          videojs.log('No matching companion in AdInfo.'); // TODO: Throw error TEST CASE
        }

        creatives.push(creative);
      }
    }
  }

  return creatives;
};

videojs.VastParser.prototype.skipable = function (value) {
  return value && value === 'always' || value === 'after_first_impression';
};

videojs.VastParser.prototype.createAds = function (adNodes, vastVersion) {
  var ads = [],
    ad,
    vastAdTagUri,
    j,
    extentionNodes,
    adInfoNode,
    companionExtentionNodes,
    companionZones = [],
    zoneMethodTranslation = {
      'COMPANION_BANNER_JAVASCRIPT': videojs.Vast.model.Companion.zoneTypes.html
    },
    impressionNodes,
    creativeNodes,
    hms, a, seconds;

  for (var i = 0; i < adNodes.length; i++) {
    ad = new videojs.Vast.model.Ad(this, this.options_);

    if (adNodes[i].firstChild.nodeName === 'Wrapper') {
      vastAdTagUri = adNodes[i].getElementsByTagName('VASTAdTagURI');
      if (vastAdTagUri.length > 0) {
        ad.vastAdTagUri = vastAdTagUri[0].textContent;
      }
    }

    ad.id(this.getAttributeValue(adNodes[i], 'id'));
    if (ad.id() === null) { // recognize a invetory ad
      ad.id('0');
      ad.type = videojs.Vast.model.Ad.types.inventory;
    }

    extentionNodes = adNodes[i].getElementsByTagName('Extension');
    for (j = 0; j < extentionNodes.length; j++) {
      if (this.getAttributeValue(extentionNodes[j], 'type') === 'AdServer' && this.getAttributeValue(extentionNodes[j], 'name') === 'Videoplaza') {
        adInfoNode = extentionNodes[j].getElementsByTagName('AdInfo')[0]; // TODO: Add error handling

        ad.campaignId = this.getAttributeValue(adInfoNode, 'cid');
        ad.customId = this.getAttributeValue(adInfoNode, 'customaid');
        ad.customGoalId = this.getAttributeValue(adInfoNode, 'customgid');
        ad.customCampaignId = this.getAttributeValue(adInfoNode, 'customcid');
        ad.goalId = this.getAttributeValue(adInfoNode, 'gid');
        ad.type = this.translateIncorrectAdType(this.getAttributeValue(adInfoNode, 'player'));
        ad.variant = videojs.VastParser.validateAdVariant(this.getAttributeValue(adInfoNode, 'variant'));

        companionExtentionNodes = adInfoNode.getElementsByTagName('Companion');
        for (var k = 0; k < companionExtentionNodes.length; k++) {
          companionZones[this.getAttributeValue(companionExtentionNodes[k], 'id')] = {
            zoneId: this.getAttributeValue(companionExtentionNodes[k], 'zone'),
            zoneMethod: zoneMethodTranslation[this.getAttributeValue(companionExtentionNodes[k], 'zoneType')] // TODO: Add error handling
          };
        }
        //VAST 3.0 avec skip button
        hms = this.getAttributeValue(adInfoNode, 'skipOffset') || '00:00:00';

        if (!hms || typeof hms !== 'string') {
          continue;
        }

        a = hms.split(':'); // split it at the colons

        seconds = (+a[0]) * 60 * 60 + (+a[1]) * 60 + (+a[2]);

        ad.skipAd = {
          enabled: this.skipable(this.getAttributeValue(adInfoNode, 'showSkipButton')),
          timeOut: seconds || 0
        };

      }
    }

    impressionNodes = adNodes[i].getElementsByTagName('Impression'); // TODO: Add error handling

    for (j = 0; j < impressionNodes.length; j++) {
      ad.trackingUris.impression.push(videojs.VastParser.addCacheBusting(this.trim(impressionNodes[j].textContent), vastVersion));
    }

    if (ad.trackingUris.impression.length < 1 && !videojs.getBool(videojs.AdCallModule.PREVIEW)) {
      throw new Error('noImpressionElement');
    }

    creativeNodes = adNodes[i].getElementsByTagName('Creative'); // TODO: Add error handling
    ad.creatives = this.createCreatives(creativeNodes, ad, companionZones, vastVersion);

    ads.push(ad);
  }

  return ads;
};

videojs.VastParser.prototype.translateIncorrectAdType = function (adType) {
  if (adType === 'spot_standard') {
    return 'standard_spot';
  } else {
    return adType;
  }
};

//from http://stackoverflow.com/questions/5817069/dom-navigation-eliminating-the-text-nodes
videojs.VastParser.prototype.removeTextNodes = function (node) {
  var regBlank = /^\s*$/,
    child,
    next;

  if (node.nodeType === 3) {
    if (regBlank.test(node.nodeValue)) {
      node.parentNode.removeChild(node);
    }
  } else if (node.nodeType === 1 || node.nodeType === 9) {
    child = node.firstChild;
    while (child) {
      next = child.nextSibling;
      this.removeTextNodes(child);
      child = next;
    }
  }
};

videojs.VastParser.prototype.trim = function (str) {
  return str.replace(/^\s+|\s+$/g, '');
};

videojs.VastParser.prototype.parse = function (ticket) {
  var doc,
    vastRoot,
    adNodes,
    ads = [],
    vastVersion;

  try {
    doc = this.parser.parseFromString(ticket, 'text/xml');
  } catch (e) {
    videojs.log('nonValidXML');
    return;
  }

  vastRoot = doc.documentElement;

  if (!vastRoot) {
    return;
  }

  this.removeTextNodes(vastRoot);

  if (vastRoot.nodeName !== 'VAST') {
    if (vastRoot.getElementsByTagName('parsererror') && vastRoot.getElementsByTagName('parsererror').length > 0) {
      videojs.log('nonValidXML');
    }

    videojs.log('nonValidVASTTicket');
    return;
  }

  vastVersion = this.getAttributeValue(vastRoot, 'version');

  adNodes = vastRoot.getElementsByTagName('Ad'); // TODO: Add error handling
  if (adNodes.length > 0) {
    ads = this.createAds(adNodes, vastVersion);
  }

  return ads;
};
