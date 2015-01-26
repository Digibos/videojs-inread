/*! videojs-inread - v0.0.0 - 2015-1-22
 * Copyright (c) 2015 benjipott
 * Licensed under the MIT license. */
(function (window, videojs) {
  'use strict';

  var defaults = {
      option: true
    },
    inread;

  /**
   * Initialize the plugin.
   * @param options (optional) {object} configuration for the plugin
   */
  inread = function (options) {
    var settings = videojs.util.mergeOptions(defaults, options);

    this.ready(function () {
      this.vast = this.addChild('vast', settings);
      this.inRead = this.addChild('inRead', settings);
    });

  };

  // register the plugin
  videojs.plugin('inread', inread);
})(window, window.videojs);
