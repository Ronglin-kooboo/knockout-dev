/*
* bindings
*/

(function ($) {

    /*
    * reflow
    */
    ko.bindingHandlers.reflow = {
        update: function (element, valueAccessor) {
            var val = ko.utils.unwrapObservable(valueAccessor()), clsName = 'just_reflow_used';
            if ($.type(val) === 'boolean') {
                if (val) {
                    $(element).addClass(clsName);
                } else {
                    $(element).removeClass(clsName);
                }
            } else {
                $(element).toggleClass(clsName);
            }
        }
    };

} (jQuery));
