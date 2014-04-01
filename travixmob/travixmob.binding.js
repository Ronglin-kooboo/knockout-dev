/*
* bindings
*/

(function ($, ctx) {

    // namespace
    var binding = ctx.binding = {
        dateFormat: 'dd-mm-yy',
        priceBeforeSymbol: window.CMS.priceBeforeSymbol,
        countryCode: window.CMS.currentLanguageCountryCode,
        siteCulture: window.CMS.currentSiteCulture
    };

    var currencyDecimalMark = function () {
        var countryCode = (binding.siteCulture || '').split('-').reverse()[0] || binding.countryCode || '';
        var countriesUseDecimalPoint = 'AU,AUS,BW,BWA,BN,BRN,CA,CAN,DO,DOM,GT,GTM,HN,HND,HK,HKG,IN,IND,IE,IRL,IL,ISR,JP,JPN,KE,KEN,KP,PRK,KR,KOR,LB,LBN,LU,LUX,MO,MAC,MY,MYS,MT,MLT,MX,MEX,MN,MNG,NP,NPL,NZ,NZL,NI,NIC,NG,NGA,PK,PAK,PA,PAN,PE,PER,CN,CHN,PH,PHL,SG,SGP,LK,LKA,CH,CHE,TW,TWN,TZ,TZA,TH,THA,UG,UGA,GB,GBR,US,USA,ZW,ZWE';
        return (countryCode && (',' + countriesUseDecimalPoint + ',').indexOf(',' + countryCode.toUpperCase() + ',') > -1) ? '.' : ',';
    }();

    //#region ko validator

    ctx.koValidator = {};
    ctx.koValidator.addMethod = function (key, func, defaultMsg) {
        ctx.koValidator[key] = { key: key, func: func, message: defaultMsg };
    };
    ctx.koValidator.Class = function (scope) {
        this.observable = scope;
        this.initialize();
    };
    ctx.koValidator.Class.prototype = {
        observable: null, subscribes: null,
        validRules: null, onValid: null, onChange: null,
        //
        constructor: ctx.koValidator.Class,
        initialize: function () {
            var self = this;
            this.validRules = [];
            this.onChange = new ctx.dispatcher(this);
            this.onValid = new ctx.dispatcher(this.observable);
            this.subscribes = { onchange: this.observable.subscribe(function () { self.onChange.dispatch(); }) };
        },

        //
        addMethod: function (key, func, message) {
            if (!key) { return; }
            //
            var gm = ctx.koValidator[key];
            if (gm) {
                if (!func) { func = gm.func; }
                if (!message) { message = gm.message; }
            }
            // update
            var found = false;
            ctx.each(this.validRules, function () {
                if (this.key === key) {
                    if (message) { this.message = message; }
                    if (func) { this.func = func; }
                    this.available = true
                    found = true;
                    return false;
                }
            });
            // insert
            if (!found) {
                this.validRules.push({
                    key: key,
                    func: func,
                    message: message,
                    available: true
                });
            }
        },
        removeMethod: function (key) {
            ctx.each(this.validRules, function () {
                if (this.key === key) {
                    this.available = false;
                    return false;
                }
            });
        },
        hasMethod: function (key) {
            var has = false;
            ctx.each(this.validRules, function () {
                if ((!key || this.key === key) && this.available) {
                    has = true;
                    return false;
                }
            });
            return has;
        },
        updateMethod: function (key, set) {
            var updated = false;
            ctx.each(this.validRules, function () {
                if (this.key === key) {
                    $.extend(this, set);
                    updated = true;
                    return false;
                }
            });
            return updated;
        },

        //
        checkInvalids: function (key) {
            var invalidRules = [];
            var scope = this.observable;
            ctx.each(this.validRules, function () {
                if ((!key || this.key === key) && this.available) {
                    if ($.type(this.func) === 'function') {
                        var success = this.func.call(scope, scope);
                        if (!success) { invalidRules.push(this); }
                    }
                }
            });
            return invalidRules;
        },
        isValid: function () {
            this._invalidRules = this.checkInvalids();
            var success = (this._invalidRules.length === 0);
            this.triggerOnValid(success);
            return success;
        },
        triggerOnValid: function (success) {
            success = (success === true);
            this.onValid.dispatch(success);
        },

        //
        enableValidSubscribe: function () {
            this.disableValidSubscribe();
            this.onChange.add(this.isValid);
        },
        disableValidSubscribe: function () {
            this.onChange.remove(this.isValid);
        },
        triggerOnChange: function () {
            this.onChange.dispatch();
        },

        //
        errorMessages: function (refresh) {
            var messages = [];
            if ((refresh !== false && !this.isValid()) || this._invalidRules) {
                ctx.each(this._invalidRules, function () {
                    messages.push(this.message);
                });
            }
            this.disableValidSubscribe();
            if (messages.length > 0) {
                this.enableValidSubscribe();
            }
            return messages;
        },
        errorMethods: function (refresh) {
            var methods = [];
            if ((refresh !== false && !this.isValid()) || this._invalidRules) {
                ctx.each(this._invalidRules, function () {
                    methods.push(this.key);
                });
            }
            this.disableValidSubscribe();
            if (methods.length > 0) {
                this.enableValidSubscribe();
            }
            return methods;
        },

        //
        destroy: function () {
            var subs = this.subscribes; this.subscribes = {};
            ctx.each(subs, function (k, item) { item && item.dispose(); });
        }
    };

    //#endregion

    //#region ko extensions

    if (!ko.virtualElements.setHtml) {
        ko.virtualElements.setHtml = function (node, html) {
            var childNodes = ko.utils.parseHtmlFragment(html);
            ko.virtualElements.setDomNodeChildren(node, childNodes);
        };
    }

    $.extend(ko.observable.fn, {
        validator: function (renew) {
            var obj = this.koValidator;
            if (renew) { if (obj) { obj.destroy(); this.koValidator = null; } }
            if (!this.koValidator) { obj = this.koValidator = new ctx.koValidator.Class(this); }
            return obj;
        },
        addMethod: function (key, func, message) {
            return this.validator().addMethod(key, func, message);
        },
        removeMethod: function (key) {
            if (this.koValidator) { return this.koValidator.removeMethod(key); }
        },
        hasMethod: function (key) {
            if (this.koValidator) { return this.koValidator.hasMethod(key); } else { return false; }
        },
        registerValidAction: function (func) {
            return this.validator().onValid.add(func);
        },
        removeValidAction: function (func) {
            if (this.koValidator) { this.koValidator.onValid.remove(func); }
        },
        errorMessages: function (refresh) {
            if (this.koValidator) { return this.koValidator.errorMessages(refresh); } else { return []; }
        },
        errorMethods: function (refresh) {
            if (this.koValidator) { return this.koValidator.errorMethods(refresh); } else { return []; }
        },
        fireValidActions: function (success) {
            if (this.koValidator) { return this.koValidator.triggerOnValid(success); }
        }
    });

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

    /*
    * add validation
    */
    ko.virtualElements.allowedBindings.valid = true;
    binding.valid = ko.bindingHandlers.valid = {
        objectifiedMethod: function (method) {
            if ($.type(method) === 'string') {
                method = method.split(',');
            }
            if ($.type(method) === 'array') {
                var parts = method; method = {};
                ctx.each(parts, function () { method[this] = true; });
            }
            return method;
        },
        //
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var set = ko.utils.unwrapObservable(valueAccessor());
            var ref = set.ref, method = ko.utils.unwrapObservable(set.method);
            //
            if (ref && method) {
                //
                method = ko.bindingHandlers.valid.objectifiedMethod(method);
                ctx.each(method, function (key, val) {
                    if (val === true) {
                        ref.addMethod(key);
                    }
                    if ($.type(val) === 'string') {
                        ref.addMethod(key, null, val);
                    }
                });
            }
        }
    };

    /*
    * invalid action
    */
    ko.virtualElements.allowedBindings.invalidAction = true;
    binding.invalidAction = ko.bindingHandlers.invalidAction = {
        init: function (element, valueAccessor) {
            var set = ko.utils.unwrapObservable(valueAccessor());
            var addCls = ko.utils.unwrapObservable(set.addCls), delCls = ko.utils.unwrapObservable(set.delCls);
            var ref = set.ref, action = set.action, method = ko.bindingHandlers.valid.objectifiedMethod(ko.utils.unwrapObservable(set.method));
            //
            var actionCore, disposeCore, isCommentBinding = (element.nodeType === 8), requireReset = false;
            ref.registerValidAction(actionCore = function (success) {
                // reset
                if (requireReset) {
                    requireReset = false;
                    if (!isCommentBinding) {
                        if (addCls) { $(element).removeClass(addCls); }
                        if (delCls) { $(element).addClass(delCls); }
                    }
                    if ($.type(action) === 'function') {
                        action.call(element, { success: success, reset: true });
                    }
                }
                // apply
                if (!success) {
                    var findMethod = null;
                    if (method) {
                        findMethod = false;
                        ctx.each(this.errorMethods(false), function () {
                            if (method[this] === true) {
                                findMethod = true;
                                return false;
                            }
                        });
                    }
                    // apply
                    if (findMethod !== false) {
                        requireReset = true;
                        if (!isCommentBinding) {
                            if (addCls) { $(element).addClass(addCls); }
                            if (delCls) { $(element).removeClass(delCls); }
                        }
                        if ($.type(action) === 'function') {
                            action.call(element, { success: success });
                        }
                    }
                }
            });
            ko.utils.domNodeDisposal.addDisposeCallback(element, disposeCore = function (elem) {
                ko.utils.domNodeDisposal.removeDisposeCallback(elem, disposeCore);
                ref.removeValidAction(actionCore);
            });
        }
    };

    /*
    * invalid message
    */
    ko.virtualElements.allowedBindings.invalidMessage = true;
    binding.invalidMessage = ko.bindingHandlers.invalidMessage = {
        init: function (element, valueAccessor) {
            var set = ko.utils.unwrapObservable(valueAccessor());
            var addCls = ko.utils.unwrapObservable(set.addCls), delCls = ko.utils.unwrapObservable(set.delCls);
            var ref = set.ref, action = set.action, method = ko.bindingHandlers.valid.objectifiedMethod(ko.utils.unwrapObservable(set.method));
            //
            var actionCore, disposeCore, isCommentBinding = (element.nodeType === 8), requireReset = false;
            ref.registerValidAction(actionCore = function (success) {
                // reset
                if (requireReset) {
                    requireReset = false;
                    ko.virtualElements.setHtml(element, '');
                    if (!isCommentBinding) {
                        if (addCls) { $(element).removeClass(addCls); }
                        if (delCls) { $(element).addClass(delCls); }
                    }
                    if ($.type(action) === 'function') {
                        action.call(element, { success: success, reset: true });
                    }
                }
                // apply
                if (!success) {
                    var messageText, errorMessages = this.errorMessages(false);
                    if (method) {
                        messageText = [];
                        ctx.each(this.errorMethods(false), function (idx) {
                            if (method[this] === true) {
                                messageText.push(errorMessages[idx]);
                            }
                        });
                    } else {
                        messageText = errorMessages.concat();
                    }
                    // apply
                    if (messageText.length > 0) {
                        requireReset = true;
                        ko.virtualElements.setHtml(element, messageText.join(', '));
                        if (!isCommentBinding) {
                            if (addCls) { $(element).addClass(addCls); }
                            if (delCls) { $(element).removeClass(delCls); }
                        }
                        if ($.type(action) === 'function') {
                            action.call(element, { success: success });
                        }
                    }
                }
            });
            ko.utils.domNodeDisposal.addDisposeCallback(element, disposeCore = function (elem) {
                ko.utils.domNodeDisposal.removeDisposeCallback(elem, disposeCore);
                ref.removeValidAction(actionCore);
            });
        }
    };

    //#endregion

    //#region common bindings

    /*
    * stop binding
    */
    ko.virtualElements.allowedBindings.stopBinding = true;
    ko.bindingHandlers.stopBinding = {
        init: function (element, valueAccessor) {
            var stop = ko.utils.unwrapObservable(valueAccessor());
            return { controlsDescendantBindings: stop !== false };
        }
    };

    /*
    * lazy binding
    */
    ko.virtualElements.allowedBindings.lazyBinding = true;
    ko.bindingHandlers.lazyBinding = {
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

    /*
    * format text
    */
    ko.virtualElements.allowedBindings.format = true;
    ko.bindingHandlers.format = {
        update: function (element, valueAccessor, allValueAccessor, viewModel) {
            var parts = ko.utils.unwrapObservable(valueAccessor());
            if (parts.length > 1) {
                var args = [], parsedValue, temp;
                ctx.each(parts, function (i, item) {
                    parsedValue = null;
                    if (item && (item.binding || item.koBinding)) {
                        var binding = ko.bindingHandlers[item.binding || item.koBinding];
                        if (binding && binding.update) {
                            if (!temp) {
                                temp = document.createElement('div'); document.body.appendChild(temp);
                                temp.style.cssText = 'width:0px;height:0px;position:absolute;top:-99999px;';
                            }
                            binding.update(temp, function () { return item.koValue || item; });
                            parsedValue = temp.innerHTML;
                        }
                    }
                    if (parsedValue !== null) {
                        args.push(parsedValue);
                    } else {
                        var extract = ko.utils.unwrapObservable(item);
                        args.push((extract === null || extract === undefined) ? '' : extract);
                    }
                });
                if (temp) {
                    document.body.removeChild(temp);
                }
                if ($.type(args[0]) === 'string') {
                    var content = ctx.format.apply(this, args);
                    ko.virtualElements.setHtml(element, content);
                }
            }
        }
    };

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

    /*
    * bindOnload
    */
    ko.bindingHandlers.bindOnload = {
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var disposeCore, loadHandler;
            $(element).load(loadHandler = valueAccessor());
            ko.utils.domNodeDisposal.addDisposeCallback(element, disposeCore = function (elem) {
                ko.utils.domNodeDisposal.removeDisposeCallback(elem, disposeCore);
                $(elem).unbind('load', loadHandler);
            });
        }
    };

    /*
    * keydownValue
    */
    ko.bindingHandlers.keydownValue = {
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var obs = valueAccessor(), id, apply = function () {
                window.clearTimeout(id);
                id = setTimeout(function () {
                    obs($(element).val());
                }, 640);
            };
            $(element).keydown(apply).change(apply);
            //
            var disposeCore;
            ko.utils.domNodeDisposal.addDisposeCallback(element, disposeCore = function (elem) {
                ko.utils.domNodeDisposal.removeDisposeCallback(elem, disposeCore);
                $(elem).unbind('keydown', apply).unbind('change', apply);
            });
        },
        update: function (element, valueAccessor) {
            var obs = valueAccessor();
            $(element).val(obs());
        }
    };

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

    /*
    * hoverIn
    */
    ko.bindingHandlers.hoverIn = {
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var set = ko.utils.unwrapObservable(valueAccessor());
            if (set) {
                var addCls = ko.utils.unwrapObservable(set.addCls), delCls = ko.utils.unwrapObservable(set.delCls);
                if (addCls || delCls) {
                    var disposeCore, hoverIn, hoverOut;
                    $(element).hover(hoverIn = function () {
                        if (addCls) { $(this).addClass(addCls); }
                        if (delCls) { $(this).removeClass(delCls); }
                    }, hoverOut = function () {
                        if (addCls) { $(this).removeClass(addCls); }
                        if (delCls) { $(this).addClass(delCls); }
                    });
                    ko.utils.domNodeDisposal.addDisposeCallback(element, disposeCore = function (elem) {
                        ko.utils.domNodeDisposal.removeDisposeCallback(elem, disposeCore);
                        if (hoverIn) { $(elem).unbind('mouseenter mouseover', hoverIn); }
                        if (hoverOut) { $(elem).unbind('mouseleave mouseout', hoverOut); }
                    });
                }
            }
        }
    };

    /*
    * slideDown
    */
    ko.bindingHandlers.slideDown = {
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            if (value) {
                $(element).show();
            } else {
                $(element).hide();
            }
        },
        update: function (element, valueAccessor, allValueAccessor, viewModel) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            if (value) {
                $(element).slideDown();
            } else {
                $(element).slideUp();
            }
        }
    };

    /*
    * append query
    */
    ko.bindingHandlers.appendQuery = {
        splitUrl: function (url) {
            var ret = { path: '', query: '', anchor: '' };
            if (url) {
                var sepIndex = url.indexOf('?'), ancIndex = url.indexOf('#');
                if (sepIndex > -1) {
                    ret.path = url.substring(0, sepIndex);
                } else if (ancIndex > -1) {
                    ret.path = url.substring(0, ancIndex);
                } else {
                    ret.path = url;
                }
                if (ancIndex > -1) {
                    ret.anchor = url.substr(ancIndex + 1);
                }
                if (sepIndex > -1) {
                    if (ancIndex > -1) {
                        ret.query = url.substring(sepIndex + 1, ancIndex);
                    } else {
                        ret.query = url.substr(sepIndex + 1);
                    }
                }
            }
            return ret;
        },
        combineParts: function (sep) {
            var parts = [], args = ctx.arg2arr(arguments, 1);
            ctx.each(args, function (i, v) { if (v) { parts.push(v); } });
            return parts.join(sep || '');
        },
        //
        combineAll: false,
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var origin = $(element).attr('data-href') || $(element).attr('href'), append = ko.utils.unwrapObservable(valueAccessor());
            if (allValueAccessor()['combineAll'] !== true && ko.bindingHandlers.appendQuery.combineAll !== true) {
                $(element).attr('href', origin + append);
                return;
            }
            //
            var parts1 = ko.bindingHandlers.appendQuery.splitUrl(origin || ''),
                parts2 = ko.bindingHandlers.appendQuery.splitUrl(append || ''),
                querys = ko.bindingHandlers.appendQuery.combineParts('&', parts1.query, parts2.query),
                anchor = ko.bindingHandlers.appendQuery.combineParts('&', parts1.anchor, parts2.anchor);
            //
            var result = parts1.path || parts2.path;
            if (querys) { result += '?' + querys; }
            if (anchor) { result += '#' + anchor; }
            $(element).attr('href', result);
        }
    };

    /*
    * link protocol
    */
    ko.bindingHandlers.linkProtocol = {
        update: function (element, valueAccessor, allValueAccessor, viewModel) {
            var protocol = ko.utils.unwrapObservable(valueAccessor()) || '';
            var href = $(element).attr('href');
            protocol = protocol.toLowerCase();
            if (protocol === 'http' || protocol === 'http:') {
                $(element).attr('href', ctx.httpUrl(href));
            } else if (protocol === 'https' || protocol === 'https:') {
                $(element).attr('href', ctx.httpsUrl(href));
            }
        }
    };

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

    /*
    * watermark
    */
    ko.bindingHandlers.watermark = {
        allowInputTypes: { text: 1, password: 1, file: 1, date: 1, datetime: 1, time: 1, week: 1, month: 1, tel: 1, url: 1, email: 1, range: 1, number: 1, search: 1 },
        visible: function (input, label) {
            if (ctx.trim(input.val()).length > 0) {
                label.hide();
            } else {
                label.show();
            }
        },
        createProxy: function (input, label) {
            return function (ev) {
                if (ev && ev.type === 'keydown') {
                    window.clearTimeout(label.data('watermarkTimeoutId'));
                    label.data('watermarkTimeoutId', setTimeout(function () {
                        ko.bindingHandlers.watermark.visible(input, label);
                    }, 16));
                } else {
                    ko.bindingHandlers.watermark.visible(input, label);
                }
            };
        },
        //
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var label = $(element), value = ko.utils.unwrapObservable(valueAccessor());
            var input = (value === true) ? $('#' + label.attr('for')) : $(value);
            if (input.length > 0) {
                var disposeCore, labelHandler, inputHandler;
                label.click(labelHandler = function () { input.focus(); });
                var t = (input.attr('type') || '').toLowerCase();
                if (!!ko.bindingHandlers.watermark.allowInputTypes[t] || input.prop('tagName') === 'SELECT') {
                    var exec = inputHandler = ko.bindingHandlers.watermark.createProxy(input, label);
                    input.focus(exec).blur(exec).keydown(exec).change(exec).bind('input', exec);
                    exec({ type: 'keydown' });
                }
                ko.utils.domNodeDisposal.addDisposeCallback(element, disposeCore = function (elem) {
                    ko.utils.domNodeDisposal.removeDisposeCallback(elem, disposeCore);
                    if (labelHandler) { label.unbind('click', labelHandler); }
                    if (inputHandler) { input.unbind('focus', inputHandler).unbind('blur', inputHandler).unbind('keydown', inputHandler).unbind('change', inputHandler).unbind('input', inputHandler); }
                });
            }
        }
    };

    /*
    * watermarkFor
    */
    ko.bindingHandlers.watermarkFor = { init: ko.bindingHandlers.watermark.init };

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
                    name = ctx.trim(name);
                    if (name) {
                        val = ($(element).attr(name) || '');
                        if (val.indexOf('{0}') > -1) {
                            $(element).attr(name, ctx.format(val, index));
                        } else {
                            $(element).attr(name, ctx.format('{0}_{1}', val, index));
                        }
                    }
                });
            }
        }
    };

    /*
    * currency context
    */
    binding.currencyContext = function () {
        var currCode, callbacks = [];
        return {
            setup: function (code) {
                if (code && !currCode) {
                    currCode = code;
                    var cbs = callbacks; callbacks = [];
                    ctx.each(cbs, function (i, f) { f(code); });
                }
            },
            complete: function (cb) {
                if ($.type(cb) !== 'function') { return; }
                if (currCode) { cb(currCode); } else { callbacks.push(cb); }
            },
            currencyCode: function (cb) {
                this.complete(cb);
                return currCode;
            }
        };
    }();

    /*
    * currency symbol
    */
    ko.virtualElements.allowedBindings.currencySymbols = true;
    binding.currencySymbols = ko.bindingHandlers.currencySymbols = {
        symbols: {
            EUR: '€', // alt+0128
            GBP: '£',  // alt+0163
            USD: '$',
            CHF: 'CHF'
        },
        getSymbol: function (code) {
            binding.currencyContext.setup(code);
            return ko.bindingHandlers.currencySymbols.symbols[code] || '';
        },
        //
        update: function (element, valueAccessor, allValueAccessor, viewModel) {
            var currency = ko.utils.unwrapObservable(valueAccessor());
            //ko.utils.setTextContent(element, ko.bindingHandlers.currencySymbols.getSymbol(currency));
            ko.virtualElements.setHtml(element, ko.bindingHandlers.currencySymbols.getSymbol(currency));
        }
    };

    /*
    * fares text
    * format: '€ 5349,36' or '€ 5349,<sup>36</sup>'
    */
    ko.virtualElements.allowedBindings.faresText = true;
    binding.faresText = ko.bindingHandlers.faresText = {
        formatPrice: function (price, wrap) {
            price = String(price);
            var dotIndex = price.indexOf('.');
            if (dotIndex > -1) {
                var dots = price.substr(dotIndex + 1);
                if (dots.length < 2) {
                    dots = ctx.padRight(dots, 2, '0');
                    price = price.substr(0, dotIndex + 1) + dots;
                }
            } else {
                price += '.00';
            }
            if (wrap === true) {
                return price.replace(/\./, currencyDecimalMark + '<sup>') + '</sup>';
            }
            return price.replace(/\./, currencyDecimalMark);
        },
        format: function (price, currency, wrap) {
            if (price === null || price === undefined || !currency) { return ''; }
            var priceTxt = ko.bindingHandlers.faresText.formatPrice(price, wrap);
            var symbol = ko.bindingHandlers.currencySymbols.getSymbol(currency);
            return (binding.priceBeforeSymbol === true) ? (priceTxt + ' ' + symbol) : (symbol + ' ' + priceTxt);
        },
        //
        update: function (element, valueAccessor, allValueAccessor, viewModel) {
            var set = ko.utils.unwrapObservable(valueAccessor());
            if (set) {
                var wrap = ko.utils.unwrapObservable(set.wrap);
                var price = ko.utils.unwrapObservable(set.price);
                var currency = ko.utils.unwrapObservable(set.currency);
                ko.virtualElements.setHtml(element, ko.bindingHandlers.faresText.format(price, currency, wrap));
            }
        }
    };

    /*
    * fares amount
    * format: '5349,36' or '5349,<sup>36</sup>'
    */
    ko.virtualElements.allowedBindings.faresAmount = true;
    binding.faresAmount = ko.bindingHandlers.faresAmount = {
        update: function (element, valueAccessor, allValueAccessor, viewModel) {
            var amount = ko.utils.unwrapObservable(valueAccessor());
            ko.virtualElements.setHtml(element, ko.bindingHandlers.faresText.formatPrice(amount));
        }
    };

    //#endregion

    //#region date hack

    // set default
    if ($.mobiscroll) { $.mobiscroll.setDefaults({ height: 100 }); }
    // set reference
    binding.mobiscrollInstances = [];
    binding.cancelMobiscrolls = function () {
        ctx.each(binding.mobiscrollInstances, function (index, instance) {
            instance.cancel();
        });
    };

    //function isDateSupported() {
    //    var i = document.createElement("input");
    //    i.setAttribute("type", "date");
    //    return i.type !== "text";
    //}

    //function isDateSupported2() {
    //    var input = document.createElement("input");
    //    input.setAttribute("type", "date");
    //    input.value = "2012-05-01";
    //    return (input.valueAsDate instanceof Date);
    //}

    //var noNativeSupport = (!Modernizr.inputtypes.date && !isDateSupported2());

    var initDatepicker = function (element, ref, val, min, max, update, options) {
        var onchange = function (v, elem) {
            var parts = [];
            if (elem && elem.attr('type') === 'text') {
                if (v) {
                    var d = $.mobiscroll.parseDate(binding.dateFormat, v);
                    parts = [d.getFullYear(), d.getMonth() + 1, d.getDate()]; //NO UTC #28078
                }
            } else {
                // date input always return ISO formated date string.
                parts = (v || '').split('-');
            }
            if (parts.length === 3 && ref) {
                parts[0] = ctx.padLeft(parts[0], 4, '0');
                parts[1] = ctx.padLeft(parts[1], 2, '0');
                parts[2] = ctx.padLeft(parts[2], 2, '0');
                update(parts[0], parts[1], parts[2]);
            }
        };
        onchange(val);
        $(element).attr({
            min: min, max: max
        }).bind('change', function () {
            onchange($(this).val(), $(this));
        }).bind('blur', function () {
            onchange($(this).val(), $(this));
            if ($(this).attr('type') === 'date') {
                $(element).siblings('input[type=hidden]').val(true).change();
            }
        });

        // other fix
        if ($(element).attr('type') === 'text') {
            $(element).removeAttr('min').removeAttr('max');
            var scrollerOptions = $.extend({
                preset: 'date',
                theme: 'android-ics light',
                display: 'modal',
                mode: 'mixed',
                //animate: 'pop',
                dateFormat: binding.dateFormat,
                dateOrder: 'D ddmmyy',
                onSelect: function (valueText, instance) {
                    $(element).siblings('input[type=hidden]').val(true).change();
                    $(element).val(valueText).change();
                }
            }, options || {});
            $(element).scroller('destroy').scroller(scrollerOptions);
            binding.mobiscrollInstances.push($(element).mobiscroll('getInst'));
        }

        //if (ctx.isAndroid() && ctx.androidVersion() >= 4) {
        //    $(element).removeAttr('min').removeAttr('max');
        //    $(element).focus(function () {
        //        var v = $(this).val();
        //        if (!v) {
        //            v = val;
        //            $(this).val(v);
        //        } else if (v.length > 10) {
        //            v = v.substr(0, 10);
        //            $(this).val(v);
        //        }
        //        var self = this;
        //        setTimeout(function () {
        //            $(self).change();
        //        }, 16);
        //    });
        //}
    };

    var updateDatepicker = function (element, isoVal) {
        $(element).attr('value', isoVal).val(isoVal);

        // other fix
        if ($(element).attr('type') === 'text') {
            var date = ctx.parseDateStr(isoVal);
            $(element).scroller('setDate', date, true);
        }

        //if (ctx.isAndroid() && ctx.androidVersion() >= 4) {
        //}
    };

    var initDateRangeValidation = function (ref, val, min, max) {
        if (ref) {
            if (min) {
                ref.addMethod('minvalue', function (obs) {
                    if (!obs()) { return true; }
                    var m = min.split('T')[0] + 'T00:00:00';
                    return ctx.parseDateStr(m) <= ctx.parseDateStr(obs());
                });
            }
            if (max) {
                ref.addMethod('maxvalue', function (obs) {
                    if (!obs()) { return true; }
                    var m = max.split('T')[0] + 'T00:00:00';
                    return ctx.parseDateStr(m) >= ctx.parseDateStr(obs());
                });
            }
        }
    };

    //#endregion

    //#region searchBox

    /*
    * valid empty action
    */
    ko.bindingHandlers.validEmptyAction = {
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var obs = valueAccessor();
            if (obs) {
                obs.subscribe(function () {
                    var invalidLength = 0;
                    if (obs.koValidator) {
                        invalidLength = obs.koValidator.checkInvalids('required3len').length;
                    }
                    if (invalidLength === 0) {
                        $(element).addClass('active')
                    } else {
                        $(element).removeClass('active')
                    }
                });
            }
        }
    };

    /*
    * is field disable
    */
    ko.bindingHandlers.fieldEnable = {
        update: function (element, valueAccessor) {
            var val = ko.utils.unwrapObservable(valueAccessor());
            if (val === true) {
                $(element).removeClass('disable').addClass('active');
            } else {
                $(element).removeClass('active').addClass('disable');
            }
        }
    };

    /*
    * passenger select
    */
    ko.bindingHandlers.passengerSelect = {
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var setting = ko.utils.unwrapObservable(valueAccessor()),
                max = parseInt(ko.utils.unwrapObservable(setting.max), 10),
                min = parseInt(ko.utils.unwrapObservable(setting.min), 10),
                val = parseInt(ko.utils.unwrapObservable(setting.val), 10),
                ref = setting.ref;
            var innerHtml = [], selected;
            for (var i = min; i <= max; i++) {
                selected = (i === val) ? ' selected="selected"' : '';
                innerHtml.push('<option value="' + i + '"' + selected + '>' + i + '</option>');
            }
            $(element).html(innerHtml.join(''));
            // event
            $(element).change(function () {
                var val = $(this).val();
                ref && ref(parseInt(val, 10));
                $(element).prevAll('.input.number').text(val);
                if (val > 0) {
                    $(this).parent().parent().addClass('active');
                } else {
                    $(this).parent().parent().removeClass('active');
                }
            }).change();
        }
    };

    /*
    * classes select
    */
    ko.bindingHandlers.classesSelect = {
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var setting = ko.utils.unwrapObservable(valueAccessor()),
                valObj = ko.utils.unwrapObservable(setting.val),
                opt = ko.utils.unwrapObservable(setting.opt),
                ref = setting.ref;
            // dom
            var innerHtml = [], item, itemCode, itemName, selected,
                code = ko.utils.unwrapObservable(valObj.Code),
                name = ko.utils.unwrapObservable(valObj.DisplayName);
            for (var i = 0; i < opt.length; i++) {
                item = opt[i];
                itemCode = ko.utils.unwrapObservable(item.Code);
                itemName = ko.utils.unwrapObservable(item.DisplayName);
                selected = (itemCode === code) ? ' selected="selected"' : '';
                innerHtml.push('<option value="' + itemCode + '"' + selected + '>' + itemName + '</option>');
            }
            $(element).html(innerHtml.join(''));
            // fill
            $(element).val(code);
            // event
            $(element).change(function () {
                if (ref) {
                    ref.Value($(this).val());
                    ref.Text($(this).children(':selected').text());
                }
            }).change();
        }
    };

    /*
    * triptype select
    */
    ko.bindingHandlers.triptypeSelect = {
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var setting = ko.utils.unwrapObservable(valueAccessor()), ref = setting.ref;
            $(element).change(function () {
                if (ref) {
                    ref.Value($(this).val());
                    ref.Text($(this).children(':selected').text());
                }
            }).change();
        }
    };

    /*
    * search date
    */
    ko.bindingHandlers.searchDate = {
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var setting = ko.utils.unwrapObservable(valueAccessor()),
                max = ko.utils.unwrapObservable(setting.max).split('T')[0],
                min = ko.utils.unwrapObservable(setting.min).split('T')[0],
                val = ko.utils.unwrapObservable(setting.val).split('T')[0],
                ref = setting.ref;
            if (element.id === 'SearchBox_return') {
                var defaultDepartureDate = new Date();
                var defaultReturnDate = new Date(defaultDepartureDate.setDate(defaultDepartureDate.getDate() + 1));
                val = defaultReturnDate.getFullYear() + '-' + (defaultReturnDate.getMonth() + 1) + '-' + defaultReturnDate.getDate();
            }
            // add validation
            initDateRangeValidation(ref, val, min, max);
            // fix nonsupport
            var today = new Date();
            var todayOfNextYear = new Date(new Date(today).setFullYear(today.getFullYear() + 1));
            var datepickerInitOptions = {
                maxDate: new Date(todayOfNextYear.setDate(todayOfNextYear.getDate() - 1)),
                minDate: new Date()
            };
            initDatepicker(element, ref, val, min, max, function (year, month, day) {
                ref(year + month + day);
            }, datepickerInitOptions);
        },
        update: function (element, valueAccessor) {
            var val = ko.utils.unwrapObservable(valueAccessor().ref);
            if (val) {
                var year = val.substr(0, 4), month = val.substr(4, 2), day = val.substr(6, 2);
                var isoVal = year + '-' + month + '-' + day;
                //
                var monthyearNode = $(element).siblings('.input.date').children().eq(0);
                var monthNamesShort = ctx.i18n.get('monthNamesShort');
                var monthIdx = parseInt(month, 10) - 1;
                monthyearNode.text(day + ' ' + monthNamesShort[monthIdx] + ' ' + year);
                //
                updateDatepicker(element, isoVal);
            }
        }
    };

    /*
    * keyText
    */
    ko.bindingHandlers.keyText = {
        update: function (element, valueAccessor, allValueAccessor, viewModel) {
            var setting = ko.utils.unwrapObservable(valueAccessor()),
                text = ko.utils.unwrapObservable(setting.text),
                key = ko.utils.unwrapObservable(setting.key);
            if (key) {
                var lowerKey = key.toLowerCase(), lowerText = text.toLowerCase();
                var keyIndex = lowerText.indexOf(lowerKey);
                if (keyIndex > -1) {
                    var html = text.substr(0, keyIndex);
                    html += '<strong class="highlight">' + text.substr(keyIndex, key.length) + '</strong>';
                    html += text.substr(keyIndex + key.length);
                    $(element).html(html);
                    return;
                }
            }
            $(element).text(text);
        }
    };

    /*
    * countryFlag
    */
    ko.bindingHandlers.countryFlag = {
        update: function (element, valueAccessor, allValueAccessor, viewModel) {
            var countryCode = ko.utils.unwrapObservable(valueAccessor()), templateSrc = $(element).attr('src');
            var lastSep = templateSrc.lastIndexOf('/'), lastDot = templateSrc.lastIndexOf('.');
            var src = templateSrc.substr(0, lastSep + 1) + countryCode + templateSrc.substr(lastDot);
            $(element).attr({ src: src, alt: countryCode });
        }
    };

    //#endregion

    //#region searchWaiting

    /*
    * array rotater class
    */
    var arrayRotaterClass = binding.arrayRotaterClass = function (config) {
        $.extend(this, config);
        this.initialize();
    };
    arrayRotaterClass.prototype = {
        items: null, handler: null, onstart: null,
        timespan: 1024, timeoutId: null, currentIndex: 0,
        constructor: arrayRotaterClass,
        initialize: function () {
            try {
                this.items = Array.prototype.slice.call(this.items, 0);
            } catch (ex) { }
        },
        execCore: function () {
            if (this.currentIndex === this.items.length) {
                this.currentIndex = 0;
            }
            if (this.handler) {
                var current = this.items[this.currentIndex];
                var finished = this.items.slice(0, this.currentIndex);
                var remaining = this.items.slice(this.currentIndex + 1);
                this.handler.call(this, current, finished, remaining);
            }
            this.currentIndex++;
        },
        execProxy: function () {
            var self = this;
            this.timeoutId = setTimeout(function () {
                self.execCore();
                self.execProxy();
            }, this.timespan);
        },
        start: function () {
            if ($.type(this.items) === 'array') {
                if (this.onstart) { this.onstart.call(this); }
                this.stop(); this.reset(); this.execProxy();
            }
        },
        reset: function () { this.currentIndex = 0; },
        stop: function () { clearTimeout(this.timeoutId); },
        destroy: function () { this.stop(); this.items = null; }
    };

    /*
    * array rotater
    */
    ko.bindingHandlers.arrayRotater = {
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var setting = ko.utils.unwrapObservable(valueAccessor()),
                selector = ko.utils.unwrapObservable(setting.selector),
                dataKey = ko.utils.unwrapObservable(setting.dataKey);
            var arrayRotater = new arrayRotaterClass({
                items: $(element).find(selector),
                onstart: function () { $(this.items).removeClass('finished active shadow').addClass('shadow'); },
                handler: function (current, finished, remaining) {
                    $(current).removeClass('finished active shadow').addClass('active');
                    $(finished).removeClass('finished active shadow').addClass('finished');
                    $(remaining).removeClass('finished active shadow').addClass('shadow');
                }
            });
            // cache
            $(element).data(dataKey || 'arrayRotater', arrayRotater);
        }
    };

    //#endregion

    //#region searchResult

    /*
    * flight date string
    */
    ko.bindingHandlers.flightDateStr = {
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            if (value) {
                var date = ctx.parseDateStr(value);
                if (date) {
                    var monthNamesShort = ctx.i18n.get('monthNamesShort');
                    var format = '{0} {1} {2}'; //var format = (value.length === 8) ? '{0} {1}. {2}' : '{0} {1} {2}';
                    $(element).text(ctx.format(format, date.getUTCDate(), monthNamesShort[date.getUTCMonth()], date.getUTCFullYear()));
                }
            }
        },
        update: function (element, valueAccessor) {
        }
    };

    /*
    * carrier img
    */
    binding.carrierImg = ko.bindingHandlers.carrierImg = {
        formatSrc: function (src, size) {
            src = ctx.api.absolute(src); src = ctx.api.ifHttps(src);
            if (size) { src = ctx.appendQuery(src, 'size', size); }
            return src;
        },
        //
        update: function (element, valueAccessor, allValueAccessor, viewModel) {
            var obj = ko.utils.unwrapObservable(valueAccessor()),
                logo = ko.utils.unwrapObservable(obj.Logo || ctx.api.queryHref(obj, 'logo')),
                code = ko.utils.unwrapObservable(obj.Code),
                name = ko.utils.unwrapObservable(obj.DisplayName);
            var size = allValueAccessor()['carrierImgSize'];
            var src = ko.bindingHandlers.carrierImg.formatSrc(logo, size);
            $(element).attr({ alt: name, code: code, src: src });
        }
    };

    /*
    * flight info (e.g. '14:50 AMS')
    */
    ko.bindingHandlers.flightInfo = {
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var setting = ko.utils.unwrapObservable(valueAccessor()),
                airport = ko.utils.unwrapObservable(setting.airport),
                date = ko.utils.unwrapObservable(setting.date);
            if (date && airport) {
                var d = ctx.parseDateStr(date), code = ko.utils.unwrapObservable(airport.Code);
                $(element).text(d.getUTCHours() + ':' + ctx.padLeft(d.getUTCMinutes(), 2, '0') + ' ' + code);
            }
        },
        update: function (element, valueAccessor) {
        }
    };

    /*
    * filght duration (e.g. '2 u. 40 min.')
    */
    ko.bindingHandlers.flightDuration = {
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var duration = ko.utils.unwrapObservable(valueAccessor()), text = '';
            if (duration.length === 4) {
                var txtHours = $(element).attr('txthours') || ctx.i18n.get('flightDuration.hour');
                var txtMinutes = $(element).attr('txtminutes') || ctx.i18n.get('flightDuration.minute');
                var hour = parseInt(duration.substr(0, 2), 10), minute = duration.substr(2, 2);
                if (hour > 0) { text = hour + ' ' + txtHours + ' '; }
                text += ctx.padLeft(minute, 2, '0') + ' ' + txtMinutes;
                $(element).text(text);
            }
        },
        update: function (element, valueAccessor) {
        }
    };

    /*
    * flight stops
    */
    ko.bindingHandlers.flightStops = {
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var stops = ko.utils.unwrapObservable(valueAccessor());
            if ($.type(stops) === 'number') {
                if (stops === 0) {
                    $(element).text(ctx.i18n.get('FlightStopsDirect')).removeClass('red_color');
                } else if (stops === 1) {
                    $(element).text(stops + ' ' + ctx.i18n.get('FlightStopsStile')).addClass('red_color');
                } else {
                    $(element).text(stops + ' ' + ctx.i18n.get('FlightStopsStiles')).addClass('red_color');
                }
            }
        },
        update: function (element, valueAccessor) {
        }
    };


    /*
    * passengerComplete
    */
    ko.bindingHandlers.passengerComplete = {/*#28082*/
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
        },
        update: function (element, valueAccessor) {
            var hadCompleted = ko.utils.unwrapObservable(valueAccessor());
            if (hadCompleted) {
                $(element).css("cursor", "pointer");
            } else {
                $(element).css("cursor", "default");
            }
        }
    };

    /*
    * timeSlider
    */
    ko.bindingHandlers.timeSlider = {
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var setting = ko.utils.unwrapObservable(valueAccessor()),
                sta = ctx.parseDateStr(setting.sta()), end = ctx.parseDateStr(setting.end()),
                min = ctx.parseDateStr(setting.min()), max = ctx.parseDateStr(setting.max());
            //
            var tips = $(element).find('.ui-slider-tooltip'), defaultValues = [sta.getTime(), end.getTime()];
            var formatText = function (d) {
                return ctx.padLeft(d.getUTCHours(), 2, '0') + ':' + ctx.padLeft(d.getUTCMinutes(), 2, '0');
            }, formatDateStr = function (d) {
                return ctx.toApiDateFmtStr(d);
            }, update = function (values) {
                var d0 = new Date(values[0]), d1 = new Date(values[1]);
                tips.eq(0).text(formatText(d0)); tips.eq(1).text(formatText(d1));
                setting.sta(formatDateStr(d0)); setting.end(formatDateStr(d1));
            };
            //
            update(defaultValues);
            try {
                $(element).slider('destroy');
            } catch (ex) { }
            $(element).slider({
                range: true,
                min: Math.min(min.getTime(), sta.getTime()),
                max: Math.max(max.getTime(), end.getTime()),
                values: defaultValues,
                slide: function (event, ui) {
                    update(ui.values);
                }
            });
        },
        update: function (element, valueAccessor) {
        }
    };

    /*
    * timeSlider2
    */
    ko.bindingHandlers.timeSlider2 = {
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var setting = ko.utils.unwrapObservable(valueAccessor()),
                sta = ctx.parseDateStr(setting.sta()), end = ctx.parseDateStr(setting.end()),
                min = ctx.parseDateStr(setting.min()), max = ctx.parseDateStr(setting.max());
            //
            var rangeMin = ctx.parseTicks(0, 0, 0, 0), rangeMax = ctx.parseTicks(24, 0, 0, 0), rangeStep = ctx.parseTicks(0, 30, 0, 0);
            var defaultMin = ctx.parseTicks(sta.getUTCHours(), sta.getUTCMinutes(), sta.getUTCSeconds(), sta.getUTCMilliseconds());
            var defaultMax = ctx.parseTicks(end.getUTCHours(), end.getUTCMinutes(), end.getUTCSeconds(), end.getUTCMilliseconds());
            var defaultValues = [defaultMin, defaultMax], tips = $(element).find('.ui-slider-tooltip');
            //
            var formatText = function (d) {
                return ctx.padLeft(d.getUTCHours(), 2, '0') + ':' + ctx.padLeft(d.getUTCMinutes(), 2, '0');
            }, formatDateStr = function (d, od) {
                return ctx.format('{0}-{1}-{2}T{3}:{4}:{5}',
                od.getUTCFullYear(), ctx.padLeft(od.getUTCMonth() + 1, 2, '0'), ctx.padLeft(od.getUTCDate(), 2, '0'),
                ctx.padLeft(d.getUTCHours(), 2, '0'), ctx.padLeft(d.getUTCMinutes(), 2, '0'), ctx.padLeft(d.getUTCSeconds(), 2, '0'));
            }, update = function (values) {
                if (values[1] === 86400000) { values[1] = ctx.parseTicks(23, 59, 0, 0); }
                var d0 = new Date(values[0]), d1 = new Date(values[1]);
                tips.eq(0).text(formatText(d0)); tips.eq(1).text(formatText(d1));
                setting.sta(formatDateStr(d0, sta)); setting.end(formatDateStr(d1, end));
            };
            update(defaultValues);
            //
            try {
                $(element).slider('destroy');
            } catch (ex) { }
            $(element).slider({
                range: true,
                min: rangeMin,
                max: rangeMax,
                step: rangeStep,
                values: defaultValues,
                slide: function (event, ui) {
                    update(ui.values);
                }
            });
        },
        update: function (element, valueAccessor) {
        }
    };

    //#endregion

    //#region checkoutFlow

    /*
    * detail date
    */
    ko.bindingHandlers.detailDate = {
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var str = ko.utils.unwrapObservable(valueAccessor()) || '';
            if (str) {
                var monthNamesShort = ctx.i18n.get('monthNamesShort');
                var d = ctx.parseDateStr(str), year = d.getUTCFullYear(), monthIdx = d.getUTCMonth(), day = d.getUTCDate();
                //var dayNode = $(element).find('.day'),
                var monthyearNode = $(element).find('.monthyear');
                //dayNode.text(day);
                monthyearNode.text(day + ' ' + monthNamesShort[monthIdx] + ' ' + year);
            }
        },
        update: function (element, valueAccessor) {
        }
    };

    /*
    * birthday date
    */
    ko.bindingHandlers.birthdayDate = {
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var setting = ko.utils.unwrapObservable(valueAccessor()),
                max = ko.utils.unwrapObservable(setting.max).split('T')[0],
                min = ko.utils.unwrapObservable(setting.min).split('T')[0],
                val = ko.utils.unwrapObservable(setting.val).split('T')[0],
                ref = setting.ref;
            // add validation
            initDateRangeValidation(ref, val, min, max);
            // fix nonsupport
            initDatepicker(element, ref, val, min, max, function (year, month, day) {
                ref(year + '-' + month + '-' + day + 'T00:00:00');
            });
        },
        update: function (element, valueAccessor) {
            var val = ko.utils.unwrapObservable(valueAccessor().ref);
            if (val) {
                var isoVal = val.split('T')[0];
                updateDatepicker(element, isoVal);
            }
        }
    };

    /*
    * passenger title on checkout.summary
    * format: 'Mevr. Tineke Rooij'
    */
    binding.formatPassengerTitle = function (passenger) {
        var nameFormat = '{0} {1} {2}', title;
        if (passenger.GenderType === ctx.api.PassengerGenderEnum.Male) {
            title = ctx.i18n.get('MaleTitle');
        } else if (passenger.GenderType === ctx.api.PassengerGenderEnum.Female) {
            title = ctx.i18n.get('FemaleTitle');
        }
        return ctx.format(nameFormat, title, passenger.FirstName, passenger.LastName);
    };
    var updatePassengerTitle = function (element, valueAccessor) {
        var passenger = ko.utils.unwrapObservable(valueAccessor());
        $(element).text(binding.formatPassengerTitle(ko.mapping.toJS(passenger)));
    };
    ko.bindingHandlers.passengerTitle = {
        init: updatePassengerTitle,
        update: updatePassengerTitle
    };

    /*
    * birthday text on checkout.summary
    * format: '22-Okt-1977'
    */
    ko.bindingHandlers.passengerBirthday = {
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var birthdayStr = ko.utils.unwrapObservable(valueAccessor());
            if (birthdayStr) {
                var monthNamesShort = ctx.i18n.get('monthNamesShort'), d = ctx.parseDateStr(birthdayStr);
                var year = d.getUTCFullYear(), monthIdx = d.getUTCMonth(), day = d.getUTCDate();
                $(element).text(ctx.padLeft(day, 2, '0') + '-' + monthNamesShort[monthIdx] + '-' + year);
            }
        },
        update: function (element, valueAccessor) {
        }
    };

    /*
    * flightTimeStr
    */
    ko.bindingHandlers.flightTimeStr = {
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var str = ko.utils.unwrapObservable(valueAccessor()), date = ctx.parseDateStr(str);
            var hour = date.getUTCHours(), minute = date.getUTCMinutes();
            $(element).text(ctx.format('{0}:{1}', hour, ctx.padLeft(minute, 2, '0')));
        },
        update: function (element, valueAccessor) {
        }
    };

    /*
    * flightNumberStr
    */
    ko.bindingHandlers.flightNumberStr = {
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var set = ko.utils.unwrapObservable(valueAccessor()),
                carrier = ko.utils.unwrapObservable(set.carrier),
                num = ko.utils.unwrapObservable(set.num);
            if (carrier) {
                $(element).text(carrier.Code.substr(0, 2) + num);
            }
        },
        update: function (element, valueAccessor) {
        }
    };

    /*
    * timeout select value
    */
    ko.bindingHandlers.timeoutSelectValue = {
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            if ($(element).prop('tagName') === 'SELECT') {
                setTimeout(function () {
                    var obs = valueAccessor(), val = ko.utils.unwrapObservable(obs);
                    $(element).change(function () {
                        var strVal = ctx.trim($(this).val());
                        var intVal = parseInt(strVal, 10);
                        if (isNaN(intVal)) {
                            obs(strVal);
                        } else {
                            obs(intVal);
                        }
                    }).children('option').each(function () {
                        if (this.value == val) {
                            this.selected = true;
                            return false;
                        }
                    });
                    obs(''); // reset
                    $(element).triggerHandler('change');
                }, 16);
            }
        },
        update: function (element, valueAccessor) {
        }
    };

    /*
    * reflect html
    */
    ko.bindingHandlers.reflectHtml = {
        init: function (element, valueAccessor, allValueAccessor, viewModel) {
            var obs = valueAccessor();
            setTimeout(function () {
                obs($(element).html());
            }, 16);
        },
        update: function (element, valueAccessor) {
        }
    };

    //#endregion

    //#region ko extenders
    //observable change track
    ko.extenders.trackChange = function (target, track) {
        if (track) {
            target.hasChanged = ko.observable(false);
            target.originalValue = target();
            target.subscribe(function (newValue) {
                target.hasChanged(newValue != target.originalValue);
            });
        }
        return target;
    };
    //#endregion

}(jQuery, travixmob));
