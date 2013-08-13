/*
* bindings
*/

(function ($) {

    /*
    * stopBinding
    */
    ko.virtualElements.allowedBindings.stopBinding = true;
    ko.bindingHandlers.stopBinding = {
        init: function (element, valueAccessor) {
            var stop = ko.utils.unwrapObservable(valueAccessor());
            return { controlsDescendantBindings: stop !== false };
        }
    };

} (jQuery));
