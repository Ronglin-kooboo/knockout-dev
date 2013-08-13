/*
* bindings
*/

(function ($) {

    /*
    * func
    */
    ko.virtualElements.allowedBindings.func = true;
    ko.bindingHandlers.func = {
        update: function (element, valueAccessor, allValueAccessor, viewModel) {
            var func = ko.utils.unwrapObservable(valueAccessor());
            var funcParams = allValueAccessor()['funcParams'] || [];
            if ($.type(func) === 'function') { func.apply(element, funcParams); }
        }
    };

} (jQuery));
