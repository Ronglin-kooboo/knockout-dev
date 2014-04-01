/*
* api
*/

(function ($, ctx) {

    // ECMAscript 5 strict mode
    'use strict';

    // namespace
    var api = ctx.api = {
        host: window.CMS.apiHost,
        useProxy: window.CMS.apiUseProxy,
        channel: undefined,
        subChannel: undefined,
        language: window.CMS.apiLangId,
        customerId: undefined,
        appendXReferer: true
    };

    //#region http helpers

    //#region utils

    var apiHost, apiReferer, apiXReferer;

    api.wrapAjaxUrl = function (ajaxUrl) {
        return ctx.format("/dev~{0}/{1}{2}", window.CMS.currentSiteName, window.CMS.associatedRouteName, ajaxUrl);
    };

    api.wrapProxyGetUrl = function (apiUrl) {
        return api.wrapAjaxUrl('/proxy/get?api=' + encodeURIComponent(apiUrl));
    };

    api.wrapProxyPostUrl = function (apiUrl) {
        return api.wrapAjaxUrl('/proxy/post?api=' + encodeURIComponent(apiUrl));
    };

    api.absolute = function (url, base) {
        if (/^(http:|https:|\/\/)/i.test(url)) {
            return url;
        } else {
            return ctx.trim(base || apiHost, { findEnd: '/' }) + '/' + ctx.trim(url, { find: '/' });
        }
    };

    api.ifProtocol = function (url, protocol) {
        if (/^(http:|https:|\/\/)/i.test(url)) {
            return url;
        } else {
            return (protocol || 'http:') + '//' + ctx.trim(url, { findStart: '/' });
        }
    };

    api.ifHttps = function (url) {
        if (/^https:/i.test(window.location.protocol)) {
            return ctx.httpsUrl(url);
        } else {
            return url;
        }
    };

    api.getReferer = function () {
        return window.location.href;
    };

    api.getXReferer = function () {
        var referer = document.referrer;
        try {
            // nested in iframe
            if (window.parent !== window) {
                referer = parent.document.referrer;
            }
        } catch (ex) { } // catch cross domain issue
        // ret
        return referer;
    };

    //#endregion

    //#region options

    api.ajaxPool = new ctx.ajaxPool();

    api.headers = {
        get: {
            'accept': 'application/hal+json'
        },
        post: {
            'accept': 'application/hal+json',
            'content-type': 'application/json'
        }
    };

    apiHost = api.ifProtocol(ctx.trim(api.host));
    if (apiHost) {
        ctx.log(ctx.format('Travix API Host: {0}', apiHost));
    }

    apiReferer = ctx.isIE() ? api.getReferer() : null;
    if (apiReferer) { // workaround for XDomainRequest
        ctx.log(ctx.format('Travix API Referer: {0}', apiReferer));
    }

    apiXReferer = api.appendXReferer ? api.getXReferer() : null;
    if (apiXReferer) {
        ctx.log(ctx.format('Travix API XReferer: {0}', apiXReferer));
    }

    //#endregion

    //#region callback

    var networkCache = function () {
        var dataSet = {};
        return {
            all: function () { return dataSet; },
            get: function (key) { return dataSet[key]; },
            set: function (key, val) { dataSet[key] = val; }
        };
    }();

    var defindedResponse = {
        abort: { TextStatus: 'abort', ModelState: {} },
        unknow: { TextStatus: 'unknow', ModelState: { HttpRequest: [ctx.i18n.get('APIRequestFailure')] } },
        timeout: { TextStatus: 'timeout', ModelState: { HttpRequest: [ctx.i18n.get('APIRequestTimeout')] } },
        notFound: { TextStatus: 'notfound', ModelState: { HttpRequest: [ctx.i18n.get('APIResourceNotFound')] } }
    };

    var parseJSON = function (json) {
        if ($.type(json) !== 'string') {
            return json;
        }
        try {
            // find this issue when use proxy to post ticketinsurance
            if (json.indexOf('"') === 0 && json.lastIndexOf('"') === json.length - 1) {
                json = ctx.trim(json, { find: '"' });
                json = json.replace(/\\"/ig, '"');
            }
            // apply core parse
            return $.parseJSON(json);
        }
        catch (ex) { }
        // ret
        return null;
    };

    var executeCallback = function (set, cache, success, xhr, response, textStatus) {
        // remove
        api.ajaxPool.remove(xhr);

        // parse response
        var data = parseJSON(response);

        // workaround for android / window safari
        var redirect = false;
        if (data && data.Location) {
            // android redirect
            if (ctx.propCount(data) === 1) { redirect = true; }
            // for new JSON version compatible
            if (data.StatusCode === 301 || data.StatusCode === 302) { redirect = true; }
        }

        // ie 4xx/5xx workaround
        if (success && data && !isNaN(data.StatusCode)) {
            if (data.StatusCode >= 400 && data.StatusCode < 600) {
                // mark failure
                success = false;
                // revert original status to xhr
                if (data.StatusCode === 404) { xhr.status = 404; }
            }
            // parse original response body
            if ('Content' in data) {
                data = parseJSON(data.Content);
            }
        }

        // convert api exceptions
        if (data && data.Message && (ctx.propCount(data) === 1 || data.ExceptionMessage || data.ExceptionType || data.StackTrace)) {
            data = { ModelState: { Message: [data.Message] } };
        }

        // check response
        if (!data && !success) {
            if (textStatus === 'abort') {
                data = defindedResponse.abort;
            } else if (textStatus === 'timeout') {
                data = defindedResponse.timeout;
            } else if (xhr.status === 404) {
                data = defindedResponse.notFound;
            } else {
                data = defindedResponse.unknow;
            }
        }

        // keep reference
        var callbacks = cache.callbacks;

        // reset status
        cache.callbacks = [];
        cache.requesting = false;

        // log
        if (!success) {
            var logStatus = (textStatus === 'abort') ? 'aborted' : 'failure';
            ctx.log(ctx.format('Travix API {0} {1}: {2}', (set.post !== true ? 'GET' : 'POST'), logStatus, cache.url));
        }

        // store response
        if (cache.cacheKey && !redirect) {
            api.response.setLatest(cache.cacheKey, data, success);
            api.response.fireSubscriptions(cache.cacheKey);
        }

        // callback
        for (var i = 0, len = callbacks.length; i < len; i++) {
            callbacks[i](success, data, redirect);
        }
    };

    var callbackClosure = function (set, cache) {
        return function (success, data, redirect) {
            if (redirect) {
                // only 'GET' allowed after redirect
                if (set.post === true) { set.post = false; }
                api.request(data.Location, set, cache);
            } else {
                if ($.type(set.callback) === 'function') {
                    // final callback
                    set.callback(data);
                }
            }
        };
    };

    var successClosure = function (set, cache) {
        return function (response, textStatus, xhr) {
            //ctx.log(ctx.format('Travix API {0} success: {1}', (set.post !== true ? 'GET' : 'POST'), cache.url));
            executeCallback(set, cache, true, xhr, response, textStatus);
        };
    };

    var errorClosure = function (set, cache) {
        return function (xhr, textStatus, textError) {
            //ctx.log(ctx.format('Travix API {0} failure: {1}', (set.post !== true ? 'GET' : 'POST'), cache.url));
            executeCallback(set, cache, false, xhr, xhr.responseText, textStatus);
        };
    };

    //#endregion

    //#region request wrapper

    api.request = function (url, set, cache) {
        url = api.absolute(url); if (set.ifHttps !== false) { url = api.ifHttps(url); }
        if (set.post !== true && set.data) { url = ctx.appendQuery(url, set.data); }
        if (!cache) {
            var key = (set.latestKey || url).toLowerCase();
            cache = networkCache.get(key);
            if (!cache) {
                networkCache.set(key, cache = { callbacks: [], url: url });
                if (set.latestKey || set.cache === true) { cache.cacheKey = key; }
            }
        }
        // clear response
        if (set.callback === null && cache.cacheKey) {
            api.response.removeLatest(cache.cacheKey);
            return;
        }
        // callback existing
        if (set.post !== true && set.cache === true && cache.latestStatus === 'success') {
            set.callback(cache.latestSuccess);
            return;
        }
        // append callback
        var callback = callbackClosure(set, cache);
        if (set.post !== true && cache.requesting === true) {
            cache.callbacks.push(callback);
            return;
        }
        // isolated cache for any post
        if (set.post === true) {
            var clonedCache = {};
            for (var k in cache) { clonedCache[k] = cache[k]; }
            cache = (clonedCache.callbacks = [], clonedCache); // the key
        }
        //
        var xhr;
        cache.requesting = true;
        cache.callbacks.push(callback);
        ctx.log(ctx.format('Travix API {0}: {1}', (set.post !== true ? 'GET' : 'POST'), url));
        //
        if (apiReferer) { url = ctx.appendQuery(url, 'referer', apiReferer); }
        if (apiXReferer) { url = ctx.appendQuery(url, 'xreferer', apiXReferer); }
        //
        if (api.useProxy === true) {
            if (set.post !== true) {
                var proxyUrl = api.wrapProxyGetUrl(url);
                xhr = ctx.getJSON(proxyUrl, successClosure(set, cache), errorClosure(set, cache), {});
            } else {
                var proxyUrl = api.wrapProxyPostUrl(url), postJson = { json: $.toJSON(set.data) };
                xhr = ctx.postJSON(proxyUrl, postJson, successClosure(set, cache), errorClosure(set, cache), {});
            }
        } else {
            if (set.post !== true) {
                xhr = ctx.getJSONCrossDomain(url, successClosure(set, cache), errorClosure(set, cache), (set.headers || api.headers.get));
            } else {
                xhr = ctx.postJSONCrossDomain(url, set.data, successClosure(set, cache), errorClosure(set, cache), (set.headers || api.headers.post));
            }
        }
        // push
        api.ajaxPool.push(xhr);
    };
    //#endregion

    //#region response manager

    api.response = function () {
        // closure
        var subscriptions = {};
        // helper
        var separateKeys = function (keys) {
            if ($.type(keys) === 'string') { return keys.toLowerCase().split(','); }
            if ($.type(keys) === 'array') { return keys; }
            return [];
        };
        // core
        return {
            getLatest: function (key, type) {
                key = (key || '').toLowerCase();
                var cache = networkCache.get(key);
                if (!cache) { return undefined; }
                if (!type || type === 'success') {
                    return cache.latestSuccess;
                } else if (type === 'failure') {
                    return cache.latestFailure;
                } else if (type === 'latest') {
                    return cache.latestStatus === 'success' ? cache.latestSuccess : cache.latestFailure;
                }
            },
            setLatest: function (keys, data, success) {
                keys = (keys || '').toLowerCase();
                var nc = networkCache.get(keys);
                nc[success ? 'latestSuccess' : 'latestFailure'] = data;
                nc.latestStatus = (success !== false) ? 'success' : 'failure';
                // multi key parts
                keys = separateKeys(keys);
                if (keys.length > 1) {
                    for (var k = 0, len = keys.length; k < len; k++) {
                        var clone = {};
                        for (var i in nc) { clone[i] = nc[i]; }
                        clone.cacheKey = keys[k];
                        networkCache.set(keys[k], clone);
                    }
                }
            },
            removeLatest: function (keys) {
                keys = separateKeys(keys);
                for (var k = 0, len = keys.length; k < len; k++) {
                    var cache = networkCache.get(keys[k]);
                    if (cache) {
                        cache.latestSuccess = null;
                        cache.latestFailure = null;
                    }
                }
            },
            fireSubscriptions: function (keys) {
                keys = separateKeys(keys);
                for (var k = 0, len = keys.length; k < len; k++) {
                    var subs = subscriptions[keys[k]];
                    if (subs && subs.length > 0) {
                        var cache = networkCache.get(keys[k]), data, success;
                        if (cache) {
                            success = cache.latestStatus === 'success';
                            data = success ? cache.latestSuccess : cache.latestFailure;
                        }
                        for (var cb, i = 0, len1 = subs.length; i < len1; i++) {
                            if ($.type(cb = subs[i].callback) === 'function') {
                                cb(data, success); // execute subscriptions
                            }
                        }
                        for (var i = subs.length - 1; i > -1; i--) {
                            if (subs[i].once) {
                                subs.splice(i, 1);
                            }
                        }
                    }
                }
            },
            removeSubscribe: function (keys, callback) {
                keys = separateKeys(keys);
                for (var k = 0, len = keys.length; k < len; k++) {
                    var subs = subscriptions[keys[k]];
                    if (subs && subs.length > 0) {
                        for (var sub, sh, i = subs.length - 1; i > -1; i--) {
                            if (!callback || !(sub = subs[i].callback) || sub === callback ||
                                ((sh = ctx.hash(sub)) && (sh === callback || sh === ctx.hash(callback)))) {
                                subs.splice(i, 1);
                            }
                        }
                    }
                }
            },
            subscribe: function (keys, callback, once) {
                keys = separateKeys(keys);
                this.removeSubscribe(keys, callback);
                for (var k = 0, len = keys.length; k < len; k++) {
                    var subs = subscriptions[keys[k]];
                    if (!subs) { subs = subscriptions[keys[k]] = []; }
                    subs.push({ callback: callback, once: once });
                }
            },
            subscribeOnce: function (keys, callback) {
                this.subscribe(keys, callback, true);
            }
        };
    }();
    //#endregion

    //#endregion

    //#region handle errors

    var queryLink = api.queryLink = function (data, key, callback) {
        var link = null;
        if (data) {
            var links = data._links || data.Links;
            if (links) { link = links[key]; }
        }
        if (callback) {
            handleApplicable(link, callback, key);
        }
        return link;
    };

    var queryHref = api.queryHref = function (data, key, callback) {
        var href = null, link = queryLink(data, key, callback);
        if (link) { href = link.href; }
        return href;
    };

    var pickParams = function (params, link) {
        if (!link || !link.templated || !link.data) {
            return params;
        }
        var allowHash = {}, accpKey, retParams = {};
        ctx.each(link.data, function () {
            allowHash[this.name.toLowerCase()] = this.name;
        });
        ctx.each(params, function (key, val) {
            if (accpKey = allowHash[key.toLowerCase()]) {
                retParams[accpKey] = val;
            }
        });
        return retParams;
    };

    var handleApplicable = function (applicable, callback, linkKey) {
        if (!applicable && callback) {
            callback({
                applicable: false, linkKey: linkKey//,
                //ModelState: { Applicable: [ctx.i18n.get('APINotApplicable')] }
            });
            return false;
        }
        return true;
    };

    var handleModelState = function (data, callback) {
        callback = $.type(callback) === 'function' ? callback : function () { };
        if (data && data.ModelState) {
            callback(data);
            return false;
        }
        if (!api.checkFlightBookable(data)) {
            callback({ ModelState: { NotBookable: [ctx.i18n.get('flightNotBookableMessage')] } });
            return false;
        }
        return true;
    };

    //#endregion

    //#region web api enums

    api.FlowTypeEnum = { Normal: 'Normal', Calendar: 'Calendar', MultiDestination: 'MultiDestination' };
    api.EventNameEnum = { NewVisitor: 'new-visitor', ReVisit: 're-visit', PageNotFound: '404-page-not-found' };

    api.DirectionEnum = { Outbound: 'Outbound', Inbound: 'Inbound' };
    api.PassengerGenderEnum = { Male: 'Male', Female: 'Female' };
    api.PassengerTypeEnum = { Adult: 'Adult', Child: 'Child', Infant: 'Infant' };

    api.CreateStateEnum = { Normal: 'Normal', NotBookable: 'NotBookable', HasAlerts: 'HasAlerts' };
    api.OrderStateEnum = {
        OrderOk: 'OrderOk', OrderNotOk: 'OrderNotOk', OrderOpenNotPaid: 'OrderOpenNotPaid',
        PaymentFailed: 'PaymentFailed', PaymentCancelled: 'PaymentCancelled', PaymentPending: 'PaymentPending'
    };

    api.FlightSortTypeEnum = { Price: 'Price', Stops: 'Stops', Airline: 'Airline' };
    api.FlightSortOrderEnum = { Ascending: 'Ascending', Descending: 'Descending', None: 'None' };
    api.NumberOfStopsTypeEnum = { All: 'All', NonStop: 'NonStop', OneStop: 'OneStop', MultiStop: 'MultiStop' };

    //#endregion

    //#region export logics

    api.currentChannel = undefined;
    api.currentSubChannel = undefined;
    api.currentLanguage = undefined;
    api.currentCustomerId = undefined;

    api.getChannel = function (cb) { var ret = api.channel || api.currentChannel; if ($.type(cb) === 'function') { if (ret) { cb(ret); } else { discoverStack.push(function () { cb(api.getChannel()); }); } } return ret; };
    api.getSubChannel = function (cb) { var ret = api.subChannel || api.currentSubChannel; if ($.type(cb) === 'function') { if (ret) { cb(ret); } else { discoverStack.push(function () { cb(api.getSubChannel()); }); } } return ret; };
    api.getLanguage = function (cb) { var ret = api.language || api.currentLanguage; if ($.type(cb) === 'function') { if (ret) { cb(ret); } else { discoverStack.push(function () { cb(api.getLanguage()); }); } } return ret; };
    api.getCustomerId = function (cb) { var ret = api.customerId || api.currentCustomerId; if ($.type(cb) === 'function') { if (ret) { cb(ret); } else { discoverStack.push(function () { cb(api.getCustomerId()); }); } } return ret; };

    api.applyChannel = function (channel) { if (api.channel !== channel && api.currentChannel !== channel) { api.channel = channel; api.removeRootCaches(); } };
    api.applySubChannel = function (subChannel) { if (api.subChannel !== subChannel && api.currentSubChannel !== subChannel) { api.subChannel = subChannel; api.removeRootCaches(); } };
    api.applyLanguage = function (language) { if (api.language !== language && api.currentLanguage !== language) { api.language = language; api.removeRootCaches(); } };
    api.applyCustomerId = function (customerId) { if (api.customerId !== customerId && api.currentCustomerId !== customerId) { api.customerId = customerId; api.removeRootCaches(); } };

    api.discoverChannel = function (data) { return api.discoverParam(data, '/ch-'); };
    api.discoverSubChannel = function (data) { return api.discoverParam(data, '/sc-'); };
    api.discoverLanguage = function (data) { return api.discoverParam(data, '/l-'); };
    api.discoverCustomerId = function (data) { return api.discoverParam(data, '/cid-'); };

    var discoverDone = false, discoverStack = [], discoverAllParams = function (data) {
        if (!discoverDone) {
            api.currentChannel = api.discoverChannel(data);
            api.currentSubChannel = api.discoverSubChannel(data);
            api.currentLanguage = api.discoverLanguage(data);
            api.currentCustomerId = api.discoverCustomerId(data);
            //
            ctx.each(discoverStack, function (i, item) { item(); });
            discoverStack = []; discoverDone = true;
        }
    };

    api.removeRootCaches = function () {
        discoverDone = false;
        var containedLinkKeys = ['flight:search-and-book', 'lookup:airport-geo'];
        ctx.each(networkCache.all(), function (k, item) {
            if (item && item.latestSuccess) {
                ctx.each(containedLinkKeys, function (i, linkKey) {
                    if (queryLink(item.latestSuccess, linkKey)) {
                        api.response.removeLatest(k);
                    }
                });
            }
        });
    };

    api.discoverParam = function (data, name) {
        var href = ($.type(data) === 'string') ? (data) : (ctx.api.queryHref(data, 'self') || '');
        var ret = '', startIdx = href.toLowerCase().indexOf(name);
        if (startIdx === -1) { return null; }
        //
        var chr, charIndex = startIdx + name.length;
        while (true) {
            chr = href.charAt(charIndex++);
            if (!chr || chr === '/' || chr === '?') {
                break;
            } else {
                ret += chr;
            }
        }
        //
        return ret;
    };

    api.anyFlightSearchLinks = function () {
        var foundLinks = [], link;
        var containedLinkKeys = ['flight:results', 'flight:results-v2', 'flight:grouped-results', 'flight:calendar-matrix-results', 'flight:multi-destination-results'];
        ctx.each(networkCache.all(), function (k, item) {
            if (item && item.latestSuccess) {
                ctx.each(containedLinkKeys, function (i, linkKey) {
                    if (link = queryLink(item.latestSuccess, linkKey)) {
                        foundLinks.push(link);
                    }
                });
            }
        });
        return foundLinks;
    };

    //#endregion

    //#region level 1 (start)

    //http://api-ph1.budgetair.nl
    //http://api-ph1.budgetair.nl/ch-{Channel}/sc-{SubChannel}/l-{Language}/cid-{CustomerId}
    //http://api-ph1.budgetair.nl/ch-travix/sc-budgetair/l-NL/cid-18cb4841-689b-4881-ba6e-95e875a8da1f
    api.startupInfo = function (callback) {
        var url = apiHost, lower = (url || '').toLowerCase();
        ctx.each([
            { key: '/ch-', val: api.channel },
            { key: '/sc-', val: api.subChannel },
            { key: '/l-', val: api.language },
            { key: '/cid-', val: api.customerId }
        ], function (i, item) {
            var key = item.key, val = ctx.trim(item.val);
            if (val && lower.indexOf(key) === -1) {
                url = ctx.trim(url, { findEnd: '/' });
                url += key + val;
            }
        });
        api.request(url, { cache: true, callback: discoverAllParams });
        api.request(url, { cache: true, callback: callback });
    };

    //#endregion

    //#region level 2 (search option)

    //http://api-ph1.budgetair.nl/flights/cid-{CustomerId}/searchoptions
    //http://api-ph1.budgetair.nl/flights/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/searchoptions
    api.searchOption = function (params, callback) {
        var params1 = ($.type(callback) === 'function') ? params : null;
        var callback1 = ($.type(callback) === 'function') ? callback : params;
        api.startupInfo(function (info) {
            if (handleModelState(info, callback1)) {
                var link = queryLink(info, 'flight:search-and-book', callback);
                if (link) { api.request(link.href, { cache: true, data: pickParams(params1, link), callback: callback1 }); }
            }
        });
    };

    //https://api-ph1.budgetair.nl/flightbooking/cid-{CustomerId}
    //https://api-ph1.budgetair.nl/flightbooking/cid-18cb4841-689b-4881-ba6e-95e875a8da1f
    api.metaDetails = function (callback) {
        api.startupInfo(function (info) {
            if (handleModelState(info, callback)) {
                callback(queryLink(info, 'flight:meta-details'));
            }
        });
    };

    //http://analytics-ph1.budgetair.nl/cid-{CustomerId}/events
    //http://analytics-ph1.budgetair.nl/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/events
    api.apiEvents = function (params, callback) {
        api.startupInfo(function (info) {
            if (handleModelState(info, callback)) {
                var link = queryLink(info, 'analytics:api-events');
                if (link) {
                    var href = link.href + '/' + pickParams(params, link)['eventname'];
                    //var href = ctx.appendQuery(link.href, pickParams(params, link));
                    api.request(href, { post: true, headers: {}, callback: callback });
                }
            }
        });
    };

    //#endregion

    //#region level 2 (user profiles)

    //http://api-ph1.budgetair.nl/profiles
    api.profiles = function (callback) {
        api.startupInfo(function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'profiles:home', callback);
                if (href) { api.request(href, { cache: true, callback: callback }); }
            }
        });
    };

    //http://api-ph1.budgetair.nl/profiles/accounttokens
    api.accountTokens = function (params, callback) {
        api.profiles(function (info) {
            if (handleModelState(info, callback)) {
                var link = queryLink(info, 'profiles:accountTokens', callback);
                if (link) {
                    var token = pickParams(params, link)['token'];
                    if (token) {
                        var href = link.href + '/' + token;
                        api.request(href, { callback: callback });
                    } else {
                        callback({ ModelState: { NoToken: ['Token is required'] } });
                    }
                }
            }
        });
    };

    //http://api-ph1.budgetair.nl/profiles/accounttokens
    // post data: { UserName : 'xxx', Password : 'xxx' }
    api.profilesLogin = api.postAccountTokens = function (data, callback) {
        api.profiles(function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'profiles:accountTokens', callback);
                if (href) { api.request(href, { post: true, data: data, callback: callback }); }
            }
        });
    };

    //http://api-ph1.budgetair.nl/profiles/contact/{token}
    api.profilesContact = function (params, callback) {
        api.profiles(function (info) {
            if (handleModelState(info, callback)) {
                var link = queryLink(info, 'profiles:contact', callback);
                if (link) {
                    var href = link.href.replace(/\{token\}/i, pickParams(params, link)['token']);
                    api.request(href, { callback: callback });
                }
            }
        });
    };

    //#endregion

    //#region level 3 (flight results)

    //http://api-ph1.budgetair.nl/lookup/airports?search=ams
    api.lookupAirports = function (params, callback) {
        api.searchOption(function (info) {
            if (handleModelState(info, callback)) {
                var link = queryLink(info, 'lookup:airport');
                if (!link) { link = queryLink(info, 'locations:airport-lookup'); }
                api.request(link.href, { data: pickParams(params, link), callback: callback });
            }
        });
    };

    //http://api-ph1.budgetair.nl/lookup/airportsv2?search=ams
    api.lookupAirportsV2 = function (params, callback) {
        api.searchOption(function (info) {
            if (handleModelState(info, callback)) {
                var link = queryLink(info, 'lookup:airport-v2', callback);
                if (link) { api.request(link.href, { data: pickParams(params, link), callback: callback }); }
            }
        });
    };

    //http://api-ph1.budgetair.nl/lookup/airports?lat=10&lng=20
    api.geoAirports = function (params, callback) {
        api.searchOption(function (info) {
            if (handleModelState(info, callback)) {
                var link = queryLink(info, 'lookup:airport-geo', callback);
                if (link) { api.request(link.href, { data: pickParams(params, link), callback: callback }); }
            }
        });
    };

    //http://api-ph1.budgetair.nl/lookup/airlines
    api.otherAirlines = function (callback) {
        api.searchOption(function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'lookup:other-airlines', callback);
                if (href) { api.request(href, { callback: callback }); }
            }
        });
    };

    //http://api-ph1.budgetair.nl/flights/cid-{CustomerId}/results?out0_dep=AMS&out0_date=20130313&out0_arr=XMN&in0_date=20130320&adt=1&chd=0&inf=0&cls=Y
    //http://api-ph1.budgetair.nl/flights/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/results?out0_dep=AMS&out0_date=20130313&out0_arr=XMN&in0_date=20130320&adt=1&chd=0&inf=0&cls=Y
    api.createFlightResults = function (params, callback) {
        api.searchOption(function (info) {
            if (handleModelState(info, callback)) {
                var link = queryLink(info, 'flight:results', callback);
                if (link) { api.request(link.href, { latestKey: 'flight_results_latest,flight_results_latest_create', data: pickParams(params, link), callback: callback }); }
            }
        });
    };

    //http://api-ph1.budgetair.nl/flights/cid-{CustomerId}/resultsv2?out0_dep=AMS&out0_date=20130313&out0_arr=XMN&in0_date=20130320&adt=1&chd=0&inf=0&cls=Y
    //http://api-ph1.budgetair.nl/flights/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/resultsv2?out0_dep=AMS&out0_date=20130313&out0_arr=XMN&in0_date=20130320&adt=1&chd=0&inf=0&cls=Y
    api.createFlightResultsV2 = function (params, callback) {
        api.searchOption(function (info) {
            if (handleModelState(info, callback)) {
                var link = queryLink(info, 'flight:results-v2', callback);
                if (link) { api.request(link.href, { latestKey: 'flight_results_latest,flight_results_latest_create', data: pickParams(params, link), callback: callback }); }
            }
        });
    };

    //http://api-ph1.budgetair.nl/flights/cid-{CustomerId}/schemav2?cachekey=a438f7ed-58e2-49c7-bd90-94d47f358293&flightid=1&inid={InId}&outid={OurId}
    //http://api-ph1.budgetair.nl/flights/cid-6989aae3-ba08-4c43-bb3b-af6f689f6d8e/schemav2?cachekey=a438f7ed-58e2-49c7-bd90-94d47f358293&flightid=1&inid=5&outid=2
    api.queryFlightSchema = function (params, link, callback) {
        api.request(link.href, { data: pickParams(params, link), callback: callback });
    };

    //http://api-ph1.budgetair.nl/flights/cid-{CustomerId}/conditions?cachekey=a438f7ed-58e2-49c7-bd90-94d47f358293&flightid=1&inid={InId}&outid={OutId}
    //http://api-ph1.budgetair.nl/flights/cid-6989aae3-ba08-4c43-bb3b-af6f689f6d8e/conditions?cachekey=a438f7ed-58e2-49c7-bd90-94d47f358293&flightid=1&inid=5&outid=2
    api.queryFlightConditions = function (params, link, callback) {
        api.request(link.href, { data: pickParams(params, link), callback: callback });
    };

    //http://api-ph1.budgetair.nl/flights/cid-{CustomerId}/results/{CacheKey}
    //http://api-ph1.budgetair.nl/flights/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/results/18cb4841-689b-4881-ba6e-95e875a8da1f
    api.hasFlightsResult = function (data) {
        data = data || api.response.getLatest('flight_results_latest');
        if (data && data._embedded && data._embedded.Options) {
            return data._embedded.Options.length > 0;
        } else {
            return false;
        }
    };
    api.indexFlightsResultUrl = function (data) {
        data = data || api.response.getLatest('flight_results_latest');
        return queryHref(data, 'self'); // flightResultsUrl
    };
    api.flightResults = function (flightResultsUrl, callback) {
        api.request(flightResultsUrl, { latestKey: 'flight_results_latest', callback: callback });
    };
    api.filterFlightResults = function (flightResultsUrl, data, callback) {
        api.request(flightResultsUrl, { latestKey: 'flight_results_latest', post: true, data: data, callback: callback });
    };

    // [subscribe]
    api.subscribeFlightResults = function (callback) {
        api.response.subscribe('flight_results_latest_create', callback);
    };

    //#endregion

    //#region level 3 (flight grouped results)

    api.createFlightGroupedResults = function (params, callback) {
        api.response.removeLatest('flight_grouped_results_latest');
        api.searchOption(function (info) {
            if (handleModelState(info, callback)) {
                var link = queryLink(info, 'flight:grouped-results', callback);
                if (link) { api.request(link.href, { latestKey: 'flight_grouped_results_latest,flight_grouped_results_latest_create', data: pickParams(params, link), callback: callback }); }
            }
        });
    };

    api.createMultiDestinationResults = function (params, callback) {
        api.response.removeLatest('flight_grouped_results_latest');
        api.searchOption({ Flow: api.FlowTypeEnum.MultiDestination }, function (info) {
            if (handleModelState(info, callback)) {
                var link = queryLink(info, 'flight:multi-destination-results', callback);
                if (link) { api.request(link.href, { latestKey: 'flight_grouped_results_latest,flight_grouped_results_latest_create', data: pickParams(params, link), callback: callback }); }
            }
        });
    };

    api.flightGroupedResultsMatrix = function (listData, callback) {
        var info = listData || api.response.getLatest('flight_grouped_results_latest');
        var href = queryHref(info, 'matrix', callback);
        if (href) { api.request(href, { callback: callback }); }
    };

    api.flightComparisonMatrix = function (listData, callback) {
        var info = listData || api.response.getLatest('flight_grouped_results_latest');
        var href = queryHref(info, 'airline-comparison-matrix', callback);
        if (href) { api.request(href, { callback: callback }); }
    };

    api.flightGroupedResults = function (resultsUrl, callback) {
        api.response.removeLatest('flight_grouped_results_latest');
        api.request(resultsUrl, { latestKey: 'flight_grouped_results_latest', callback: callback });
    };

    api.indexFlightGroupedResultsUrl = function (data) {
        data = data || api.response.getLatest('flight_grouped_results_latest');
        return queryHref(data, 'self'); // flightGroupedResultsUrl
    };

    api.filterFlightGroupedResults = function (flightGroupedResultsUrl, data, callback) {
        api.request(flightGroupedResultsUrl, { latestKey: 'flight_grouped_results_latest', post: true, data: data, callback: callback });
    };

    api.filterAndSortFlightGroupedResults = function (params, callback) {
        var info = api.response.getLatest('flight_grouped_results_latest');
        var link = queryLink(info, 'filterAndSort', callback);
        if (link) { api.request(link.href, { latestKey: 'flight_grouped_results_latest', post: true, data: pickParams(params, link), callback: callback }); }
    };

    api.topBanner = function (listData, callback) {
        var listData1 = ($.type(callback) === 'function') ? listData : null;
        var callback1 = ($.type(callback) === 'function') ? callback : listData;
        var apply = function (info) {
            var href = queryHref(info, 'top-banner', callback1);
            if (href) { api.request(href, { callback: callback1 }); }
        };
        if (listData1) {
            apply(listData1);
        } else {
            ctx.hash(apply, 'subscribe_from:(api.topBanner)');
            api.response.subscribeOnce('flight_grouped_results_latest', apply);
        }
    };

    // [subscribe]
    api.subscribeFlightGroupedResults = function (callback) {
        api.response.subscribe('flight_grouped_results_latest_create', callback);
    };

    //#endregion

    //#region level 3 (flight calendar results)

    api.createCalendarMatrixResults = function (params, callback) {
        api.searchOption({ Flow: api.FlowTypeEnum.Calendar }, function (info) {
            if (handleModelState(info, callback)) {
                var link = queryLink(info, 'flight:calendar-matrix-results', callback);
                if (link) { api.request(link.href, { latestKey: 'flight_calendar_matrix_results', data: pickParams(params, link), callback: callback }); }
            }
        });
    };

    api.allCalendarResults = function (callback) {
        var info = api.response.getLatest('flight_calendar_matrix_results');
        var href = queryHref(info, 'all-calendar-result', callback);
        if (href) { api.request(href, { callback: callback }); }
    };

    api.allCalendarGroupedResults = function (callback) {
        var info = api.response.getLatest('flight_calendar_matrix_results');
        var href = queryHref(info, 'all-calendar-grouped-result', callback);
        if (href) { api.request(href, { callback: callback }); }
    };

    api.flightCalendarResults = function (resultsUrl, callback) {
        api.response.removeLatest('flight_calendar_results_latest');
        api.request(resultsUrl, { latestKey: 'flight_calendar_results_latest', callback: callback });
    };

    // [subscribe]
    //api.subscribeFlightCalendarResults = function (callback) {
    //    api.response.subscribe('flight_calendar_results_latest', callback);
    //};

    //#endregion

    //#region level 4 (create booking) (require:bookingUrl)

    //https://api-ph1.budgetair.nl/flightbooking/cid-{CustomerId}?cachekey={CacheKey}&flightid=1&outid=1&inid=5
    //https://api-ph1.budgetair.nl/flightbooking/cid-18cb4841-689b-4881-ba6e-95e875a8da1f?cachekey=18cb4841-689b-4881-ba6e-95e875a8da1f&flightid=1&outid=1&inid=5
    api.indexFlightBookingUrl = function (item) {
        var flightItem = item;
        if ($.type(item) === 'number') {
            var info = api.response.getLatest('flight_results_latest');
            if (info) { flightItem = info._embedded.Options[item]; }
        }
        return queryHref(flightItem, 'next'); // bookingUrl
    };
    api.createFlightBooking = function (bookingUrl, callback) {
        api.request(bookingUrl, {
            latestKey: 'flight_booking_info_latest',
            callback: function (data) {
                discoverAllParams(data);
                if (handleModelState(data, callback)) {
                    callback(data);
                }
            }
        });
    };
    api.checkFlightBookable = function (data) {
        if (data && data.CreateState) {
            if (data.CreateState !== api.CreateStateEnum.Normal &&
                data.CreateState !== api.CreateStateEnum.HasAlerts) {
                return false;
            }
        }
        return true;
    };
    api.getChangeAlerts = function (data) {
        var messages = [];
        ctx.each(data.ChangeAlerts, function (idx, item) {
            ctx.each(item, function (key, mesg) {
                messages.push(mesg);
            });
        });
        return messages.length > 0 ? messages : null;
    };

    //https://api-ph1.budgetair.nl/flightbooking/cid-{CustomerId}/{BookingId}
    //https://api-ph1.budgetair.nl/flightbooking/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/3e52e172-4ad4-486f-be13-b4d3ab2ca33a
    api.indexBookingInfoUrl = function (bookingUrl, callback) {
        var apply = function (data) {
            if (handleModelState(data, callback)) {
                var href = queryHref(data, 'self');
                callback({ bookingInfoUrl: href });
            }
        };
        var info = api.response.getLatest('flight_booking_info_latest');
        if (info) {
            apply(info);
        } else {
            api.createFlightBooking(bookingUrl, apply);
        }
    };
    api.flightBookingInfo = function (bookingInfoUrl, callback) {
        var info = api.response.getLatest('flight_booking_info_latest');
        if (info) {
            callback(info);
        } else {
            api.request(bookingInfoUrl, { latestKey: 'flight_booking_info_latest', cache: true, callback: discoverAllParams });
            api.request(bookingInfoUrl, { latestKey: 'flight_booking_info_latest', cache: true, callback: callback });
        }
    };

    //#endregion

    //#region level 5 (booking flows) (require:bookingInfoUrl)

    //https://api-ph1.budgetair.nl/flights/cid-{CustomerId}/results/{CacheKey}
    //https://api-ph1.budgetair.nl/flights/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/results/18cb4841-689b-4881-ba6e-95e875a8da1f
    api.indexFlightsResultUrlOfBooking = function (bookingInfoUrl, callback) {
        api.flightBookingInfo(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'flight:results');
                callback({ flightResultsUrl: href });
            }
        });
    };

    //https://api-ph1.budgetair.nl/flightbooking/cid-{CustomerId}/flightdetails/{BookingId}
    //https://api-ph1.budgetair.nl/flightbooking/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/flightdetails/3e52e172-4ad4-486f-be13-b4d3ab2ca33a
    api.flightDetails = function (bookingInfoUrl, callback) {
        api.flightBookingInfo(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'flightbooking:details', callback);
                if (href) { api.request(href, { callback: callback }); }
            }
        });
    };

    //https://api-ph1.budgetair.nl/flightbooking/cid-{CustomerId}/flightdetailsv2/{BookingId}
    //https://api-ph1.budgetair.nl/flightbooking/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/flightdetailsv2/3e52e172-4ad4-486f-be13-b4d3ab2ca33a
    api.flightDetailsV2 = function (bookingInfoUrl, callback) {
        api.flightBookingInfo(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'flightbooking:details-v2', callback);
                if (href) { api.request(href, { callback: callback }); }
            }
        });
    };

    //https://api-ph1.budgetair.nl/flightbooking/cid-{CustomerId}/flightdetailsv3/{BookingId}
    //https://api-ph1.budgetair.nl/flightbooking/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/flightdetailsv3/3e52e172-4ad4-486f-be13-b4d3ab2ca33a
    api.flightDetailsV3 = function (bookingInfoUrl, callback) {
        api.flightBookingInfo(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'flightbooking:details-v3', callback);
                if (href) { api.request(href, { callback: callback }); }
            }
        });
    };

    //https://api-ph1.budgetair.nl/flightbooking/cid-{CustomerId}/flightdetailsv4/{BookingId}
    //https://api-ph1.budgetair.nl/flightbooking/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/flightdetailsv4/3e52e172-4ad4-486f-be13-b4d3ab2ca33a
    api.flightDetailsV4 = function (bookingInfoUrl, callback) {
        api.flightBookingInfo(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'flightbooking:details-v4', callback);
                if (href) { api.request(href, { callback: callback }); }
            }
        });
    };

    //https://api-ph1.budgetair.nl/flightbooking/cid-{CustomerId}/conditions/{BookingId}
    //https://api-ph1.budgetair.nl/flightbooking/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/conditions/3e52e172-4ad4-486f-be13-b4d3ab2ca33a
    api.flightConditions = function (bookingInfoUrl, callback) {
        api.flightBookingInfo(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'flightbooking:conditions', callback);
                if (href) { api.request(href, { callback: callback }); }
            }
        });
    };

    //https://api-ph1.budgetair.nl/flightbooking/cid-{CustomerId}/ticketinsurance/{BookingId}
    //https://api-ph1.budgetair.nl/flightbooking/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/ticketinsurance/3e52e172-4ad4-486f-be13-b4d3ab2ca33a
    api.ticketInsuranceApplicable = function (bookingInfoUrl, callback) {
        api.flightBookingInfo(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                // If the flight booking API response does NOT contain the link for Ticket Insurance, 
                // then it should NOT be offered to Customers while booking through Mobile flow.
                var href = queryHref(info, 'flightbooking:ticket-insurance');
                callback({ applicable: (!!href) });
            }
        });
    };
    api.ticketInsurance = function (bookingInfoUrl, callback) {
        api.flightBookingInfo(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'flightbooking:ticket-insurance', callback);
                if (href) { api.request(href, { callback: callback }); }
            }
        });
    };
    api.postTicketInsurance = function (bookingInfoUrl, data, callback) {
        api.flightBookingInfo(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'flightbooking:ticket-insurance', callback);
                if (href) { api.request(href, { post: true, data: data, callback: callback }); }
            }
        });
    };

    //https://api-ph1.budgetair.nl/flightbooking/cid-{CustomerId}/passengers/{BookingId}
    //https://api-ph1.budgetair.nl/flightbooking/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/passengers/3e52e172-4ad4-486f-be13-b4d3ab2ca33a
    api.passengers = function (bookingInfoUrl, callback) {
        api.flightBookingInfo(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'flightbooking:passengers', callback);
                if (href) { api.request(href, { latestKey: 'flight_booking_passengers_latest', callback: callback }); }
            }
        });
    };
    api.postPassengers = function (bookingInfoUrl, data, callback) {
        api.flightBookingInfo(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'flightbooking:passengers', callback);
                if (href) { api.request(href, { post: true, data: data, callback: callback }); }
            }
        });
    };

    //https://api-ph1.budgetair.nl/flightbooking/cid-{CustomerId}/passengersv2/{BookingId}
    //https://api-ph1.budgetair.nl/flightbooking/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/passengersv2/3e52e172-4ad4-486f-be13-b4d3ab2ca33a
    api.passengersV2 = function (bookingInfoUrl, callback) {
        api.flightBookingInfo(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'flightbooking:passengers-v2', callback);
                if (href) { api.request(href, { latestKey: 'flight_booking_passengers_latest', callback: callback }); }
            }
        });
    };
    api.postPassengersV2 = function (bookingInfoUrl, data, callback) {
        api.flightBookingInfo(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'flightbooking:passengers-v2', callback);
                if (href) { api.request(href, { post: true, data: data, callback: callback }); }
            }
        });
    };

    //https://api-ph1.budgetair.nl/flightbooking/cid-{CustomerId}/extras/{BookingId}
    //https://api-ph1.budgetair.nl/flightbooking/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/extras/3e52e172-4ad4-486f-be13-b4d3ab2ca33a
    api.extraServices = function (bookingInfoUrl, callback) {
        api.flightBookingInfo(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'flightbooking:extras', callback);
                if (href) { api.request(href, { callback: callback }); }
            }
        });
    };
    api.postExtraServices = function (bookingInfoUrl, data, callback) {
        api.flightBookingInfo(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'flightbooking:extras', callback);
                if (href) { api.request(href, { post: true, data: data, callback: callback }); }
            }
        });
    };

    //https://api-ph1.budgetair.nl/lookup/mealoptions
    api.mealOptions = function (bookingInfoUrl, callback) {
        var apply = function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'lookup:mealoptions');
                if (!href) { href = queryHref(info, 'flightbooking:mealoptions'); }
                if (href) {
                    api.request(href, { cache: true, callback: callback });
                } else {
                    handleApplicable(false, callback, 'lookup:mealoptions');
                }
            }
        };
        var info = api.response.getLatest('flight_booking_passengers_latest');
        if (info) {
            apply(info);
        } else {
            api.passengers(bookingInfoUrl, apply);
        }
    };

    //https://api-ph1.budgetair.nl/lookup/seatoptions
    api.seatOptions = function (bookingInfoUrl, callback) {
        var apply = function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'lookup:seatoptions');
                if (!href) { href = queryHref(info, 'flightbooking:seatoptions'); }
                if (href) {
                    api.request(href, { cache: true, callback: callback });
                } else {
                    handleApplicable(false, callback, 'lookup:seatoptions');
                }
            }
        };
        var info = api.response.getLatest('flight_booking_passengers_latest');
        if (info) {
            apply(info);
        } else {
            api.passengers(bookingInfoUrl, apply);
        }
    };

    //https://api-ph1.budgetair.nl/lookup/airlines
    api.frequentAirline = function (bookingInfoUrl, callback) {
        var apply = function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'lookup:airlines', callback);
                if (href) { api.request(href, { cache: true, callback: callback }); }
            }
        };
        var info = api.response.getLatest('flight_booking_passengers_latest');
        if (info) {
            apply(info);
        } else {
            api.passengers(bookingInfoUrl, apply);
        }
    };

    //https://api-ph1.budgetair.nl/checkout/cid-{CustomerId}?flightbookingid={BookingId}
    //https://api-ph1.budgetair.nl/checkout/cid-18cb4841-689b-4881-ba6e-95e875a8da1f?flightbookingid=3e52e172-4ad4-486f-be13-b4d3ab2ca33a
    api.indexCreateCheckoutUrl = function (bookingInfoUrl, callback) {
        api.flightBookingInfo(bookingInfoUrl, function (data) {
            if (handleModelState(data, callback)) {
                var href = queryHref(data, 'checkout:contact-pay-book');
                callback({ createCheckoutUrl: href });
            }
        });
    };
    api.createCheckout = function (createCheckoutUrl, callback) {
        api.request(createCheckoutUrl, { cache: true, callback: callback });
    };

    //https://api-ph1.budgetair.nl/checkout/cid-{CustomerId}/{CheckoutId}
    //https://api-ph1.budgetair.nl/checkout/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/913411c6-f5cb-4e4f-8b46-4fb331e45c8f
    api.indexCheckoutInfoUrl = function (createCheckoutUrl, callback) {
        api.createCheckout(createCheckoutUrl, function (data) {
            if (handleModelState(data, callback)) {
                var href = queryHref(data, 'self');
                callback({ checkoutInfoUrl: { href: href } });
            }
        });
    };
    api.checkoutInfo = function (checkoutInfoUrl, callback) {
        api.request(checkoutInfoUrl, { cache: true, callback: callback });
    };

    //#endregion

    //#region level 6 (checkout flows) (require:checkoutInfoUrl)

    // booking_info_url to checout_info_url
    api.BIU2CIU = function (bookingInfoUrl, callback) {
        api.indexCreateCheckoutUrl(bookingInfoUrl, function (data) {
            if (handleModelState(data, callback)) {
                api.indexCheckoutInfoUrl(data.createCheckoutUrl, function (info) {
                    if (handleModelState(info, callback)) {
                        callback(info.checkoutInfoUrl);
                    }
                });
            }
        });
    };

    // booking_info_url to checkout_info
    api.BIU2CI = function (bookingInfoUrl, callback) {
        api.indexCreateCheckoutUrl(bookingInfoUrl, function (data) {
            if (handleModelState(data, callback)) {
                api.createCheckout(data.createCheckoutUrl, function (info) {
                    if (handleModelState(info, callback)) {
                        callback(info);
                    }
                });
            }
        });
    };

    //https://api-ph1.budgetair.nl/checkout/cid-c43e8fe4-21d9-4719-97a8-1a8946441b5e/voucheroptions/623f5a68-8abc-44f0-886b-487b93b96199
    api.voucherOptions = function (bookingInfoUrl, callback) {
        api.BIU2CI(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'checkout:voucher-options', callback);
                if (href) { api.request(href, { latestKey: 'checkout_voucher_latest', callback: callback }); }
            }
        });
    };

    //https://api-ph1.budgetair.nl/checkout/cid-c43e8fe4-21d9-4719-97a8-1a8946441b5e/voucherdiscountcodes/623f5a68-8abc-44f0-886b-487b93b96199
    api.voucherDiscountCodes = function (bookingInfoUrl, data, callback) {
        var apply = function (info) {
            var href = queryHref(info, 'checkout:voucher-discountcodes', callback);
            if (href) {
                href = ctx.appendQuery(href, data); data = {}; // here the data doesn't send in request body
                api.request(href, { post: true, data: data, callback: callback });
            }
        };
        var info = api.response.getLatest('checkout_voucher_latest');
        if (info) {
            apply(info);
        } else {
            api.voucherOptions(bookingInfoUrl, apply);
        }
    };

    //https://api-ph1.budgetair.nl/checkout/cid-{CustomerId}/contact/{CheckoutId}
    //https://api-ph1.budgetair.nl/checkout/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/contact/913411c6-f5cb-4e4f-8b46-4fb331e45c8f
    api.contact = function (bookingInfoUrl, callback) {
        api.BIU2CI(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'checkout:contact', callback);
                if (href) { api.request(href, { latestKey: 'checkout_contact_latest', callback: callback }); }
            }
        });
    };
    api.postContact = function (bookingInfoUrl, data, callback) {
        api.BIU2CI(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'checkout:contact', callback);
                if (href) { api.request(href, { post: true, data: data, callback: callback }); }
            }
        });
    };

    //https://api-ph1.budgetair.nl/checkout/cid-{CustomerId}/serviceoptions/{CheckoutId}
    //https://api-ph1.budgetair.nl/checkout/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/serviceoptions/913411c6-f5cb-4e4f-8b46-4fb331e45c8f
    api.serviceOptions = function (bookingInfoUrl, callback) {
        api.BIU2CI(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'checkout:serviceoptions', callback);
                if (href) { api.request(href, { callback: callback }); }
            }
        });
    };
    api.postServiceOptions = function (bookingInfoUrl, data, callback) {
        api.BIU2CI(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'checkout:serviceoptions', callback);
                if (href) { api.request(href, { post: true, data: data, callback: callback }); }
            }
        });
    };

    //https://api-ph1.budgetair.nl/checkout/cid-{CustomerId}/travellers/{CheckoutId}
    //https://api-ph1.budgetair.nl/checkout/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/travellers/913411c6-f5cb-4e4f-8b46-4fb331e45c8f
    api.travellers = function (bookingInfoUrl, callback) {
        var apply = function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'checkout:travellers', callback);
                if (href) { api.request(href, { callback: callback }); }
            }
        };
        var info = api.response.getLatest('checkout_contact_latest');
        if (info) {
            apply(info);
        } else {
            api.contact(bookingInfoUrl, apply);
        }
    };

    //https://api-ph1.budgetair.nl/lookup/countries
    api.countries = function (bookingInfoUrl, callback) {
        var apply = function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'lookup:countries', callback);
                if (href) { api.request(href, { cache: true, callback: callback }); }
            }
        };
        var info = api.response.getLatest('checkout_contact_latest');
        if (info) {
            apply(info);
        } else {
            api.contact(bookingInfoUrl, apply);
        }
    };

    //http://api-ph1.budgetair.nl/insurance/cid-{CustomerId}/{CheckoutId}
    //http://api-ph1.budgetair.nl/insurance/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/913411c6-f5cb-4e4f-8b46-4fb331e45c8f
    api.insuranceOptionsApplicable = function (bookingInfoUrl, callback) {
        api.BIU2CI(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'insurance:options');
                callback({ applicable: (!!href) });
            }
        });
    };
    api.insuranceOptions = function (bookingInfoUrl, callback) {
        api.BIU2CI(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'insurance:options', callback);
                if (href) { api.request(href, { callback: callback }); }
            }
        });
    };
    api.postInsuranceOptions = function (bookingInfoUrl, data, callback) {
        api.BIU2CI(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'insurance:options', callback);
                if (href) { api.request(href, { post: true, data: data, callback: callback }); }
            }
        });
    };

    //https://api-ph1.budgetair.nl/checkout/cid-{CustomerId}/summary/{CheckoutId}
    //https://api-ph1.budgetair.nl/checkout/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/summary/913411c6-f5cb-4e4f-8b46-4fb331e45c8f
    api.summary = function (bookingInfoUrl, callback) {
        api.BIU2CI(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'checkout:booking-overview', callback);
                if (href) { api.request(href, { cache: true, callback: callback }); }
            }
        });
    };

    //https://api-ph1.budgetair.nl/checkout/cid-{CustomerId}/costs/{CheckoutId}
    //https://api-ph1.budgetair.nl/checkout/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/costs/913411c6-f5cb-4e4f-8b46-4fb331e45c8f
    api.costs = function (bookingInfoUrl, params, callback) {
        var params1 = ($.type(callback) === 'function') ? params : null;
        var callback1 = ($.type(callback) === 'function') ? callback : params;
        api.summary(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback1)) {
                var link = queryLink(info, 'checkout:costs', callback);
                if (link) { api.request(link.href, { data: pickParams(params1, link), callback: callback1 }); }
            }
        });
    };

    //https://api-ph1.budgetair.nl/checkout/cid-{CustomerId}/estamessage/{CheckoutId}
    //https://api-ph1.budgetair.nl/checkout/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/estamessage/913411c6-f5cb-4e4f-8b46-4fb331e45c8f
    api.estaMessage = function (bookingInfoUrl, callback) {
        api.BIU2CI(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'checkout:EstaMessage', callback);
                if (href) { api.request(href, { callback: callback }); }
            }
        });
    };

    //https://api-ph1.budgetair.nl/checkout/cid-{CustomerId}/paymentoptions/{CheckoutId}
    //https://api-ph1.budgetair.nl/checkout/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/paymentoptions/913411c6-f5cb-4e4f-8b46-4fb331e45c8f
    api.paymentOptions = function (bookingInfoUrl, callback) {
        api.BIU2CI(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'checkout:paymentoptions', callback);
                if (href) { api.request(href, { callback: callback }); }
            }
        });
    };

    //https://api-ph1.budgetair.nl/checkout/cid-{CustomerId}/payment/{CheckoutId}?optioncode={PaymentOptionCode}
    //https://api-ph1.budgetair.nl/checkout/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/payment/913411c6-f5cb-4e4f-8b46-4fb331e45c8f?optioncode=IDEAL
    api.selectPaymentOption = function (selectUrl, callback) {
        api.request(selectUrl, { post: true, data: {}, callback: callback });
    };

    //https://api-ph1.budgetair.nl/checkout/cid-{CustomerId}/companyconditions/{CheckoutId}
    //https://api-ph1.budgetair.nl/checkout/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/companyconditions/913411c6-f5cb-4e4f-8b46-4fb331e45c8f
    api.companyConditions = function (bookingInfoUrl, callback) {
        api.BIU2CI(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'checkout:companyconditions', callback);
                if (href) { api.request(href, { callback: callback }); }
            }
        });
    };
    api.postCompanyConditions = function (bookingInfoUrl, data, callback) {
        api.BIU2CI(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'checkout:companyconditions', callback);
                if (href) { api.request(href, { post: true, data: data, callback: callback }); }
            }
        });
    };

    //https://api-ph1.budgetair.nl/paymentgateway/cid-{CustomerId}/{PaymentId}/?returnUrl={ReturnUrl}
    //https://api-ph1.budgetair.nl/paymentgateway/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/f8abfca4-78c1-42a9-b23f-ea1f7c29ec6e/?returnUrl=http%3A%2F%2Flocalhost%3A2012%2Fdev~budgetair-mobile%23%2Fflight%2Fcheckout%2Freturnproxy%3Fbiu%3Dhttps%253A%252F%252Fapi-ph1.budgetair.nl%252Fflightbooking%252Fcid-18cb4841-689b-4881-ba6e-95e875a8da1f%252F3e52e172-4ad4-486f-be13-b4d3ab2ca33a%26ciu%3Dhttps%253A%252F%252Fapi-ph1.budgetair.nl%252Fcheckout%252Fcid-18cb4841-689b-4881-ba6e-95e875a8da1f%252Fconfirmation%252F913411c6-f5cb-4e4f-8b46-4fb331e45c8f
    api.paymentGateway = function (selectUrl, returnUrl, callback) {
        api.selectPaymentOption(selectUrl, function (info) {
            if (handleModelState(info, callback)) {
                var link = queryLink(info, 'do-payment', callback); //https://api-ph1.budgetair.nl/paymentgateway/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/f8abfca4-78c1-42a9-b23f-ea1f7c29ec6e/{?returnUrl}
                if (link) {
                    var href = link.href.replace('{?returnUrl}', ''), name = 'returnUrl';
                    if (link.data && link.data[0]) { name = link.data[0].name; }
                    href = ctx.appendQuery(href, name, returnUrl);
                    callback({ gateway: api.absolute(href) });
                }
            }
        });
    };

    //https://api-ph1.budgetair.nl/checkout/cid-{CustomerId}/confirmation/{CheckoutId}
    //https://api-ph1.budgetair.nl/checkout/cid-18cb4841-689b-4881-ba6e-95e875a8da1f/confirmation/913411c6-f5cb-4e4f-8b46-4fb331e45c8f
    api.confirmation_discard = function (bookingInfoUrl, callback, checkCache) {
        var cache = api.response.getLatest('confirmation_latest');
        if (checkCache === true && cache) {
            callback(cache);
            return;
        }
        api.BIU2CI(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'checkout:confirmation');
                api.request(href, { latestKey: 'confirmation_latest', callback: callback });
            }
        });
    };
    api.indexConfirmationInfoUrl = function (bookingInfoUrl, callback) {
        api.BIU2CI(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'checkout:confirmation');
                callback({ confirmationInfoUrl: href });
            }
        });
    };
    api.indexConfirmationInfoUrlV2 = function (bookingInfoUrl, callback) {
        api.BIU2CI(bookingInfoUrl, function (info) {
            if (handleModelState(info, callback)) {
                var href = queryHref(info, 'checkout:confirmation-v2'); // support multidestination
                callback({ confirmationInfoUrl: href });
            }
        });
    };
    api.confirmation = function (confirmationInfoUrl, callback, checkCache) {
        var cache = api.response.getLatest('confirmation_latest');
        if (checkCache === true && cache) {
            callback(cache);
            return;
        }
        api.request(confirmationInfoUrl, { latestKey: 'confirmation_latest', callback: discoverAllParams });
        api.request(confirmationInfoUrl, { latestKey: 'confirmation_latest', callback: callback });
    };

    //#endregion

}(jQuery, travixmob));
