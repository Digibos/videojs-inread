/**
 * @fileoverview IN-READ  Media Controller - Wrapper for HTML5 Media API
 */

/**
 * IN-READ Media Controller - Wrapper for HTML5 Media API
 * @param {videojs.Format|Object} player
 * @param {Object=} options
 * @param {Function=} ready
 * @constructor
 */
videojs.InRead = videojs.Component.extend({
  /** @constructor */
  init: function (player, options, ready) {
    player.on('firstplay', videojs.bind(this, this.onPlayerPlay));
    player.on('ended', videojs.bind(this, this.onPlayerEnded));
    player.on('windowscroll', videojs.bind(this, this.updateTopPosition));

    videojs.Component.call(this, player, options, ready);

    this.initScrollHandlers();
  }
});

videojs.InRead.prototype.onPlayerEnded = function (e) {
  this._videoEnded = true;
  setTimeout(videojs.bind(this, function () {
    this.player().dispose();
  }), 2000);

};

videojs.InRead.prototype.onReady = function () {
//on ne lance pas le ready sur videojs-media afin d'eviter la creation du player a l'init
};

videojs.InRead.prototype.options_ =
{
  slot: 'div',
  viewportFactor: 0.33,
  children: {
    adsSeparator: {}
  }
};

videojs.InRead.prototype._elVisible = false;
videojs.InRead.prototype._videoEnded = false;

/**
 * Recupere le premier element placé sous le scroll
 * @param force / force le premier element trouvé dans la page
 * @returns {*}
 */
videojs.InRead.prototype.firstBelowFold = function (force) {

  var id = this.options().slot, tags = document.querySelectorAll(id),
    firstBelowFold,
    vpH = videojs.getViewportH(), i = 0, elOffSet;

  for (i; i < tags.length; i++) {
    elOffSet = videojs.getOffset(tags[i]);
    if (elOffSet && (elOffSet.top > vpH || force === 1)) {
      firstBelowFold = tags[i];
      break;
    }
  }

  return firstBelowFold;
};

videojs.InRead.prototype.insertBeforeNextElement = function (child, el) {
  var parent = el.parentNode, beforeEl = el.nextElementSibling || el.nextSibling;
  parent.insertBefore(child, beforeEl);
};

videojs.InRead.prototype.updateTopPosition = function () {

  if (this._videoEnded) {
    return;
  }
  var slot = this.firstBelowFold();
  if (slot) {
    var elVisible = videojs.isElementInViewPort(slot, this.options().viewportFactor || 0.33);
    if (elVisible !== this._elVisible) {
      if (!this.isReady_) {
        //on replace le player dans le conteneur voulu
        var libEl = this.player().el();
        //on se refere plus a l'element au dessous mais au player en lui meme
        this.insertBeforeNextElement(libEl, slot);
        this.player().addClass('videojs-inread');
        //on retcheck la visibilité du nouveau slot
        this.options().slot = '.videojs-inread';//'#' + this.player().id();

        /*if (slot.className)
         this.player().addClass(slot.className);*/

        slot = this.firstBelowFold(1);
        this._elVisible = slot ? videojs.isElementInViewPort(slot, 0) : true;
        //On trigger le player ready
        this.triggerReady();
        this.player().trigger('preload');
        this.player().on('canplaythrough', videojs.bind(this, this.onTechPlay));
      }
      else {
        //on met le player en pause/oupas
        this.player().trigger(elVisible ? 'techPlay' : 'techPause');
        this._elVisible = elVisible;
      }

    }
  }
};
/**
 * Quand le player est capable de ouer la video , alors on lance celle ci
 */
videojs.InRead.prototype.onPlayerPlay = function () {
  this.player().off('firstplay', videojs.bind(this, this.onPlayerPlay));
  this.player().off('canplaythrough', videojs.bind(this, this.onTechPlay));
};

videojs.InRead.prototype.onTechPlay = function () {
  this.player().off('canplaythrough', videojs.bind(this, this.onTechPlay));
  this.player().trigger('techPlay');
};

videojs.InRead.isSupported = function () {
  return videojs.Html5.isSupported.call(this);
};

videojs.InRead.canPlaySource = function (srcObj) {
  return videojs.Html5.canPlaySource.call(this, srcObj);
};

videojs.getBool = function (val) {
  if (val == null)
    return false;

  if (typeof val === 'boolean') {
    if (val === true)
      return true;

    return false;
  }

  if (typeof val === 'string') {
    if (val === '')
      return false;

    val = val.replace(/^\s+|\s+$/g, '').toLowerCase();
    if (val === 'true' || val === 'yes')
      return true;

    val = val.replace(/,/g, '.').replace(/^\s*\-\s*/g, '-');
  }

  if (!isNaN(val))
    return (parseFloat(val) !== 0);

  return false;
};


/**
 * Scroll action to stop player
 * @type {number}
 */
videojs.InRead.prototype.scrollTimeout = 0;
videojs.InRead.prototype.touchMoveOn = false;


videojs.InRead.prototype.onTouchEnd = function () {
  if (this.touchMoveOn) {
    this.onTouchScroll(150);
  }
  this.touchMoveOn = false;
};

videojs.InRead.prototype.onTouchMove = function () {
  this.touchMoveOn = true;
  this.onTouchScroll(1000);
};

videojs.InRead.prototype.onTouchStart = function () {
  clearTimeout(this.scrollTimeout);
  this.touchMoveOn = true;
  this.onTouchScroll(1000);
  this.onWindowScroll();
};

videojs.InRead.prototype.initScrollHandlers = function (disable) {

  var active = disable != undefined ? 'off' : 'on';

  this.touchMoveOn = false;
  if (!videojs.TOUCH_ENABLED) {
    videojs[active](window, 'scroll', videojs.bind(this, this.updateTopPosition));
  } else {
    videojs[active](window, 'touchstart', videojs.bind(this, this.onTouchStart));
    videojs[active](window, 'touchmove', videojs.bind(this, this.onTouchMove));
    videojs[active](window, 'touchend', videojs.bind(this, this.onTouchEnd));
  }
};

videojs.InRead.prototype.onTouchScroll = function (timeReplace) {
  clearTimeout(this.scrollTimeout);
  this.scrollTimeout = setTimeout(videojs.bind(this, this.updateTopPosition), timeReplace);
};

videojs.InRead.prototype.onWindowScroll = function () {
  this.player().trigger('windowscroll');
};

videojs.TOUCH_ENABLED = !!(('ontouchstart' in window) || window.DocumentTouch && document instanceof window.DocumentTouch);


videojs.getViewportH = function () {
  var client = window.document.documentElement['clientHeight'],
    inner = window['innerHeight'];

  return (client < inner) ? inner : client;
};

videojs.isElementInViewPort = function (el, h) {
  var scrolled = window.pageYOffset,
    viewed = scrolled + videojs.getViewportH(),
    elH = el.offsetHeight,
    elTop = videojs.getOffset(el).top,
    elBottom = elTop + elH,
    h = h || 0;

  return (elTop + elH * h) <= viewed
    && (elBottom - elH * h) >= scrolled
    || (el.currentStyle ? el.currentStyle : window.getComputedStyle(el, null)).position == 'fixed';
};

videojs.getOffset = function (el) {
  var offsetTop = 0,
    offsetLeft = 0;

  do {
    if (!isNaN(el.offsetTop)) {
      offsetTop += el.offsetTop;
    }
    if (!isNaN(el.offsetLeft)) {
      offsetLeft += el.offsetLeft;
    }
  } while (el = el.offsetParent)

  return {
    top: offsetTop,
    left: offsetLeft
  }
};
