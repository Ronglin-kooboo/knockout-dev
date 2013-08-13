/*
* bindings
*/

(function ($) {

    /*
    * process script 
    * (with hack of document.write)
    */
    var processScript = function (scriptNode, callback) {
        // query
        var scripts = [scriptNode], nextNode = scriptNode.nextSibling;
        while (nextNode && nextNode.MARKER_NEW) {
            if (nextNode.tagName === 'SCRIPT') { scripts.push(nextNode); }
            nextNode = nextNode.nextSibling;
        }
        // filter
        var exeScripts = [];
        for (var i = 0; i < scripts.length; i++) {
            // filter marker
            if (!scripts[i].MARKER_IGNORE) {
                exeScripts.push(scripts[i]);
            }
        }
        if (!exeScripts.length) {
            callback && callback();
            return;
        }
        // marker
        var elem = exeScripts[0];
        elem.MARKER_IGNORE = true;
        // hacks
        var write = document.write, writeln = document.writeln;
        var parent = elem.parentNode, next = elem.nextSibling;
        var temp = document.createElement('div'); document.body.appendChild(temp);
        temp.style.cssText = 'width:0px;height:0px;position:absolute;top:-99999px;';
        document.writeln = function (text) { document.write(text + ' '); };
        document.write = function (text) {
            temp.innerHTML = text;
            for (var i = 0; i < temp.childNodes.length; i++) {
                temp.childNodes[0].MARKER_NEW = true;
                if (next) {
                    parent.insertBefore(temp.childNodes[0], next);
                } else {
                    parent.appendChild(temp.childNodes[0]);
                }
            }
        };
        // execute end handler
        var complete = function () {
            // restore hack
            document.write = write;
            document.writeln = writeln;
            document.body.removeChild(temp);
            // do loop. process one by one, and query all script nodes each time.
            // because that each script may create other script nodes when loaded.
            processScript(scriptNode, callback);
        };
        // execute by jQuery
        var src = $(elem).attr('src') || $(elem).attr('data-src');
        if (src) {
            $.ajax({ url: src, async: true, dataType: 'script', complete: complete });
        } else {
            $.globalEval(elem.text || elem.textContent || elem.innerHTML || ''); setTimeout(complete, 0);
        }
    };

    /*
    * apply source
    */
    ko.bindingHandlers.applySource = {
        processScript: function (scriptNode, callback) {
            return processScript(scriptNode, callback);
        },
        //
        update: function (element, valueAccessor) {
            var tag = element.tagName, src = ko.utils.unwrapObservable(valueAccessor());
            if (tag === 'IFRAME') {
                $(element).attr('src', src);
            }
            if (tag === 'SCRIPT') {
                $(element).attr('data-src', src);
                ko.bindingHandlers.applySource.processScript(element, function () { });
            }
        }
    };

} (jQuery));
