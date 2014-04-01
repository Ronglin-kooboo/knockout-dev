/*
* routes
*/

(function ($, ctx) {

    // namespace
    var route = ctx.route = {
        scriptInBody: true,
        releaseModeBinding: true,
        alwaysRefreshNextFrame: true,
        swapFrameAfterBinding: true,
        animationSwapFrame: true
    };

    //#region initialize

    //#region mapping

    var pages = window.CMS.mapping || {}; // render out by view

    var getPageUrl = function (url) {
        var key = url.replace('#/', '');
        return pages[key.toLowerCase()];
    };

    //#endregion

    //#region frameSlide

    route.frameSupport = function () {
        var userAgent = navigator.userAgent.toLowerCase();
        // test:transitions
        var transitions;
        if ($.support.transition) {
            var transitionDevices = function () {
                if (ctx.isAndroid() && ctx.androidVersion() < 3) { return true; }
                else if (/(chrome|safari|firefox)/i.test(userAgent) && userAgent.indexOf('mobile safari') === -1) { return true; }
                else { return false; }
            }();
            if (transitionDevices) {
                transitions = true;
            }
        }
        // test:transforms3d
        var transforms3d;
        if (window.Modernizr.csstransforms3d) {
            var transforms3dDevices = function () {
                if (ctx.isIOS()) { return true; }
                else if (ctx.isAndroid() && ctx.androidVersion() >= 4) { return true; }
                else if (/(chrome|safari|firefox)/i.test(userAgent) && userAgent.indexOf('mobile safari') === -1) { return true; }
                else { return false; }
            }();
            if (transforms3dDevices) {
                transforms3d = true;
            }
        }
        // event:transitionEnd
        var transitionEnd;
        if (window.Modernizr.csstransforms3d) {
            if (/chrome/i.test(userAgent)) { transitionEnd = 'webkitTransitionEnd'; }
            else if (/safari/i.test(userAgent)) { transitionEnd = 'webkitTransitionEnd'; }
            else if (/firefox/i.test(userAgent)) { transitionEnd = 'transitionend'; }
            //referene: https://developer.mozilla.org/zh-CN/docs/Mozilla_event_reference/transitionend
        }
        // ret
        return {
            animations: route.animationSwapFrame ? 'auto' : 'none',
            transitions: transitions,
            transforms3d: transforms3d,
            transitionEnd: transitionEnd
        };
    }();

    var isStartupPage = (getPageUrl('current') == getPageUrl('startup'));
    if (isStartupPage && route.frameSupport.animations === 'auto') {
        if (route.frameSupport.transitions) { $('html').addClass('frameTransitions'); }
        if (route.frameSupport.transforms3d) { $('html').addClass('frameTransforms3d'); }
        // reflow css animate
        $(window).bind('orientationchange', function () {
            if (route.frameSupport.transitions) { $('html').removeClass('frameTransitions').addClass('frameTransitions'); }
            if (route.frameSupport.transforms3d) { $('html').removeClass('frameTransforms3d').addClass('frameTransforms3d'); }
        });
    }

    $.fn.frameSlide = function (set) {
        set = set || {}; var self = this;
        if (set.from === set.to) { return; }
        var holder = ctx.frameManager.getHolder();
        var scroller = ctx.frameManager.getScroller();
        var duration = 320, useTransitionEnd = true;
        //
        var beforeStart = function () {
            if (ctx.isAndroid() && ctx.androidVersion() < 4.2) { self.find('.header.fixed').css('position', 'relative'); }
            if ($.type(set.beforeStart) === 'function') { set.beforeStart.call(self, set); }
        }, beforeAnimate = function () {
            if ($.type(set.beforeAnimate) === 'function') { set.beforeAnimate.call(self, set); }
        }, complete = function () {
            if (ctx.isAndroid() && ctx.androidVersion() < 4.2) { self.find('.header.fixed').css('position', ''); }
            if ($.type(set.complete) === 'function') { set.complete.call(self, set); }
        };
        //
        beforeStart();
        if (route.frameSupport.animations === 'none') {
            beforeAnimate();
            complete();
        }
        else if (route.frameSupport.transforms3d) {
            var n = set.from.toString() + '_' + set.to.toString();
            // init
            switch (n) {
                case '-1_0': { if (!self.hasClass('frame_slide_to_f1')) { self.addClass('frame_at_f1'); } break; }
                case '1_0': { if (!self.hasClass('frame_slide_to_1')) { self.addClass('frame_at_1'); } break; }
                case '0.879_0': { break; }
                case '0_-1': { self.removeClass('frame_slide_to_f1'); break; }
                case '0_1': { self.removeClass('frame_slide_to_1'); break; }
                case '0_0.879': { break; }
            }
            // before
            if (useTransitionEnd && route.frameSupport.transitionEnd) {
                self.bind(route.frameSupport.transitionEnd, function () {
                    self.unbind(route.frameSupport.transitionEnd);
                    complete();
                });
            }
            // animate
            beforeAnimate();
            setTimeout(function () {
                switch (n) {
                    case '-1_0': { self.removeClass('frame_at_f1 frame_slide_to_f1'); break; }
                    case '1_0': { self.removeClass('frame_at_1 frame_slide_to_1'); break; }
                    case '0.879_0': { self.removeClass('frame_slide_to_879'); break; }
                    case '0_-1': { self.addClass('frame_slide_to_f1'); break; }
                    case '0_1': { self.addClass('frame_slide_to_1'); break; }
                    case '0_0.879': { self.addClass('frame_slide_to_879'); break; }
                }
                // complete
                if (!useTransitionEnd || !route.frameSupport.transitionEnd) {
                    setTimeout(complete, duration);
                }
            }, 0);
        }
        else {
            var sTop = scroller.scrollTop(), w = $(window).width();
            //
            holder.css('overflow-x', 'hidden');
            if (route.frameSupport.transitions) {
                var startLeft = (set.from * w) + 'px';
                self.addClass('frame-sliding').css({ width: w, top: sTop, left: 0, transform: 'translate(' + startLeft + ', 0)' });
            } else {
                var startLeft = set.from * w;
                self.addClass('frame-sliding').css({ width: w, top: sTop, left: startLeft });
            }
            var reset = function () {
                holder.css('overflow-x', '');
                self.removeClass('frame-sliding').css({ width: '', top: '', left: '', transform: '' });
            };
            var callback = function () {
                if (set.autoDisplay === false) { reset(); } else { setTimeout(reset, 128); }
                complete();
            };
            beforeAnimate();
            if (route.frameSupport.transitions) {
                var endLeft = (set.to * w) + 'px';
                self.transition({ x: endLeft }, duration, 'ease-in-out', callback);
            } else {
                var endLeft = set.to * w;
                self.animate({ left: endLeft }, duration, callback);
            }
        }
        // ret
        return self;
    };

    //#endregion

    //#region iScroll
    ctx.iscroll = function (el, set) {
        return new iScroll($(el).get(0), $.extend({
            checkDOMChanges: true,
            onBeforeScrollStart: function (e) {
                var nodeType = e.explicitOriginalTarget ? e.explicitOriginalTarget.nodeName.toLowerCase() : (e.target ? e.target.nodeName.toLowerCase() : '');
                if (nodeType != 'select' && nodeType != 'option' && nodeType != 'input' && nodeType != 'textarea') {
                    e.preventDefault();
                }
            }
        }, set));
    };
    //#endregion

    //#region viewport

    var orientationChange = function (orientation) {
        if (orientation === 0 || orientation === 180) {
            $('meta[name="viewport"]').attr('content', 'width=720,initial-scale=0.44,maximum-scale=0.44,minimum-scale=0.44,user-scalable=1');
        } else {
            $('meta[name="viewport"]').attr('content', 'width=device-width,initial-scale=0.44,maximum-scale=0.44,minimum-scale=0.44,user-scalable=1');
        }
    };
    if (ctx.isAndroid()) {
        $(window).bind('orientationchange', function () {
            orientationChange(window.orientation);
        });
    }
    if (ctx.androidLow()) {
        $(window).scroll(function () {
            $('header.fixed:visible').css({ 'position': 'absolute', 'top': $(window).scrollTop() + 'px' });
        });
    }

    // reflow viewport
    var initializeViewport = function () {
        var ori = ctx.isIOS() ? 0 : window.orientation;
        orientationChange((ori === 0 || ori === 180) ? 90 : 0);
        setTimeout(function () { orientationChange((ori === 0 || ori === 180) ? 0 : 90); }, 0);
    };

    //#endregion

    //#region stats

    route.statsMgr = {
        root_domain: function () {
            var host, domain = host = location.host;
            if (/^localhost/i.test(host)) { return null; }
            var matchs = host.match(/\..+\.[a-zA-A]+$/);
            if (matchs && matchs.length > 0) { domain = matchs[0]; }
            return domain;
        },
        cookie_stats_id: function (customerId) {
            if (arguments.length === 0) {
                return ctx.cookie('stats_id');
            } else {
                var expires = 326; // 326 days
                //var expires = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
                return ctx.cookie('stats_id', customerId, { path: '/', domain: this.root_domain(), expires: expires });
            }
        },
        cookie_stats_sid: function (sessionId) {
            if (arguments.length === 0) {
                return ctx.cookie('stats_sid');
            } else {
                var expires = null; // session
                //var expires = new Date(new Date().getTime() + 30 * 60 * 1000); // 30 minutes
                return ctx.cookie('stats_sid', sessionId, { path: '/', domain: this.root_domain(), expires: expires });
            }
        },
        cookie_profiles_token: function (token) {
            if (arguments.length === 0) {
                return ctx.cookie('p_token');
            } else {
                var expires = 30; // 30 days
                //var expires = new Date(new Date().getTime() + 30 * 60 * 1000); // 30 minutes
                return ctx.cookie('p_token', token, { path: '/', domain: this.root_domain(), expires: expires });
            }
        },
        refresh_cookies: function () {
            var self = this;
            ctx.api.getCustomerId(function (customerId) {
                //
                if (self.isNewVisitor()) {
                    //ctx.api.apiEvents({ EventName: ctx.api.EventNameEnum.NewVisitor }, function () { });
                } else if (self.isSessionExpired()) {
                    //ctx.api.apiEvents({ EventName: ctx.api.EventNameEnum.ReVisit }, function () { });
                }
                //
                self.cookie_stats_id(customerId);
                //self.cookie_stats_sid(customerId);
            });
        },
        //
        isNewVisitor: function () {
            return !this.anyCustomerId();
        },
        isSessionExpired: function () {
            return !this.cookie_stats_sid();
        },
        //
        queryParams: {},
        anyQuery: function (names) {
            var ret, qs = this.queryParams || {};
            ctx.each(names, function (i, name) { if (ret = qs[name]) { return false; } });
            return ret;
        },
        anyChannel: function () { return this.anyQuery(['ch', 'channel']); },
        anySubChannel: function () { return this.anyQuery(['sc', 'subch', 'subchannel']); },
        anyLanguage: function () { return this.anyQuery(['l', 'lang', 'langid', 'language']); },
        anyCustomerId: function () { return this.anyQuery(['cid', 'stats_id', 'customerid']) || this.cookie_stats_id(); },
        appplyApiRoutes: function (qs) {
            this.queryParams = qs || {}; var ch, sc, l, cid;
            if (ch = this.anyChannel()) { ctx.api.applyChannel(ch); }
            if (sc = this.anySubChannel()) { ctx.api.applySubChannel(sc); }
            if (l = this.anyLanguage()) { ctx.api.applyLanguage(l); }
            if (cid = this.anyCustomerId()) { ctx.api.applyCustomerId(cid); }
        }
    };

    //#endregion

    //#endregion

    //#region frame manager

    //#region page rule

    /*
    *   <div data-role="page">
    *       <div data-role="header">...</div>
    *       <div data-role="content">...</div>
    *       <div data-role="footer">...</div>
    *   </div>
    */
    var pageRule = function (config) {
        $.extend(this, config);
        this.initialize();
    };

    pageRule.create = function (elem) {
        if ($(elem).attr('data-role') === 'page') {
            return new pageRule({ elem: elem });
        }
    };

    pageRule.prototype = {
        elem: null, iscroll: null,
        page: null, head: null, body: null, foot: null,
        constructor: pageRule, _onresize: null,
        initialize: function () {
            var self = this;
            this.page = $(this.elem);
            this.head = this.page.children('[data-role="header"]');
            this.body = this.page.children('[data-role="content"]');
            this.foot = this.page.children('[data-role="footer"]');
            this.page.css('height', '100%'); this.body.css('position', 'relative');
            $(window).bind('resize', this._onresize = function () { self.refresh(); });
            if (this.body.length > 0) { this.iscroll = ctx.iscroll(this.body.get(0), { bounce: true }); }
        },
        refresh: function () {
            var bodyHeight = $(window).height() - this.head.outerHeight() - this.foot.outerHeight();
            this.body.css('height', Math.max(bodyHeight, 0));
            if (this.iscroll) { this.iscroll.refresh(); }
        },
        destroy: function () {
            if (this.iscroll) { this.iscroll.destroy(); this.iscroll = null; }
            if (this._onresize) { $(window).unbind('resize', this._onresize); }
        }
    };

    //#endregion

    var frameManager = ctx.frameManager = function () {
        // extend
        $.fn.applyBindings = function (model) {
            this.each(function () {
                if (!route.releaseModeBinding) {
                    ko.applyBindings(model, this);
                } else {
                    try { ko.applyBindings(model, this); }
                    catch (ex) { model.mErrorMessages.push(String(ex)); }
                }
            });
            var swapcallback = this.data('swapcallback');
            if ($.type(swapcallback) === 'function') {
                this.removeData('swapcallback');
                swapcallback();
            }
        };
        // mark binding
        if (window.ko && !ko.bindingHandlers.mark) {
            ko.bindingHandlers.mark = {
                init: function (element, valueAccessor, allValueAccessor, viewModel) {
                    var obj = ko.utils.unwrapObservable(valueAccessor());
                    $(element).click(function () {
                        frameManager.mark(obj);
                        return true;
                    });
                }
            };
        }

        // settings
        var refreshNext = route.alwaysRefreshNextFrame, animation = route.animationSwapFrame;
        // closure varibles
        var frames = [], currentFrame, currentIndex = -1, urlsDepthSet = {};
        var exportEvents = new ctx.dispatcher(frameManager);
        // elements
        var frameCaching, frameHolder, frameScroller;
        // markers
        var isret = false, istop = false, isani = true;

        // func
        return {
            initialize: function () {
                frameHolder = $('body'); //frameHolder = $('<div class="frame-holder" style="height:100%;"></div>').prependTo('body');
                frameCaching = $('<div class="frame-caching" style="display:none;"></div>').appendTo('body');
                frameScroller = $(document);
            },
            //
            bindRules: function (elems) {
                $(elems).each(function () {
                    var rule = $(this).data('pageRule') || pageRule.create(this);
                    if (rule) { $(this).data('pageRule', rule); rule.refresh(); }
                });
            },
            //
            getHolder: function () { return frameHolder; },
            getScroller: function () { return frameScroller; },
            //
            toCaching: function (elem) { return $(elem).appendTo(frameCaching); },
            toHolder: function (elem) { var ret = $(elem).prependTo(frameHolder); this.bindRules(elem); return ret; },
            //
            frameId: function (frame) { return frame.url + '_' + frame.rid; },
            htmlFramed: function (html, frame) { return $(html).attr('htmlframe', this.frameId(frame)); },
            queryHolder: function (frame) { return frameHolder.children('*[htmlframe="' + this.frameId(frame) + '"]'); },
            queryCaching: function (frame) { return frameCaching.children('*[htmlframe="' + this.frameId(frame) + '"]'); },
            //
            events: exportEvents,
            show: function (frame, callback) {
                // hide current
                var self = this, completeExecuter = new ctx.countExecuter({
                    num: 2, exec: function () {
                        if (currentFrame) {
                            currentFrame.scrollTop = frameScroller.scrollTop();
                            self.toCaching(self.queryHolder(currentFrame));
                            var ondisabled = currentFrame.events.ondisabled;
                            if ($.type(ondisabled) === 'function') {
                                ondisabled.call(currentFrame); // ondisabled event
                                exportEvents.dispatch({ type: 'ondisabled' }, currentFrame);
                            }
                        }
                        callback && callback();
                    }
                });
                // show new frame
                var newFrameDom = this.queryCaching(frame);
                var scrollTop = istop ? 0 : frame.scrollTop;
                if (scrollTop !== frameScroller.scrollTop()) {
                    frameScroller.scrollTop(scrollTop);
                }
                if (animation && isani && frames.length > 1) {
                    this.toHolder(newFrameDom);
                    if (currentFrame) {
                        var ifSlideOut = currentFrame.events.ifSlideOut;
                        if ($.type(ifSlideOut) === 'function' && ifSlideOut.call(currentFrame) === false) {
                            completeExecuter.count();
                        } else {
                            this.queryHolder(currentFrame).filter(function () {
                                return $(this).css('display') !== 'none';
                            }).frameSlide({
                                from: (isret ? 0 : 0), to: (isret ? 1 : -1),
                                complete: function () { completeExecuter.count(); }
                            });
                        }
                    }
                    var ifSlideIn = frame.events.ifSlideIn;
                    if ($.type(ifSlideIn) === 'function' && ifSlideIn.call(frame) === false) {
                        completeExecuter.count();
                    } else {
                        newFrameDom.filter(function () {
                            return $(this).css('display') !== 'none';
                        }).frameSlide({
                            from: (isret ? -1 : 1), to: (isret ? 0 : 0),
                            complete: function () { completeExecuter.count(); }
                        });
                    }
                } else {
                    this.toHolder(newFrameDom);
                    completeExecuter.count(2);
                }
            },
            showProxy: function (index, events) {
                var self = this;
                return function () {
                    var toshowFrame = frames[index];
                    if (toshowFrame) {
                        self.show(toshowFrame, function () {
                            // reset markers
                            isret = false; istop = false; isani = true;
                            // execute events
                            if ($.type(events.oncomplete) === 'function') {
                                events.oncomplete.call(toshowFrame); // oncomplete event
                                exportEvents.dispatch({ type: 'oncomplete' }, toshowFrame);
                            }
                            // update after show
                            currentIndex = index;
                            currentFrame = toshowFrame;
                        });
                    }
                };
            },
            goto1: function (index, url, params, events, html) {
                // check
                events = events || {};
                var cachedIsRet = isret, currentFrameSwapped = false, showFunc = this.showProxy(index, events);
                // insert
                var insertNew = (!!html);
                if (insertNew) {
                    var frame = { rid: ctx.guid(), url: url, params: params, events: events, scrollTop: 0 };
                    var domContext = this.toCaching(this.htmlFramed(html, frame));
                    domContext = domContext.filter(function () { return this.nodeType === 1; });
                    frames.splice(index, 0, frame); // insert
                    if (route.swapFrameAfterBinding && frames.length > 1) {
                        currentFrameSwapped = true;
                        domContext.data('swapcallback', showFunc);
                    }
                    if ($.type(events.onload) === 'function') {
                        events.onload.call(frame, domContext); // onload event
                        exportEvents.dispatch({ type: 'onload' }, frame, domContext);
                    }
                }
                // show
                if (!currentFrameSwapped) { showFunc(); }
                // remove
                if (insertNew && !cachedIsRet) {
                    for (var i = frames.length - 1; i > index; i--) {
                        this.queryCaching(frames.splice(i, 1)[0]).remove();
                    }
                }
            },
            find: function (url) {
                var ret = { frame: null, index: -1 };
                ctx.each(frames, function (index) {
                    if (this.url === url) {
                        ret.index = index;
                        ret.frame = this;
                        return false;
                    }
                });
                return ret;
            },
            diff: function (p1, p2) {
                p1 = $.extend({}, p1); delete p1['cid'];
                p2 = $.extend({}, p2); delete p2['cid'];
                var ret = ctx.diff(p1, p2);
                return (ret || ctx.diff(p2, p1));
            },
            urlsDepth: function (urls) {
                return (urls === undefined) ? (urls = urlsDepthSet) : (urlsDepthSet = urls);
            },
            depthUrl: function (depth, url) {
                urlsDepthSet = urlsDepthSet || {};
                url = (url || '').toLowerCase();
                urlsDepthSet[url] = depth;
            },
            ifIsRet: function (url, refurl) {
                if (!urlsDepthSet) { return null; }
                url = (url || '').toLowerCase();
                refurl = (refurl || '').toLowerCase();
                return urlsDepthSet[url] < urlsDepthSet[refurl];
            },
            request: function (url, params, events) {
                // event
                exportEvents.dispatch({ type: 'onrequest' });
                // judge isret
                if (isret !== true && currentIndex > -1) {
                    var cf = frames[currentIndex]; // current frame
                    if (cf && this.ifIsRet(url, cf.url)) { isret = true; }
                }
                // find
                var gotoIndex = currentIndex + (isret ? -1 : 1);
                gotoIndex = Math.max(gotoIndex, 0);
                if (isret || !refreshNext) {
                    var findRet = this.find(url);
                    if (findRet.index > -1) {
                        gotoIndex = findRet.index;
                        var diffRet = this.diff(findRet.frame.params, params);
                        if (!diffRet) {
                            var ff = findRet.frame; // found frame
                            frameManager.goto1(gotoIndex, ff.url, ff.params, ff.events);
                            return;
                        }
                    }
                }
                // ajax
                var pageUrl = getPageUrl(url);
                if (pageUrl) {
                    pageUrl = ctx.appendQuery(pageUrl, params);
                    pageUrl = ctx.appendQuery(pageUrl, 'one_page_app_request', 'true');
                    ctx.getHtml(pageUrl, function (html) {
                        frameManager.goto1(gotoIndex, url, params, events, html);
                    }, function () {
                        //
                    });
                }
            },
            mark: function (obj) {
                obj = obj || {};
                isret = (!!obj.ret);
                istop = (!!obj.top);
                isani = (obj.ani !== false);
            },
            frame: function (offset) {
                return frames[currentIndex + offset];
            },
            next: function () {
                frameManager.goto1(currentIndex + 1);
            },
            prev: function () {
                frameManager.goto1(currentIndex - 1);
            }
        };
    }();

    //#endregion

    //#region sammy page routes

    var homeRoute = '#/home';
    var routeApp = $.sammy(function () {

        // handle all frame requests
        frameManager.events.add(function (ev) {
            if (ev.type === 'onrequest') {
                // abort all
                ctx.globalAjaxPool.abort();
                // close popups
                ctx.models.popupKit.close();
                // cancel mobiscroll
                ctx.binding.cancelMobiscrolls();
            }
        });

        // init viewport
        var completeHandler;
        frameManager.events.add(completeHandler = function (ev) {
            if (ev.type === 'oncomplete') {
                setTimeout(initializeViewport, 0);
                frameManager.events.remove(completeHandler);
            }
        });

        // sammy can not callback in android2.3, fixed issue #26981
        if (ctx.androidLow()) { this.disable_push_state = true; }

        // apply third party parameters
        var customerIdBinder = new ctx.countExecuter({
            num: 1, exec: function (queryParams) {
                route.statsMgr.appplyApiRoutes(queryParams);
                route.statsMgr.refresh_cookies();
            }
        });

        var home = homeRoute, homeMessages, searchBoxModel; frameManager.depthUrl(0, home);
        //#region sammy route [home]
        this.get(home, function () {
            var currentParams = this.params;
            frameManager.request(home, currentParams, {
                onload: function (domContext) {
                    customerIdBinder.count(1, currentParams);
                    searchBoxModel = new ctx.models.searchBoxModel();
                    var departureAirport = currentParams['dep'];
                    var arrivalAirport = currentParams['arr'];
                    var excuterContNumber = 1, departureSearchResult, arrivalSearchResult;
                    if (!!departureAirport) excuterContNumber++;
                    if (!!arrivalAirport) excuterContNumber++;
                    var searchBoxBinder = new ctx.countExecuter({
                        num: excuterContNumber,
                        exec: function () {
                            domContext.applyBindings(searchBoxModel);
                            if (!!departureSearchResult) {
                                searchBoxModel.mDeparture.Value(departureSearchResult.Code);
                                searchBoxModel.mDeparture.Text(departureSearchResult.DisplayName);
                            }
                            if (!!arrivalSearchResult) {
                                searchBoxModel.mArrival.Value(arrivalSearchResult.Code);
                                searchBoxModel.mArrival.Text(arrivalSearchResult.DisplayName);
                            }
                            // tagman
                            ctx.intercept.tagman.tagHome(searchBoxModel);
                            // localytics
                            ctx.intercept.localytics.tagOnload('Home');
                            //optimizely
                            ctx.intercept.optimizely.activateExperiments();
                        }
                    });

                    ctx.api.searchOption(function (data) {
                        searchBoxModel.initializeModel(currentParams, data);
                        searchBoxBinder.count();
                    });
                    if (!!departureAirport) {
                        ctx.api.lookupAirports({ search: departureAirport }, function (data) {
                            if (data && !data.ModelState && data.length > 0) {
                                departureSearchResult = data[0];
                            }
                            searchBoxBinder.count();
                        });
                    }
                    if (!!arrivalAirport) {
                        ctx.api.lookupAirports({ search: arrivalAirport }, function (data) {
                            if (data && !data.ModelState && data.length > 0) {
                                arrivalSearchResult = data[0];
                            }
                            searchBoxBinder.count();
                        });
                    }
                },
                oncomplete: function () {
                    if (homeMessages) {
                        searchBoxModel.mErrorMessages(homeMessages);
                        homeMessages = null;
                    }
                    //
                    var holder = frameManager.getHolder();
                    if (holder.children('aside.sidebar').is(':visible')) {
                        $('body').addClass('sidebar-active');
                        if (ctx.androidLow()) {//reset width to fix android2.3 design bug
                            holder.children('.body-container.home').width($(window).width());
                        }
                    }
                },
                ondisabled: function () {
                    var hasSidebar = $('body').hasClass('sidebar-active');
                    if (hasSidebar) { $('body').removeClass('sidebar-active'); }
                },
                ifSlideIn: function () {
                    if (this.__sidebarActive) { $('body').addClass('sidebar-active'); }
                    return !this.__sidebarActive;
                },
                ifSlideOut: function () {
                    this.__sidebarActive = $('body').hasClass('sidebar-active')
                    return !this.__sidebarActive;
                }
            });
        });
        //#endregion

        var waiting = '#/flight/waiting', waitingRotater, waitingModel; frameManager.depthUrl(1, waiting);
        //#region sammy route [waiting]
        this.get(waiting, function () {
            var currentParams = this.params;
            frameManager.request(waiting, currentParams, {
                onload: function (domContext) {
                    customerIdBinder.count(1, currentParams);
                    waitingModel = new ctx.models.waitingModel();
                    waitingModel.homeMessages.add(function (messages) {
                        homeMessages = messages;
                    });
                    waitingModel.onApiError.add(function () {
                        waitingRotater.stop();
                    });
                    homeMessages = null;
                    if (searchBoxModel) {
                        waitingModel.mDeparture.Text(searchBoxModel.mDeparture.Text());
                        waitingModel.mArrival.Text(searchBoxModel.mArrival.Text());
                    }
                    waitingModel.initializeModel(currentParams, { prev: home, next: flightResults });
                    domContext.applyBindings(waitingModel);
                    // rotater
                    waitingRotater = domContext.find('.slider').data('waitingRotater');
                    // localytics
                    ctx.intercept.localytics.tagOnload('Waiting');
                    //optimizely
                    ctx.intercept.optimizely.activateExperiments();
                },
                oncomplete: function () {
                    waitingRotater.start();
                },
                ondisabled: function () {
                    waitingRotater.stop();
                }
            });
        });
        //#endregion

        var flightResults = '#/flight/results', flightResultsModel; frameManager.depthUrl(2, flightResults);
        //#region sammy route [flightResults]
        this.get(flightResults, function () {
            var currentParams = this.params, flightScrollFunc;
            frameManager.request(flightResults, currentParams, {
                onload: function (domContext) {
                    customerIdBinder.count(1, currentParams);
                    flightResultsModel = new ctx.models.flightResultsModel();
                    var searchResultsUrl = currentParams['sru'], callback = function (data) {
                        flightResultsModel.initializeModel(currentParams, data);
                        domContext.applyBindings(flightResultsModel);
                        // tagman
                        ctx.intercept.tagman.tagResults(flightResultsModel, data);
                        // localytics
                        ctx.intercept.localytics.tagOnload('Results');
                        //optimizely
                        ctx.intercept.optimizely.activateExperiments();
                    };
                    var data = ctx.api.response.getLatest('flight_results_latest');
                    if (data) {
                        callback(data);
                    } else if (searchResultsUrl) {
                        ctx.api.flightResults(searchResultsUrl, callback);
                    } else {
                        ctx.api.createFlightResultsV2(currentParams, callback);
                    }
                },
                oncomplete: function () {
                    // scroll
                    var $flightlist = $('div.flightlist');
                    var headerFixed = false;
                    var scrollTimer = null;
                    flightScrollFunc = function () {
                        var scroller = frameManager.getScroller();
                        //apend more results     
                        if (scrollTimer) {
                            clearTimeout(scrollTimer);
                        }
                        scrollTimer = setTimeout(function () {
                            scrollTimer = null;
                            if (($(window).scrollTop() / ($(document).height() - $(window).height()) > 0.9) && $flightlist.is(':visible')) {
                                var nextPageUrl = flightResultsModel.mNextPageUrl();
                                if (nextPageUrl) {
                                    ctx.api.flightResults(nextPageUrl, flightResultsModel.appendMoreSearchResults);
                                }
                            }
                        }, 500);
                        if (scroller.scrollTop() <= 128) {
                            if (headerFixed === false) {
                                return;
                            }
                            headerFixed = false;
                            $flightlist.removeClass('fixed');
                        } else {
                            if (headerFixed === true) {
                                return;
                            }
                            headerFixed = true;
                            $flightlist.addClass('fixed');
                        }
                    };
                    // bind
                    $(window).scroll(flightScrollFunc);
                },
                ondisabled: function () {
                    // unbind
                    $(window).unbind('scroll', flightScrollFunc);
                }
            });
        });
        //#endregion

        var metaLanding = '#/metalanding', landingRotater, metaLandingModel; frameManager.depthUrl(2, metaLanding);
        //#region sammy route [metaLanding]
        var metaLandingOnload = function (domContext, currentParams, next) {
            customerIdBinder.count(1, currentParams);
            //
            metaLandingModel = new ctx.models.metaLandingModel();
            metaLandingModel.onApiError.add(function () {
                landingRotater.stop();
            });
            metaLandingModel.onCacheNotFound.add(function () {
                var lowerHref = location.href.toLowerCase(), hasGone;
                if (lowerHref.indexOf('#/metalanding') === -1) {
                    var pathIndex = lowerHref.indexOf('/metalanding');
                    if (pathIndex !== -1) {
                        // absolute the page url to refresh home
                        var path = location.href.substr(0, pathIndex);
                        routeApp.goto1(path + homeRoute);
                        hasGone = true;
                    }
                }
                if (!hasGone) {
                    routeApp.goto1(homeRoute);
                }
            });
            metaLandingModel.initializeModel(currentParams, { next: next });
            domContext.applyBindings(metaLandingModel);
            // rotater
            landingRotater = domContext.find('.slider').data('landingRotater');
            // localytics
            ctx.intercept.localytics.tagOnload('MetaLanding');
            //optimizely
            ctx.intercept.optimizely.activateExperiments();
        };
        this.get(metaLanding, function () {
            var currentParams = this.params;
            frameManager.request(metaLanding, currentParams, {
                onload: function (domContext) {
                    metaLandingOnload(domContext, currentParams, bookingDetails);
                },
                oncomplete: function () {
                    landingRotater.start();
                },
                ondisabled: function () {
                    landingRotater.stop();
                }
            });
        });
        //#endregion

        var metaLandingDom = $('#travixmob-metalanding');
        //#region page route[metaLanding]
        if (metaLandingDom.length > 0) {
            var metaParams = this._parseQueryString(location.href);
            setTimeout(function () {
                metaLandingOnload(metaLandingDom, metaParams, bookingDetails);
                landingRotater.start();
            }, 16);
        }
        //#endregion

        var bookingDetails = '#/flight/booking/details', bookingDetailsModel; frameManager.depthUrl(3, bookingDetails);
        //#region sammy route [bookingDetails]
        this.get(bookingDetails, function () {
            var currentParams = this.params;
            frameManager.request(bookingDetails, currentParams, {
                onload: function (domContext) {
                    var bookingInfoUrl = currentParams['biu'];
                    bookingDetailsModel = new ctx.models.bookingDetailsModel();
                    var flightDetailsData;
                    var bookingDetailsBinder = new ctx.countExecuter({
                        num: 2,
                        exec: function () {
                            domContext.applyBindings(bookingDetailsModel);
                            // tagman
                            ctx.intercept.tagman.tagDetails(bookingDetailsModel, flightDetailsData);
                            // localytics
                            ctx.intercept.localytics.tagOnload('BookingDetails');
                            //optimizely
                            ctx.intercept.optimizely.activateExperiments();
                        }
                    });

                    ctx.api.passengers(bookingInfoUrl, function (data) {
                        bookingDetailsModel.initializePassengers(data);
                        bookingDetailsBinder.count();
                    });
                    ctx.api.flightDetails(bookingInfoUrl, function (data) {
                        flightDetailsData = data;
                        bookingDetailsModel.initializeModel(currentParams, data);
                        bookingDetailsBinder.count();
                    });
                }
            });
        });
        //#endregion

        var ticketInsurance = '#/flight/booking/ticketinsurance', ticketInsuranceModel; frameManager.depthUrl(4, ticketInsurance); // step1
        //#region sammy route [ticketInsurance]
        this.get(ticketInsurance, function () {
            var currentParams = this.params;
            frameManager.request(ticketInsurance, currentParams, {
                onload: function (domContext) {
                    var bookingInfoUrl = currentParams['biu'];
                    ticketInsuranceModel = new ctx.models.ticketInsuranceModel();
                    ctx.api.ticketInsurance(bookingInfoUrl, function (data) {
                        ticketInsuranceModel.initializeModel(currentParams, data);
                        domContext.applyBindings(ticketInsuranceModel);
                        // tagman
                        ctx.intercept.tagman.tagTicketInsurance(data);
                        // localytics
                        ctx.intercept.localytics.tagOnload('TicketInsurance');
                        //optimizely
                        ctx.intercept.optimizely.activateExperiments();
                    });
                }
            });
        });
        //#endregion

        var passengers = '#/flight/booking/passengers', passengersModel; frameManager.depthUrl(5, passengers); // step2
        //#region sammy route [passengers]
        this.get(passengers, function () {
            var currentParams = this.params;
            frameManager.request(passengers, currentParams, {
                onload: function (domContext) {
                    var bookingInfoUrl = currentParams['biu'];
                    passengersModel = new ctx.models.passengersModel();
                    ctx.api.passengersV2(bookingInfoUrl, function (data) {
                        passengersModel.initializeModel(currentParams, data);
                        //
                        var passengersBinder = new ctx.countExecuter({
                            num: 3,
                            exec: function () {
                                domContext.applyBindings(passengersModel);
                                // tagman
                                ctx.intercept.tagman.tagPassengers(passengersModel);
                                // localytics
                                ctx.intercept.localytics.tagOnload('Passengers');
                                //optimizely
                                ctx.intercept.optimizely.activateExperiments();
                            }
                        });
                        ctx.api.mealOptions(bookingInfoUrl, function (data1) {
                            passengersModel.initializeMealOptions(data1);
                            passengersBinder.count();
                        });
                        ctx.api.seatOptions(bookingInfoUrl, function (data2) {
                            passengersModel.initializeSeatOptions(data2);
                            passengersBinder.count();
                        });
                        ctx.api.frequentAirline(bookingInfoUrl, function (data3) {
                            passengersModel.initializeFrequentFlyerOptions(data3);
                            passengersBinder.count();
                        });
                    });
                }
            });
        });
        //#endregion

        var contact = '#/flight/checkout/contact', contactModel; frameManager.depthUrl(6, contact); // step3
        //#region sammy route [contact]
        this.get(contact, function () {
            var currentParams = this.params;
            frameManager.request(contact, currentParams, {
                onload: function (domContext) {
                    //s4's background-size bug
                    if (ctx.isSamsunS4()) {
                        $('body').prepend('<div class=\'body\'></div>');
                    }
                    var bookingInfoUrl = currentParams['biu'];
                    contactModel = new ctx.models.contactModel();
                    ctx.api.contact(bookingInfoUrl, function (data1) {
                        contactModel.initializeModel(currentParams, data1);
                        //
                        var contactBinder = new ctx.countExecuter({
                            num: 2,
                            exec: function () {
                                domContext.applyBindings(contactModel);
                                // tagman
                                ctx.intercept.tagman.tagContact(contactModel);
                                // localytics
                                ctx.intercept.localytics.tagOnload('Contact');
                                //optimizely
                                ctx.intercept.optimizely.activateExperiments();
                            }
                        });
                        ctx.api.travellers(bookingInfoUrl, function (data2) {
                            contactModel.initializeTravellers(data2);
                            contactBinder.count();
                        });
                        ctx.api.countries(bookingInfoUrl, function (data3) {
                            contactModel.initializeCountries(data3);
                            contactBinder.count();
                        });
                    });
                }
            });
        });
        //#endregion

        var insurance = '#/flight/checkout/insurance', insuranceModel; frameManager.depthUrl(7, insurance); // step4
        //#region sammy route [insurance]
        this.get(insurance, function () {
            var currentParams = this.params;
            frameManager.request(insurance, currentParams, {
                onload: function (domContext) {
                    var bookingInfoUrl = currentParams['biu'];
                    insuranceModel = new ctx.models.insuranceModel();
                    var insuranceBinder = new ctx.countExecuter({
                        num: 2,
                        exec: function () {
                            domContext.applyBindings(insuranceModel);
                            // tagman
                            ctx.intercept.tagman.tagInsurance(insuranceModel);
                            // localytics
                            ctx.intercept.localytics.tagOnload('Insurance');
                            //optimizely
                            ctx.intercept.optimizely.activateExperiments();
                        }
                    });
                    ctx.api.insuranceOptions(bookingInfoUrl, function (data) {
                        insuranceModel.initializeModel(currentParams, data);
                        insuranceBinder.count();
                    });
                    ctx.api.ticketInsurance(bookingInfoUrl, function (data) {
                        insuranceModel.initializeTicketInsurance(currentParams, data);
                        insuranceBinder.count();
                    });
                }
            });
        });
        //#endregion

        var summary = '#/flight/checkout/summary', summaryModel; frameManager.depthUrl(8, summary); // step5
        //#region sammy route [summary]
        this.get(summary, function () {
            var currentParams = this.params;
            frameManager.request(summary, currentParams, {
                onload: function (domContext) {
                    var bookingInfoUrl = currentParams['biu'];
                    summaryModel = new ctx.models.summaryModel();
                    var summaryBinder = new ctx.countExecuter({
                        num: 8, exec: function () {
                            domContext.applyBindings(summaryModel);
                            // tagman
                            ctx.intercept.tagman.tagSummary(summaryModel);
                            // localytics
                            ctx.intercept.localytics.tagOnload('Summary');
                            //optimizely
                            ctx.intercept.optimizely.activateExperiments();
                        }
                    });

                    ctx.api.contact(bookingInfoUrl, function (data) {
                        summaryModel.initializeContact(data);
                        summaryBinder.count();
                        ctx.api.countries(bookingInfoUrl, function (data) {
                            summaryModel.initializeCountries(data);
                            summaryBinder.count();
                        });
                        ctx.api.travellers(bookingInfoUrl, function (data) {
                            summaryModel.initializeTravellers(data);
                            summaryBinder.count();
                        });
                    });
                    ctx.api.passengers(bookingInfoUrl, function (data) {
                        summaryModel.initializePassengers(data);
                        summaryBinder.count();
                    });


                    ctx.api.costs(bookingInfoUrl, function (data) {
                        summaryModel.initializeCosts(data);
                        summaryBinder.count();
                    });
                    ctx.api.estaMessage(bookingInfoUrl, function (data) {
                        summaryModel.initializeESTA(data);
                        summaryBinder.count();
                    });
                    ctx.api.flightDetails(bookingInfoUrl, function (data) {
                        summaryModel.initializeModel(currentParams, data);
                        summaryBinder.count();
                    });
                    ctx.api.voucherOptions(bookingInfoUrl, function (data) {
                        summaryModel.initializeVoucherOptions(data);
                        summaryBinder.count();
                    });
                }
            });
        });
        //#endregion

        var paymentOptions = '#/flight/checkout/paymentoptions', paymentOptionsModel; frameManager.depthUrl(9, paymentOptions);
        //#region sammy route [paymentOptions]
        this.get(paymentOptions, function () {
            var currentParams = this.params;
            frameManager.request(paymentOptions, currentParams, {
                onload: function (domContext) {
                    var bookingInfoUrl = currentParams['biu'];
                    paymentOptionsModel = new ctx.models.paymentOptionsModel();
                    ctx.api.paymentOptions(bookingInfoUrl, function (data) {
                        paymentOptionsModel.initializeModel(currentParams, data);
                        domContext.applyBindings(paymentOptionsModel);
                        // tagman
                        ctx.intercept.tagman.tagPaymentOptions(paymentOptionsModel);
                        // localytics
                        ctx.intercept.localytics.tagOnload('PaymentOptions');
                        //optimizely
                        ctx.intercept.optimizely.activateExperiments();
                    });
                }
            });
        });
        //#endregion

        var companyConditions = '#/flight/checkout/companyconditions', companyConditionsModel; frameManager.depthUrl(10, companyConditions);
        //#region sammy route [companyConditions]
        this.get(companyConditions, function () {
            var currentParams = this.params;
            frameManager.request(companyConditions, currentParams, {
                onload: function (domContext) {
                    var bookingInfoUrl = currentParams['biu'];
                    companyConditionsModel = new ctx.models.companyConditionsModel();
                    ctx.api.companyConditions(bookingInfoUrl, function (data) {
                        companyConditionsModel.initializeModel(currentParams, data);
                        domContext.applyBindings(companyConditionsModel);
                        // tagman
                        ctx.intercept.tagman.tagConditions(companyConditionsModel);
                        // localytics
                        ctx.intercept.localytics.tagOnload('CompanyConditions');
                        //optimizely
                        ctx.intercept.optimizely.activateExperiments();
                    });
                }
            });
        });
        //#endregion

        var payment = '#/flight/checkout/payment', paymentModel; frameManager.depthUrl(11, payment);
        //#region sammy route [payment]
        this.get(payment, function () {
            var currentParams = this.params;
            frameManager.request(payment, currentParams, {
                onload: function (domContext) {
                    var paymentInfoUrl = currentParams['piu'], bookingInfoUrl = currentParams['biu'];
                    ctx.api.indexConfirmationInfoUrl(bookingInfoUrl, function (info) {
                        // returnUrl
                        var anchorIndex = location.href.indexOf('#'), returnUrl = returnProxy;
                        returnUrl = location.href.substr(0, anchorIndex) + returnUrl;
                        returnUrl = ctx.appendQuery(returnUrl, 'biu', bookingInfoUrl);
                        returnUrl = ctx.appendQuery(returnUrl, 'ciu', info.confirmationInfoUrl);
                        var tia = currentParams['tia'];
                        if (tia) {
                            returnUrl = ctx.appendQuery(returnUrl, 'tia', tia);
                        }
                        // binding
                        paymentModel = new ctx.models.paymentModel();
                        ctx.api.paymentGateway(paymentInfoUrl, returnUrl, function (data) {
                            paymentModel.initializeModel(currentParams, data);
                            domContext.applyBindings(paymentModel);
                            // tagman
                            ctx.intercept.tagman.tagPaymentDetails(paymentModel, currentParams['piu']);
                            // localytics
                            ctx.intercept.localytics.tagOnload('Payment');
                            //optimizely
                            ctx.intercept.optimizely.activateExperiments();
                        });
                    });
                }
            });
        });
        //#endregion

        var returnProxy = '#/flight/checkout/returnproxy'; frameManager.depthUrl(12, returnProxy);
        //#region sammy route [returnProxy]
        this.get(returnProxy, function () {
            //
            var currentParams = this.params;
            try {
                var parCtx = window.parent.travixmob;
                if (parCtx && parCtx !== ctx) {
                    parCtx.routeApp.goto1(returnProxy, currentParams);
                    return;
                }
            } catch (ex) { } // catch cross domain issue
            //
            var confirmationInfoUrl = currentParams['ciu'], bookingInfoUrl = currentParams['biu'];
            ctx.api.confirmation(confirmationInfoUrl, function (data) {
                if (data.ModelState) {
                    routeApp.goto1(confirmation, currentParams);
                } else {
                    switch (data.State) {
                        case ctx.api.OrderStateEnum.OrderOk:
                        case ctx.api.OrderStateEnum.OrderNotOk:
                        case ctx.api.OrderStateEnum.PaymentFailed:
                        case ctx.api.OrderStateEnum.PaymentPending:
                            routeApp.goto1(confirmation, currentParams);
                            break;

                        case ctx.api.OrderStateEnum.OrderOpenNotPaid:
                        case ctx.api.OrderStateEnum.PaymentCancelled:
                            var tia = currentParams['tia'];
                            routeApp.goto1(paymentOptions, { 'biu': bookingInfoUrl, 'tia': tia });
                            // localytics
                            ctx.intercept.localytics.tagEvent('Return To PayemntOptions');
                            break;
                    }
                    // localytics
                    ctx.intercept.localytics.tagOnload('ReturnProxy');
                    //optimizely
                    ctx.intercept.optimizely.activateExperiments();
                }
            });
        });
        //#endregion

        var confirmation = '#/flight/checkout/confirmation', confirmationModel; frameManager.depthUrl(13, confirmation);
        //#region sammy route [confirmation]
        this.get(confirmation, function () {
            //
            var currentParams = this.params, hasToPayment = false;
            var confirmationInfoUrl = currentParams['ciu'], bookingInfoUrl = currentParams['biu'];
            //
            confirmationModel = new ctx.models.confirmationModel();
            confirmationModel.toPayment.add(function () {
                hasToPayment = true;
                routeApp.goto1(paymentOptions, { 'biu': bookingInfoUrl });
            });
            //
            ctx.api.confirmation(confirmationInfoUrl, function (data) {
                confirmationModel.initializeModel(currentParams, data);
                //
                if (!hasToPayment) {
                    frameManager.request(confirmation, currentParams, {
                        onload: function (domContext) {
                            domContext.applyBindings(confirmationModel);
                            // tagman
                            if (data.State === ctx.api.OrderStateEnum.OrderOk) {
                                ctx.intercept.tagman.tagConfirmation(confirmationModel, data);
                            }
                            // localytics
                            ctx.intercept.localytics.tagOnload('Confirmation');
                            //optimizely
                            ctx.intercept.optimizely.activateExperiments();
                        }
                    });
                }
            }, true);
        });
        //#endregion

        var about = '#/about', aboutModel; frameManager.depthUrl(100, about);
        //#region sammy route [about]
        this.get(about, function () {
            var currentParams = this.params;
            frameManager.request(about, currentParams, {
                onload: function (domContext) {
                    aboutModel = new ctx.models.aboutModel();
                    domContext.applyBindings(aboutModel);
                    // localytics
                    ctx.intercept.localytics.tagOnload('About');
                    //optimizely
                    ctx.intercept.optimizely.activateExperiments();
                }
            });
        });
        //#endregion

        var disclaimer = '#/disclaimer', disclaimerModel; frameManager.depthUrl(100, disclaimer);
        //#region sammy route [disclaimer]
        this.get(disclaimer, function () {
            var currentParams = this.params;
            frameManager.request(disclaimer, currentParams, {
                onload: function (domContext) {
                    disclaimerModel = new ctx.models.disclaimerModel();
                    domContext.applyBindings(disclaimerModel);
                    // localytics
                    ctx.intercept.localytics.tagOnload('Disclaimer');
                    //optimizely
                    ctx.intercept.optimizely.activateExperiments();
                }
            });
        });
        //#endregion

        var termsAndConditions = '#/termsandconditions', termsAndConditionsModel; frameManager.depthUrl(100, termsAndConditions);
        //#region sammy route [termsAndConditions]
        this.get(termsAndConditions, function () {
            var currentParams = this.params;
            frameManager.request(termsAndConditions, currentParams, {
                onload: function (domContext) {
                    termsAndConditionsModel = new ctx.models.termsAndConditionsModel();
                    domContext.applyBindings(termsAndConditionsModel);
                    // localytics
                    ctx.intercept.localytics.tagOnload('TermsAndConditions');
                    //optimizely
                    ctx.intercept.optimizely.activateExperiments();
                }
            });
        });
        //#endregion

        var favoriteAirports = '#/favoriteairports', favoriteAirportsModel; frameManager.depthUrl(100, favoriteAirports);
        //#region sammy route [favoriteAirports]
        this.get(favoriteAirports, function () {
            var currentParams = this.params;
            frameManager.request(favoriteAirports, currentParams, {
                onload: function (domContext) {
                    ctx.getJSON(ctx.wrapAjaxUrl('/Airport/Favorites'), function (data) {
                        favoriteAirportsModel = new ctx.models.favoriteAirportsModel();
                        favoriteAirportsModel.onChange.add(function (favorites) {
                            if (searchBoxModel) { searchBoxModel.favoitesChanged(favorites); }
                        });
                        favoriteAirportsModel.initializeModel(currentParams, data);
                        domContext.applyBindings(favoriteAirportsModel);
                        // localytics
                        ctx.intercept.localytics.tagOnload('FavoriteAirports');
                        //optimizely
                        ctx.intercept.optimizely.activateExperiments();
                    });
                },
                oncomplete: function () {
                    if (favoriteAirportsModel) {
                        favoriteAirportsModel.ShowFavorites();
                    }
                    $(window).bind('orientationchange.keypad', function () { //issue 27970
                        $('div.search input[type="text"]').blur().focus();
                    });
                }
            });
        });
        //#endregion

        var self = this, staticPages = ['#/faq', '#/setasapp', '#/language', '#/privacystatement'];
        //#region sammy route [staticPages]
        ctx.each(staticPages, function (i, page) {
            frameManager.depthUrl(100, page);
            self.get(page, function () {
                frameManager.request(page, this.params, {
                    onload: function (domContext) {
                        domContext.applyBindings(new ctx.models.emptyModel());
                        // localytics
                        ctx.intercept.localytics.tagOnload(page.substr(2));
                    }
                });
            });
        });
        //#endregion

        var error = '#/error'; frameManager.depthUrl(200, error);
        //#region sammy route [error]
        this.get(error, function () {
            var currentParams = this.params;
            frameManager.request(error, currentParams, {
                onload: function (domContext) {
                    domContext.applyBindings(new ctx.models.emptyModel());
                    // localytics
                    ctx.intercept.localytics.tagOnload('Error');
                    //optimizely
                    ctx.intercept.optimizely.activateExperiments();
                    // Analytics event
                    ctx.api.apiEvents({ EventName: ctx.api.EventNameEnum.PageNotFound }, function () { });
                }
            });
        });
        //#endregion

        var page404 = '#/404'; frameManager.depthUrl(200, page404);
        //#region sammy route [404]
        this.get('', function () {
            var currentParams = this.params;
            frameManager.request(page404, currentParams, {
                onload: function (domContext) {
                    domContext.applyBindings(new ctx.models.emptyModel());
                    // localytics
                    ctx.intercept.localytics.tagOnload('404');
                    //optimizely
                    ctx.intercept.optimizely.activateExperiments();
                    // Analytics event
                    ctx.api.apiEvents({ EventName: ctx.api.EventNameEnum.PageNotFound }, function () { });
                }
            });
        });
        //#endregion
    });

    //#endregion

    //#region customize route api

    routeApp.goto1 = function (url, params) {
        var href = ctx.appendQuery(url, params);
        var cid = ctx.api.getCustomerId();
        if (cid && !/[?&]cid=/.test(href)) {
            href += ((href + '').indexOf('?') > -1) ? '' : '?';
            href += (/\?$/.test(href)) ? '' : '&';
            href += 'cid=' + cid;
        }
        setTimeout(function () {
            window.location.href = href;
        }, 0);
    };

    routeApp.index = function (offset) {
        var f = frameManager.frame(offset);
        if (f) { routeApp.goto1(f.url, f.params); }
        return !!f;
    };

    routeApp.prev = function () {
        return routeApp.index(-1);
    };

    routeApp.next = function () {
        return routeApp.index(1);
    };

    routeApp.has = function (offset) {
        return !!frameManager.frame(offset);
    };

    routeApp.mark = function (obj) {
        frameManager.mark(obj);
    };

    // register
    ctx.routeApp = routeApp;

    //#endregion

    //#region fire global bootstrap

    function isTouchDevice() {
        try {
            document.createEvent('TouchEvent');
            return true;
        } catch (e) {
            return false;
        }
    }

    function touchScroll(el) {
        if (isTouchDevice()) {
            var touchstartY = 0;
            el.addEventListener('touchstart', function (ev) {
                touchstartY = this.scrollTop + ev.touches[0].pageY;
                ev.preventDefault();
            }, false);
            el.addEventListener('touchmove', function (ev) {
                this.scrollTop = touchstartY - ev.touches[0].pageY;
                ev.preventDefault();
            }, false);
        }
    }

    var initializeLoading = function () {
        ctx.frameLoading.unit(ctx.createLoadingUnit('body'));
        if ($.browser.msie || ctx.androidLow()) {
            ctx.frameLoading.unit().content.addClass('frame-loading-content-bg');
        } else {
            var css3 = [];
            css3.push('<div class="spinner">');
            css3.push('<div class="bar1"></div>');
            css3.push('<div class="bar2"></div>');
            css3.push('<div class="bar3"></div>');
            css3.push('<div class="bar4"></div>');
            css3.push('<div class="bar5"></div>');
            css3.push('<div class="bar6"></div>');
            css3.push('<div class="bar7"></div>');
            css3.push('<div class="bar8"></div>');
            css3.push('<div class="bar9"></div>');
            css3.push('<div class="bar10"></div>');
            css3.push('<div class="bar11"></div>');
            css3.push('<div class="bar12"></div>');
            css3.push('</div>');
            ctx.frameLoading.unit().content.html(css3.join(''));
        }
        //
        ctx.globalAjaxPool.onChange.add(function (t) {
            if (t === 'abort') {
                ctx.frameLoading.reset(16);
            }
        });
    };

    ctx.bootstrap(function () {
        //
        initializeLoading();
        //
        frameManager.initialize();
        //touchScroll($('.frame-holder').get(0));
        //
        var current = getPageUrl('current'), startup = getPageUrl('startup');
        if (current && startup && current === startup) {
            routeApp.run(homeRoute);
        } else {
            var page = current.replace(startup, '');
            routeApp.goto1(startup + '#' + page);
        }
    });

    if (route.scriptInBody) {
        ctx.bootstrap(); // case place script in body
    } else {
        $(ctx.bootstrap); // case place script in head
    }

    //#endregion

}(jQuery, travixmob));
