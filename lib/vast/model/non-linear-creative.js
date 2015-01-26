videojs.Vast.model.NonLinearCreative = videojs.Vast.model.Creative.extend({
    init: function (player, options, ready) {
        videojs.Vast.model.Creative.call(this, player, options, ready);
        this.height = null;
        this.mimeType = null;
        this.resource = null;
        this.resourceType = null;
        this.width = null;

        // Creative properties
        this.type = videojs.Vast.model.Creative.creativeTypes.nonLinear;
    }
});


videojs.Vast.model.NonLinearCreative.prototype.resourceTypes = {
    staticResource: 'staticResource',
    iFrame: 'iFrame',
    html: 'html'
};
