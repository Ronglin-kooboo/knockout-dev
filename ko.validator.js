/*
* bindings 
*/

(function ($, ctx) {

    // namespace
    var binding = ctx.binding = {};

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
            var isCommentBinding = (element.nodeType === 8), requireReset = false;
            //
            ref.registerValidAction(function (success) {
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
            var isCommentBinding = (element.nodeType === 8), requireReset = false;
            //
            ref.registerValidAction(function (success) {
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
        }
    };

    //#endregion

} (jQuery, jRulee));
