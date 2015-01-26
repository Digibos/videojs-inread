videojs.VastCoreObject = videojs.Component.extend({
  init: function (player, options, ready) {
    videojs.Component.call(this, player, options, ready);
  }
});

videojs.VastCoreObject.prototype.initChildren = function () {
  var options = this.options_;

  if (options && options.children) {
    videojs.obj.each(options.children, function (name, opts) {
      if (opts === false) {
        return;
      }
      var parentOpts = ['host', 'contentMetadata', 'trackingEvents'];
      videojs.obj.each(parentOpts, function (key, value) {
        opts[value] = options[value];
      });
    });
  }
  videojs.Component.prototype.initChildren.call(this);
};

videojs.VastCoreObject.prototype.createEl = function () {
  return videojs.createEl('div');
};

videojs.VastCoreObject.prototype.id = function (value) {
  if (value !== undefined) {
    this.id_ = value;
  }
  return this.id_;
};
