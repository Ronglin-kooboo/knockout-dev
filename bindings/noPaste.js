/*
* noPaste
*/

(function ($) {

    /*
    * noPaste
    */
    ko.bindingHandlers.noPaste = {
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            if (value === true) {
                var disposeCore, onpasteHandler, oninputHandler;
                if ('onpaste' in element) {
                    $(element).bind('paste', onpasteHandler = function () {
                        return false;
                    });
                } else if ('oninput' in element) {
                    var previousValue = $(element).val();
                    $(element).bind('input', oninputHandler = function () {
                        var val = $(this).val(), isPaste = val.length - previousValue.length > 1;
                        if (isPaste) { $(this).val(previousValue); } else { previousValue = val; }
                    });
                }
                ko.utils.domNodeDisposal.addDisposeCallback(element, disposeCore = function (elem) {
                    ko.utils.domNodeDisposal.removeDisposeCallback(elem, disposeCore);
                    if (onpasteHandler) { $(elem).unbind('paste', onpasteHandler); }
                    if (oninputHandler) { $(elem).unbind('input', oninputHandler); }
                });
            }
        }
    };

} (jQuery));