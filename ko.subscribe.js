/*
* bindings
*/

(function ($, ctx) {

    $.extend(ko.subscribable.fn, {
        keyUnsubscribe: function (key) {
            if (!this.keySubscriptions) { return; }
            var subscription = this.keySubscriptions[key];
            if (subscription) { subscription.dispose(); }
        },
        keySubscribe: function (key) {
            this.keyUnsubscribe(key);
            if (!this.keySubscriptions) { this.keySubscriptions = {}; }
            return this.keySubscriptions[key] = this.subscribe.apply(this, ctx.arg2arr(arguments, 1));
        }
    });

} (jQuery, jRulee));
