/**
 * Separator of ads -----publicite-----
 * @param {videojs.player|Object} player
 * @param {Object=} options
 * @constructor
 */
videojs.AdsSeparator = videojs.Component.extend({
  /** @constructor */
  init: function (player, options) {
    videojs.Component.call(this, player, options);
    player.on('ended', videojs.bind(this, this.onPlayerEnded));
  }
});

videojs.AdsSeparator.prototype.options_ = {
  label: '▼ publicité ▼'
};

videojs.AdsSeparator.prototype.createEl = function () {

  var el = this.el_ = videojs.createEl('div', {
    className: 'videojs-ads-separator',
    innerHTML: this.options().label
  });


  return el;
};

videojs.AdsSeparator.prototype.onPlayerEnded = function (e) {
  this.fadeOut();
};
