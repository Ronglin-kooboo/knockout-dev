/*
* bindings
*/

(function ($) {

    /*
    * idx attr / index attribute
    */
    ko.bindingHandlers.idxAttr = {
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var context = ko.contextFor(element);
            if (context && context['$index']) {
                var index = context['$index'](), val;
                var names = ko.utils.unwrapObservable(valueAccessor());
                $.each((names || '').split(','), function (i, name) {
                    name = $.trim(name);
                    if (name) {
                        val = ($(element).attr(name) || '');
                        if (val.indexOf('{0}') > -1) {
                            $(element).attr(name, $.format(val, index));
                        } else {
                            $(element).attr(name, $.format('{0}_{1}', val, index));
                        }
                    }
                });
            }
        }
    };

    
} (jQuery));
