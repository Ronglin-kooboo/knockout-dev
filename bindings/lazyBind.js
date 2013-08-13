/*
* bindings
*/

(function ($) {

    /*
    * lazy bind
    */
    ko.virtualElements.allowedBindings.lazyBind = true;
    ko.bindingHandlers.lazyBind = {
        init: function () {
            return { controlsDescendantBindings: true };
        },
        update: function (element, valueAccessor, allValueAccessor, viewModel) {
            var set = ko.utils.unwrapObservable(valueAccessor()),
                bindTimes = ko.utils.unwrapObservable(set.bindTimes),
                model = ko.utils.unwrapObservable(set.model),
                on = ko.utils.unwrapObservable(set.on);
            //
            var times = element.MARKER_LAZYBINDTIMES || 0;
            bindTimes = ($.type(bindTimes) === 'number') ? bindTimes : 1;
            if ((set === true || on === true) && (bindTimes === -1 || times < bindTimes)) {
                ko.applyBindingsToDescendants(model || viewModel, element);
                element.MARKER_LAZYBINDTIMES = times + 1;
            }
        }
    };

} (jQuery));
