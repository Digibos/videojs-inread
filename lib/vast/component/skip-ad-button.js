//SKIP BTN
videojs.SkipAdButton = videojs.Button.extend({
  init: function (player, options) {
    videojs.Button.call(this, player, options);
    player.on('showSkip', videojs.bind(this, this.show));
    player.on('showSkip', videojs.bind(this, this.show));
    player.on('hideSkip', videojs.bind(this, this.hide));
  }
});

videojs.SkipAdButton.prototype.buildCSSClass = function () {
  return 'videojs-skip-button';
};

videojs.SkipAdButton.prototype.options_ = {
  'skipLabel': 'Fermer la publicité'
};

videojs.SkipAdButton.prototype.createEl = function () {
  var opts = this.options();
  return videojs.Button.prototype.createEl.call(this, 'div', {
    className: this.buildCSSClass(),
    innerHTML: opts.skipLabel
  });
};

videojs.SkipAdButton.prototype.onClick = function (e) {
  e = videojs.fixEvent(e);
  e.stopImmediatePropagation();

  if (this.player().vast) {
    this.player().vast.onSkip();
  }
  else {
    this.player().trigger('ended');
  }
};

