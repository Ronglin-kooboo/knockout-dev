/*
* app
*/

(function ($) {

    // ECMAscript 5 strict mode
    'use strict';

    // global namespace
    var ctx = window.travixmob = {
        ajaxTimeout: 10 * 60 * 1000,
        httpsEnabled: true
    };

    //#region common utils

    /*
    * log
    */
    ctx.log = function (msg) {
        window.console && window.console.log(msg);
    };

    /*
    * argument to array
    */
    ctx.arg2arr = function (arg, start) {
        return Array.prototype.slice.call(arg, start || 0);
    };

    /*
    * object has own property
    */
    ctx.hasOwn = function (o, prop) {
        if (o === null || o === undefined) {
            return false;
        } else if (o.hasOwnProperty) {
            return o.hasOwnProperty(prop);
        } else {
            return !($.type(o[prop]) === 'undefined') && o.constructor.prototype[prop] !== o[prop];
        }
    };

    /*
    * each wrapper
    */
    ctx.each = function (set, func) {
        if (!set) { return set; }
        return $.each(set, function (key) {
            if (ctx.hasOwn(set, key)) {
                return func.apply(this, ctx.arg2arr(arguments));
            }
        });
    };

    /*
    * random service
    */
    function s4() { return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1); }
    ctx.guid = function (sep) {
        if (sep === true) { sep = '-'; } else { sep = sep || ''; }
        return (s4() + s4() + sep + s4() + sep + s4() + sep + s4() + sep + s4() + s4() + s4());
    };
    ctx.unique = function (len) {
        return ctx.guid().substr(0, len);
    };

    /*
    * hash tool
    */
    ctx.hash = function (o, h) {
        if (!o) {
            return o;
        }
        var t = $.type(o);
        if (t === 'boolean' || t === 'number' || t === 'string') {
            return o;
        }
        if (arguments.length === 1) {
            return o.__hash;
        } else {
            return (o.__hash = (h === '/random/' ? ctx.guid() : h), o);
        }
    };

    /*
    * process script 
    * (with hack of document.write)
    */
    ctx.processScript = function (scriptNode, callback) {
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
            ctx.processScript(scriptNode, callback);
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
    * cookie component
    * copy from: https://github.com/carhartl/jquery-cookie
    */
    ctx.cookie = function (key, value, options) {
        // key and at least value given, set cookie...
        if (arguments.length > 1 && (!/Object/.test(Object.prototype.toString.call(value)) || value === null || value === undefined)) {
            options = $.extend({}, options);

            if (value === null || value === undefined) {
                options.expires = -1;
            }

            if (typeof options.expires === 'number') {
                var days = options.expires, t = options.expires = new Date();
                t.setDate(t.getDate() + days);
            }

            value = String(value);

            return (document.cookie = [
                encodeURIComponent(key), '=', options.raw ? value : encodeURIComponent(value),
                options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
                options.path ? '; path=' + options.path : '',
                options.domain ? '; domain=' + options.domain : '',
                options.secure ? '; secure' : ''
            ].join(''));
        }

        // key and possibly options given, get cookie...
        options = value || {};
        var decode = options.raw ? function (s) { return s; } : decodeURIComponent;

        var pairs = document.cookie.split('; ');
        for (var i = 0, pair; pair = pairs[i] && pairs[i].split('=') ; i++) {
            if (decode(pair[0]) === key) return decode(pair[1] || ''); // IE saves cookies with empty string as "c; ", e.g. without "=" as opposed to EOMB, thus pair[1] may be undefined
        }
        return null;
    };

    //#endregion

    //#region string utils

    /*
    * format text
    */
    ctx.format = function (format) {
        var args = ctx.arg2arr(arguments, 1), arg;
        return format.replace(/\{(\d+)\}/g, function (m, i) {
            return (arg = args[i], (arg === null || arg === undefined) ? '' : arg);
        });
    };

    /*
    * trim text
    */
    ctx.trim = function (str, set) {
        str = str || ''; set = set || {};
        if (set.find) {
            var exp = ctx.format('^{0}+|{0}+$', set.find);
            return str.replace(new RegExp(exp, 'g'), set.hold || '');
        } else if (set.findEnd) {
            var exp = ctx.format('{0}+$', set.findEnd);
            return str.replace(new RegExp(exp, 'g'), set.hold || '');
        } else if (set.findStart) {
            var exp = ctx.format('^{0}+', set.findStart);
            return str.replace(new RegExp(exp, 'g'), set.hold || '');
        } else {
            return str.replace(/^\s+|\s+$/g, set.hold || '');
        }
    };

    /*
    * string pad left
    */
    ctx.padLeft = function (str, len, chr, reverse) {
        if (str !== null && str !== undefined) {
            str = str + ''; var num = len - str.length;
            if (num > 0) {
                for (var i = 0; i < num; i++) {
                    if (reverse === true) {
                        str = str + chr;
                    } else {
                        str = chr + str;
                    }
                }
            }
        }
        return str;
    };

    /*
    * string pad right
    */
    ctx.padRight = function (str, len, chr) {
        return ctx.padLeft(str, len, chr, true);
    };

    //#endregion

    //#region object utils

    /*
    * count properties
    */
    ctx.propCount = function (obj) {
        var count = 0;
        if (obj) {
            for (var key in obj) {
                if (ctx.hasOwn(obj, key)) {
                    count++;
                }
            }
        }
        return count;
    };

    /*
    * map object (create object by the specified namespace with default value)
    */
    ctx.mapObj = function (obj, namespace, dft) {
        var parts = namespace.split(/\.|\[|\]/), names = [];
        ctx.each(parts, function (i, key) { if (key) { names.push(key); } });
        var lastName = names[names.length - 1], curr = obj = (obj || {}), prev;
        ctx.each(names, function (i, key) { prev = curr; curr = (curr[key] ? curr[key] : (curr[key] = isNaN(names[i + 1]) ? {} : [])); });
        if (prev) { prev[lastName] = dft; }
        return obj;
    };

    /*
    * read object (read the specified namespace value of object)
    */
    ctx.readObj = function (obj, namespace) {
        var names = namespace.split(/\.|\[|\]|\(/), ret = obj;
        ctx.each(names, function (i, key) { if (key && ret) { ret = (isNaN(key) ? (key === ')' ? ret() : ret[key]) : ret[parseInt(key, 10)]); } });
        return ret;
    };

    /*
    * diff
    */
    ctx.diff = function (obj1, obj2) {
        var ret = false;
        ctx.each(obj1, function (key, val) {
            if (obj2[key] !== val) {
                ret = true;
                return false;
            }
        });
        return ret;
    };

    //#endregion

    //#region query utils

    /*
    * get query value
    * use for instead of 'location.hash' 
    * because it's weird that firefox decode the hash value automatically
    */
    ctx.getQueryHash = function (loc) {
        var href = ($.type(loc) === 'string') ? loc : (loc || location).href;
        var matches = href.match(/^[^#]*(#.+)$/);
        return matches ? matches[1] : '';
    };

    /*
    * get query params
    */
    ctx.getQueryParams = function (url, type) {
        var params = {}, pairs = [], search = location.search, hash = ctx.getQueryHash(location);
        var splits = function (str) { return str.substr(1).replace(/\+/gi, ' ').split('&'); };
        if ($.type(url) === 'string') {
            search = ''; hash = '';
            var hashIndex = url.indexOf('#');
            if (hashIndex > -1) {
                hash = url.substr(hashIndex);
                url = url.substr(0, hashIndex);
            }
            var searchIndex = url.indexOf('?');
            if (searchIndex > -1) {
                search = url.substr(searchIndex);
            }
        }
        if (type === 'hash') {
            if (hash) { pairs = splits(hash); }
        } else if (type === 'search') {
            if (search) { pairs = splits(search); }
        } else if (type === 'auto') {
            if (hash) { pairs = splits(hash); }
            else if (search) { pairs = splits(search); }
        } else {
            if (search) { pairs = splits(search); }
            if (hash) { pairs = pairs.concat(splits(hash)); };
        }
        for (var i = 0, len = pairs.length; i < len; i++) {
            var parts = (pairs[i] || '').split('=');
            if (parts.length === 2) {
                params[parts[0]] = decodeURIComponent(parts[1]);
            }
        }
        return params;
    };

    /*
    * append query string
    */
    var allows = { 'boolean': true, 'number': true, 'string': true }; // object types: Boolean Number String Object Array Date RegExp Function
    ctx.appendQuery = function (query, name, value) { // query in empty string value '' is allowed.
        if (query === null || query === undefined || (!name && name !== 0)) { return query; }
        if ($.type(name) === 'object' || $.type(name) === 'array') {
            ctx.each(name, function (key, val) {// here 'key' fixed to simple type and will not loop again.
                query = ctx.appendQuery(query, key, val);
            });
        } else if (allows[$.type(value)]) {
            query += ((query + '').indexOf('?') > -1) ? '' : '?';
            query += (/\?$/.test(query)) ? '' : '&';
            query += name + '=' + encodeURIComponent(String(value));
        }
        return query;
    };

    /*
    * get query value
    */
    ctx.getQuery = function (query, name) {
        var result = query.match(new RegExp('[\?\&]' + name + '=([^\&]+)', 'i'));
        if (!result || result.length < 1) { return ''; }
        return decodeURIComponent(result[1]);
    };

    /*
    * set query value
    */
    ctx.setQuery = function (query, name, value) {
        if (query === null || query === undefined || (!name && name !== 0)) { return query; }
        var queryParams = ctx.getQueryParams(query), lowerParams = {}, keyMap = {}, params = {}, lower;
        params = 'object,array'.indexOf($.type(name)) > -1 ? name : (params[name] = value, params);
        ctx.each(queryParams, function (key, val) {
            lowerParams[key.toLowerCase()] = val;
            keyMap[key] = key.toLowerCase();
        });
        ctx.each(params, function (key, val) {
            lower = (key + '').toLowerCase();
            if (lower in lowerParams) {
                lowerParams[lower] = val;
            } else {
                queryParams[key] = val;
            }
        });
        ctx.each(keyMap, function (f, t) {
            queryParams[f] = lowerParams[t];
        });
        // ret
        var sIndex = query.indexOf('?');
        sIndex = (sIndex === -1) ? query.length : sIndex;
        return ctx.appendQuery(query.substr(0, sIndex), queryParams);
    };

    //#endregion

    //#region date utils

    /*
    * valid date
    */
    ctx.isDateValid = function (d) {
        if ($.type(d) !== 'date') { return false; }
        if (/.*invalid.*/i.test(d.toString())) { return false; }
        if (isNaN(d.valueOf()) || d.valueOf() === null || d.valueOf() === undefined) { return false; }
        return true;
    };

    /*
    * to API date format
    * date format: 2013-02-20T18:45:00
    */
    ctx.toApiDateFmtStr = function (d, utc) {
        if (utc !== false) {
            return ctx.format('{0}-{1}-{2}T{3}:{4}:{5}',
                d.getUTCFullYear(), ctx.padLeft(d.getUTCMonth() + 1, 2, '0'), ctx.padLeft(d.getUTCDate(), 2, '0'),
                ctx.padLeft(d.getUTCHours(), 2, '0'), ctx.padLeft(d.getUTCMinutes(), 2, '0'), ctx.padLeft(d.getUTCSeconds(), 2, '0'));
        } else {
            return ctx.format('{0}-{1}-{2}T{3}:{4}:{5}',
                d.getFullYear(), ctx.padLeft(d.getMonth() + 1, 2, '0'), ctx.padLeft(d.getDate(), 2, '0'),
                ctx.padLeft(d.getHours(), 2, '0'), ctx.padLeft(d.getMinutes(), 2, '0'), ctx.padLeft(d.getSeconds(), 2, '0'));
        }
    };
    ctx.fromApiDateFmtStr = function (str) {
        return ctx.parseDateStr(str);
    };

    /*
    * parse date str (yyyyMMdd)
    * input format: (yyyyMMdd) or (yyyy-MM-dd) or (yyyy-MM-ddThh:mm:ss) or (yyyy-MM-ddThh:mm:ssZ) or (yyyy-MM-ddThh:mm:ss:SSS) or (yyyy-MM-ddThh:mm:ss:SSSZ) or (yyyy-MM-ddThh:mm:ss+02:00)
    */
    ctx.parseDateStr = function (str, utc) {
        var d; if ($.type(str) !== 'string' || !str) { return d; }
        // timezone
        var tz = str.match(/[-+]\d\d:\d\d$/), tzOffset;
        if (tz && tz[0]) {
            d = new Date(Date.parse(str));
            if (ctx.isDateValid(d)) {
                return d;
            } else {
                var tzStr = tz[0], tzSign = tzStr.substr(0, 1), tzHours = tzStr.substr(1, 2), tzMinutes = tzStr.substr(4, 2);
                tzHours = parseInt(tzHours || '0', 10); tzMinutes = parseInt(tzMinutes || '0', 10);
                tzOffset = (tzSign === '+' ? -1 : 1) * (tzHours * 60 + tzMinutes);
                str = str.substr(0, tz.index);
            }
        }
        // split
        var len = str.length, year, month, date, hours, minutes, seconds, milliseconds;
        if (len === 8) {
            year = str.substr(0, 4); month = str.substr(4, 2); date = str.substr(6, 2);
        } else if (len === 10) {
            year = str.substr(0, 4); month = str.substr(5, 2); date = str.substr(8, 2);
        } else if (len === 19 || len === 20) {
            year = str.substr(0, 4); month = str.substr(5, 2); date = str.substr(8, 2); hours = str.substr(11, 2); minutes = str.substr(14, 2); seconds = str.substr(17, 2);
        } else if (len === 23 || len === 24) {
            year = str.substr(0, 4); month = str.substr(5, 2); date = str.substr(8, 2); hours = str.substr(11, 2); minutes = str.substr(14, 2); seconds = str.substr(17, 2); milliseconds = str.substr(20, 3);
        }
        // convert
        year = parseInt(year || '0', 10); // start from 1900
        month = parseInt(month || '1', 10) - 1; // 0~11
        date = parseInt(date || '1', 10); // 1~31
        hours = parseInt(hours || '0', 10); // 0~23
        minutes = parseInt(minutes || '0', 10); // 0~59
        seconds = parseInt(seconds || '0', 10); // 0~59
        milliseconds = parseInt(milliseconds || '0', 10); // 0~999
        // parse
        if (year) {
            if (utc !== false || tzOffset) {
                d = new Date(Date.UTC(year, month, date, hours, minutes, seconds, milliseconds));
                // valid
                if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month || d.getUTCDate() !== date ||
                    d.getUTCHours() !== hours || d.getUTCMinutes() !== minutes || d.getUTCSeconds() !== seconds || d.getUTCMilliseconds() !== milliseconds) {
                    return null;
                }
                if (tzOffset) {
                    d.setUTCMinutes(d.getUTCMinutes() + tzOffset);
                }
            } else {
                d = new Date(year, month, date, hours, minutes, seconds, milliseconds);
                // valid
                if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== date ||
                    d.getHours() !== hours || d.getMinutes() !== minutes || d.getSeconds() !== seconds || d.getMilliseconds() !== milliseconds) {
                    return null;
                }
            }
        }
        // ret
        return d;
    };

    /*
    * parse ticks
    */
    ctx.parseTicks = function (hour, min, sec, msec) {
        if (ctx.isDateValid(hour)) {
            return hour.getTime();
        } else {
            hour = hour || 0; min = min || 0; sec = sec || 0; msec = msec || 0;
            return (hour * 60 * 60 * 1000) + (min * 60 * 1000) + (sec * 1000) + msec;
        }
    };

    //#endregion

    //#region net utils

    /*
    * ajax url wrapper
    */
    ctx.wrapAjaxUrl = function (url) {
        return ctx.format("/dev~{0}/{1}{2}", window.CMS.currentSiteName, window.CMS.associatedRouteName, url);
    };

    /*
    * convert to https absolute url
    */
    ctx.httpsUrl = function (url, abs) {
        if (!url) { return url; }
        if (/^https:/i.test(url)) { return url; }
        if (/^http:/i.test(url)) { return 'https:' + url.substr(5); }
        if (/^\/\//i.test(url)) { return 'https:' + url; }
        if (abs === false) { return 'https:' + '//' + url; }
        if (url.indexOf('#') !== 0) {
            return 'https:' + '//' + location.host + '/' + ctx.trim(url, { find: '/' });
        } else {
            return 'https:' + '//' + location.host + location.pathname + ctx.trim(url, { find: '/' });
        }
    };

    /*
    * convert to http absolute url
    */
    ctx.httpUrl = function (url, abs) {
        if (!url) { return url; }
        if (/^http:/i.test(url)) { return url; }
        if (/^https:/i.test(url)) { return 'http:' + url.substr(6); }
        if (/^\/\//i.test(url)) { return 'http:' + url; }
        if (abs === false) { return 'http:' + '//' + url; }
        if (url.indexOf('#') !== 0) {
            return 'http:' + '//' + location.host + '/' + ctx.trim(url, { find: '/' });
        } else {
            return 'http:' + '//' + location.host + location.pathname + ctx.trim(url, { find: '/' });
        }
    };

    /*
    * fix url protocol according to the page protocol
    */
    ctx.fixProtocol = function (url) {
        var protocol = window.location.protocol;
        if (/^http:/i.test(protocol)) { return ctx.httpUrl(url, false); }
        if (/^https:/i.test(protocol)) { return ctx.httpsUrl(url, false); }
        return url;
    };

    //#endregion

    //#region classes

    /*
    * event dispatcher
    */
    var dispatcher = ctx.dispatcher = function (scope) {
        this.scope = scope || this;
        this.listeners = [];
    };
    dispatcher.prototype = {
        scope: null, listeners: null,
        constructor: dispatcher,
        len: function () {
            return this.listeners.length;
        },
        add: function (fn, scope) {
            var item = { fn: fn, scope: scope || this.scope };
            this.listeners.push(item);
            return item;
        },
        addToTop: function (fn, scope) {
            var item = { fn: fn, scope: scope || this.scope };
            this.listeners.unshift(item);
            return item;
        },
        remove: function (fn) {
            var cache, item, ifn;
            for (var i = this.listeners.length - 1; i > -1; i--) {
                item = this.listeners[i];
                if (!fn || !(ifn = item.fn) || ifn === fn || ctx.hash(ifn) === fn || ctx.hash(ifn) === ctx.hash(fn)) {
                    this.listeners.splice(i, 1);
                    cache = item;
                }
            }
            return cache;
        },
        dispatch: function () {
            // needs to be a real loop since the listener count might change while looping, and this is also more efficient
            var result, item, args = ctx.arg2arr(arguments);
            for (var i = 0, len = this.listeners.length; i < len; i++) {
                item = this.listeners[i];
                result = item.fn.apply(item.scope, args);
                if (result === false) { break; }
            }
            return result;
        },
        dispatchFlow: function () {
            var args = ctx.arg2arr(arguments), params = args.slice(0, args.length - 1), self = this;
            var index = -1, length = this.listeners.length, execute = function () {
                length--;
                if (length > -1) {
                    var listener = self.listeners[++index];
                    listener.fn.apply(listener.scope, params.concat([{ next: execute }]));
                } else {
                    var event = args[args.length - 1] || {};
                    if (typeof (event.done) === 'function') { event.done(); }
                }
            };
            execute();
        }
    };

    /*
    * count executer
    */
    var countExecuter = ctx.countExecuter = function (config) {
        $.extend(this, config);
        this.initialize();
    };
    countExecuter.prototype = {
        num: null, rpt: null, exec: null, counter: 0,
        constructor: countExecuter, scope: null, args: null,
        initialize: function () { this.scope = this.scope || window; },
        number: function (n) { return ($.type(n) === 'number') ? (this.num = n, this) : this.num; },
        every: function (n) { return ($.type(n) === 'number') ? (this.rpt = n, this) : this.rpt; },
        arguments: function (a, i) {
            if (arguments.length === 0) { return this.args; }
            this.args = $.type(this.args) === 'array' ? this.args : [];
            return (this.args[$.type(i) === 'number' ? i : 0] = a, this);
        },
        green: function () {
            var n = this.num || 0, c = this.counter; if (c === n) { return true; }
            if (this.rpt > 0 && c > n && (c - n) % this.rpt === 0) { return true; }
        },
        count: function (c) {
            var args = ctx.arg2arr(arguments, 1);
            this.counter += ($.type(c) === 'number') ? c : 1;
            if (!args.length && this.args) { args = this.arguments(); }
            if (this.green()) { this.args = null; this.exec.apply(this.scope, args); }
        }
    };

    /*
    * sites executer
    */
    var sitesExecuter = ctx.sitesExecuter = function (config) {
        $.extend(this, config);
        this.initialize();
    };
    sitesExecuter.prototype = {
        _sites: null, _currentSite: null, _rootSite: null, _has: null,
        argsSet: null, scope: null, func: null, constructor: sitesExecuter,
        initialize: function () {
            this.scope = this.scope || window;
            this.parseCurrent(window.CMS.currentSiteName);
            this.parseSites(this.argsSet, 'replace');
            this.compile();
        },
        parseCurrent: function (site) {
            this._currentSite = (site || '').toLowerCase();
            this._rootSite = this._currentSite.split('~')[0];
        },
        parseSites: function (args, action) {
            var parsed = {};
            ctx.each(args, function (i, arg) {
                var t = $.type(arg);
                if (t === 'string') {
                    ctx.each(arg.split(/ |,|\|/), function (j, n) { parsed[ctx.trim(n).toLowerCase()] = { allow: true }; });
                } else if (t === 'array') {
                    ctx.each(arg, function (j, n) { parsed[ctx.trim(n).toLowerCase()] = { allow: true }; });
                } else if (t === 'object') {
                    ctx.each(arg, function (k, v) { parsed[ctx.trim(k).toLowerCase()] = { allow: !!v }; });
                }
            });
            //
            var ss = this._sites = this._sites || {};
            if (action === 'replace') {
                this._sites = parsed; this.argsSet = args;
            } else if (action === 'append') {
                ctx.each(parsed, function (k, v) { ss[k] = v; });
            } else if (action === 'remove') {
                ctx.each(parsed, function (k) { delete ss[k]; });
            }
        },
        compile: function () {
            var done = false;
            if (!done) { // keywords for 'all'
                if ('all' in this._sites) {
                    this._has = !!this._sites['all'].allow; done = true;
                }
            }
            if (!done) { // keywords for 'root'
                var root = this._sites['root'], curr = this._currentSite || '';
                if (!root || root.allow !== false) {
                    if (curr.indexOf('~') === -1) {
                        this._has = true; done = true;
                    }
                }
            }
            if (!done) { // keywords as 'de,nl'
                var ret = false, rs = this._rootSite, cs = this._currentSite || '';
                ctx.each(this._sites, function (k, v) {
                    if (v.allow) {
                        // test as: 'BudgetAir-Mobile~BE~BE-NL'
                        ret = new RegExp('~' + k + '(~|$)', 'i').test(cs);
                        if (ret) { return false; }
                        // test as: 'Cheaptickets~Cheaptickets-BE~Cheaptickets-BE-EN'
                        ret = new RegExp('~' + rs + '-' + k + '(~|$)', 'i').test(cs);
                        if (ret) { return false; }
                        // TODO: other tests if need
                    }
                });
                this._has = ret;
            }
        },
        // apis
        sites: function () {
            return (arguments.length === 0) ? this._sites : (this.parseSites(ctx.arg2arr(arguments), 'replace'), this.compile(), this);
        },
        append: function () {
            return (this.parseSites(ctx.arg2arr(arguments), 'append'), this.compile(), this);
        },
        remove: function () {
            return (this.parseSites(ctx.arg2arr(arguments), 'remove'), this.compile(), this);
        },
        current: function (site) {
            return (arguments.length === 0) ? this._currentSite : (this.parseCurrent(site), this.compile(), this);
        },
        reverse: function () {
            return (ctx.each(this._sites, function () { this.allow = !this.allow; }), this.compile(), this);
        },
        yes: function (func) {
            return (arguments.length === 0) ? this._has : this.exec(func, true);
        },
        not: function (func) {
            return (arguments.length === 0) ? !this._has : this.exec(func, false);
        },
        exec: function (func, has) {
            if ($.type(has) === 'boolean' ? this._has === has : this._has) {
                if ($.type(func) === 'function') {
                    func.apply(this.scope, ctx.arg2arr(arguments, 1));
                } else if ($.type(this.func) === 'function') {
                    this.func.apply(this.scope, ctx.arg2arr(arguments, 0));
                }
            }
            return this;
        }
    };
    ctx.sites = function () {
        var args = ctx.arg2arr(arguments);
        var executer = new sitesExecuter({ argsSet: args });
        return (executer.then = executer.exec, executer);
    };

    /*
    * ajax pool
    */
    var ajaxPool = ctx.ajaxPool = function (config) {
        $.extend(this, config);
        this.initialize();
    };
    ajaxPool.prototype = {
        ajaxSet: null,
        onChange: null,
        constructor: ajaxPool,
        initialize: function () {
            this.ajaxSet = [];
            this.onChange = new dispatcher(this);
        },
        fireChange: function (t) {
            this.onChange.dispatch(t);
        },
        pool: function () {
            return this.ajaxSet;
        },
        push: function (inst) {
            var self = this;
            this.ajaxSet.push(inst);
            inst._POOLID = ctx.guid();
            if (inst.complete instanceof dispatcher) {
                inst.complete.add(function (xhr) {
                    self.remove(xhr || this);
                });
            }
            this.fireChange('push');
        },
        remove: function (inst) {
            for (var i = this.ajaxSet.length - 1; i > -1; i--) {
                if (this.ajaxSet[i]._POOLID === inst._POOLID) {
                    this.ajaxSet.splice(i, 1);
                }
            }
            this.fireChange('remove');
        },
        abort: function () {
            var set = this.ajaxSet; this.ajaxSet = [];
            for (var i = 0, len = set.length; i < len; i++) {
                if (set[i] && set[i].abort) {
                    set[i].abort();
                }
            }
            this.fireChange('abort');
        }
    };

    //#endregion

    //#region devices detection

    /*
    * check IE
    */
    ctx.isIE = function () {
        return $.browser.msie;
    };

    /*
    * check android
    */
    ctx.isAndroid = function () {
        return navigator.userAgent.indexOf('Android') > 0;
    };

    /*
    * check android version
    */
    ctx.androidVersion = function () {
        var ua = navigator.userAgent;
        return parseFloat(ua.slice(ua.indexOf('Android') + 8));
    };

    /*
    * check android below version 3.0
    */
    ctx.androidLow = function () {
        return ctx.isAndroid() && ctx.androidVersion() < 3;
    };
    ctx.isSamsunS4 = function () {
        return ctx.isAndroid() && /GT-I9[2-9]/.test(navigator.userAgent);;
    };
    /*
    * check iOS
    */
    ctx.isIOS = function () {
        return /iP(hone|od|ad)/.test(navigator.userAgent);
    };

    /*
    * check iOS version
    */
    ctx.iOSVersion = function () {
        var v = (navigator.appVersion).match(/OS (\d+)_(\d+)_?(\d+)?/);
        return [parseInt(v[1], 10), parseInt(v[2], 10), parseInt(v[3] || 0, 10)];
    };

    /*
    * check iPad
    */
    ctx.isIpad = function () {
        return navigator.userAgent.match(/iPad/i) != null;
    };

    //#endregion

    //#region bootstrap func

    var bootArray = [];
    ctx.bootstrap = function (fn) {
        if ($.type(fn) === 'function') {
            bootArray.push(fn);
        } else {
            var arr = bootArray; bootArray = [];
            for (var i = 0, len = arr.length; i < len; i++) {
                arr[i].call(this);
            }
        }
    };

    //#endregion

    //#region third party wrapper

    ctx.createLoadingUnit = function (to) {
        var html = [];
        html.push('<div class="frame-loading">');
        html.push('<div class="frame-loading-mask"></div>');
        html.push('<div class="frame-loading-content"></div>');
        html.push('</div>');
        var context = $(html.join(''));
        if (to) { context.appendTo(to); }
        return {
            context: context,
            overlay: context.find('.frame-loading-mask '),
            content: context.find('.frame-loading-content')
        };
    };

    var frameLoading = ctx.frameLoading = function () {
        var core, counting = 0, timeoutId, visible, onshow = new ctx.dispatcher(), onhide = new ctx.dispatcher();
        return {
            unit: function (u) { return (u !== undefined) ? (core = u) : (u = core); },
            show: function (c) { counting += (c || 1); if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; } this.apply(); }, onshow: onshow,
            hide: function (c) { counting -= (c || 1); if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; } this.apply(); }, onhide: onhide,
            reset: function (t) { counting = 0; if (t) { timeoutId = setTimeout(this.apply, t); } else { this.apply(); } },
            apply: function () {
                if (core) {
                    if (counting > 0) {
                        if (!visible) { visible = true; core.context.show(); onshow.dispatch(core); }
                    } else {
                        if (visible) { visible = false; core.context.hide(); onhide.dispatch(core); }
                    }
                }
            }
        };
    }();

    ctx.globalAjaxPool = new ajaxPool();
    ctx.ajax = function (options) {
        if ($.type(options.error) !== 'function')
        { try { delete options.error; } catch (ex) { } }
        options = $.extend({
            timeout: ctx.ajaxTimeout, cache: false,
            beforeSend: function (jqXHR, settings) { ctx.globalAjaxPool.push(jqXHR); frameLoading.show(); },
            complete: function (jqXHR, textStatus) { ctx.globalAjaxPool.remove(jqXHR); frameLoading.hide(); },
            error: function (jqXHR, textStatus, errorThrown) { alert('ajax error!'); }
        }, options);
        //if (/^https:/i.test(options.url)) {
        //    options.xhrFields = {
        //        withCredentials: true
        //    };
        //}
        return $.ajax(options);
    };

    ctx.getHtml = function (url, success, error) {
        return ctx.ajax({
            url: url,
            type: 'get',
            dataType: 'html', // "html": Returns HTML as plain text; included script tags are evaluated when inserted in the DOM.
            success: success, error: error
        });
    };

    ctx.getJSON = function (url, success, error, headers) {
        return ctx.ajax({
            url: url,
            type: 'get',
            dataType: 'json', // "json": Evaluates the response as JSON and returns a JavaScript object.
            headers: headers, success: success, error: error
        });
    };

    ctx.postJSON = function (url, data, success, error, headers) {
        return ctx.ajax({
            url: url,
            data: data,
            type: 'post',
            dataType: 'json', // "json": Evaluates the response as JSON and returns a JavaScript object.
            headers: headers, success: success, error: error
        });
    };

    //#endregion

    //#region cross domain wrapper

    var XDomainRequestWrapper = function () {
        var timeout = ctx.ajaxTimeout, notSupportXDR = function () {
            var version = parseInt($.browser.version, 10);
            return (version === 6 || version === 7 || !window.XDomainRequest);
        };
        return {
            createXDR: notSupportXDR() ? function () {
                var msg = ctx.i18n.get('browserNotSupportMessage');
                if (msg) { alert(msg); }
            } : function () {
                return new XDomainRequest();
            },
            create: function (success, error, headers) {
                // create
                var xdr = this.createXDR();
                // set timeout
                xdr.timeout = timeout;
                // set headers
                if (headers && headers['content-type']) {
                    // only support this header in POST requests
                    try { // catch ie8 bug
                        xdr.contentType = headers['content-type'];
                    } catch (ex) { }
                }
                // must assign! Or the request would be aborted, I don't know why.
                xdr.onprogress = function () { };
                // complete marker
                xdr._responsed = false;
                xdr._complete = function (val) {
                    var complete = !!this._responsed;
                    if (val !== undefined) { this._responsed = val; }
                    return complete;
                };
                // handle success
                if ($.type(success) === 'function') {
                    xdr.onload = function (ev) {
                        if (!this._complete(true)) {
                            success.apply(this, [this.responseText, 'success', this]);
                            ctx.globalAjaxPool.remove(this);
                            frameLoading.hide();
                        }
                    };
                }
                // handle error
                if ($.type(error) === 'function') {
                    xdr.onerror = function (ev) {
                        if (!this._complete(true)) {
                            error.apply(this, [this, 'error', null]);
                            ctx.globalAjaxPool.remove(this);
                            frameLoading.hide();
                        }
                    };
                    xdr.ontimeout = function (ev) {
                        if (!this._complete(true)) {
                            error.apply(this, [this, 'timeout', null]);
                            ctx.globalAjaxPool.remove(this);
                            frameLoading.hide();
                        }
                    };
                    // custom onboart event
                    try {
                        //
                        xdr.onabort = function (ev) {
                            if (!this._complete(true)) {
                                error.apply(this, [this, 'abort', null]);
                                ctx.globalAjaxPool.remove(this);
                                frameLoading.hide();
                            }
                        };
                        //
                        xdr.nativeAbort = xdr.abort;
                        xdr.abort = function () {
                            this.nativeAbort();
                            this.onabort({});
                        };
                    } catch (ex) { }
                }
                // ret
                return xdr;
            },
            exec: function (url, data, type, success, error, headers) {
                url = ctx.appendQuery(url, '_', $.now()); // force no cache
                var xdr = this.create(success, error, headers);
                xdr.open(type, url); xdr.send(data);
                ctx.globalAjaxPool.push(xdr);
                frameLoading.show();
                return xdr;
            },
            get: function (url, success, error, headers) {
                return this.exec(url, null, 'GET', success, error, headers);
            },
            post: function (url, data, success, error, headers) {
                return this.exec(url, data, 'POST', success, error, headers);
            }
        };
    }();

    ctx.getJSONCrossDomain = function (url, success, error, headers) {
        if (!ctx.isIE()) {
            return ctx.getJSON(url, success, error, headers);
        } else {
            return XDomainRequestWrapper.get(url, success, error, headers);
        }
    };

    ctx.postJSONCrossDomain = function (url, data, success, error, headers) {
        if ($.type(data) !== 'string') { data = $.toJSON(data); }
        if (!ctx.isIE()) {
            return ctx.postJSON(url, data, success, error, headers);
        } else {
            return XDomainRequestWrapper.post(url, data, success, error, headers);
        }
    };

    //#endregion

}(jQuery));
