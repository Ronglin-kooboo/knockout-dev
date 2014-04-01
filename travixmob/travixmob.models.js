/*
* models
*/

(function ($, ctx) {

    // namespance
    var models = ctx.models = {};

    //#region knockout model [base]
    ctx.koValidator.addMethod('words', function (obs) { return /^\w+$/.test(obs()); }, 'This field is invalid.');
    ctx.koValidator.addMethod('wordsOrEmpty', function (obs) { return /^\w*$/.test(obs()); }, 'This field is invalid.');
    ctx.koValidator.addMethod('email', function (obs) { return /^[a-zA-Z0-9_+.-]+\@([a-zA-Z0-9-]+\.)+[a-zA-Z0-9]{2,4}$/.test(obs()); }, 'This field is invalid.');
    ctx.koValidator.addMethod('number', function (obs) { return /^(\d)+$/.test(obs()); }, 'This field is must be number.');
    ctx.koValidator.addMethod('phonenum', function (obs) { return /^(\+\d+\s?)?\d+$/.test(obs()); }, 'This field is invalid.');
    ctx.koValidator.addMethod('required', function (obs) { return ((obs() || '') + '').length > 0; }, 'This field is required.');
    ctx.koValidator.addMethod('required3len', function (obs) { return ((obs() || '') + '').length === 3; }, 'This field is required.');

    var ComboModel = function () {
        var self = this;
        this.Text = ko.observable('');
        this.Value = ko.observable('');
        this.errorMessages = function () {
            var messages = [];
            if (self.Text.hasMethod()) { messages = messages.concat(self.Text.errorMessages()); }
            if (self.Value.hasMethod()) { messages = messages.concat(self.Value.errorMessages()); }
            return messages;
        };
    };

    var getModelStateMessages = function (data) {
        var messages = [];
        ctx.each(data.ModelState, function (key, item) {
            ctx.each(item, function (idx, mesg) {
                messages.push(mesg);
            });
        });
        return messages;
    };

    var fireInvalidActions = function (data, find) {
        ctx.each(data.ModelState, function (key) {
            var name = key.split('.').pop();
            if (name) {
                var obs = find.call(this, name, key);
                if (obs) { obs.fireValidActions(false); }
            }
        });
    };

    var splitCityName = function (title) {
        var sepIndex = (title || '').indexOf(',');
        if (sepIndex > -1) { return title.split(',')[0]; }
    };

    var scrollKit = {
        instance: null,
        preventDefault: function (ev) {
            ev.preventDefault();
        },
        initalize: function (el) {
            setTimeout(function () {
                scrollKit.instance = ctx.iscroll(el, {});
            }, 10);
            $(document).bind('touchmove.popup', this.preventDefault);
        },
        update: function () {
            if (this.instance) {
                setTimeout(function () {
                    scrollKit.instance.refresh();
                }, 100)
            }
        },
        destroy: function () {
            if (this.instance) { this.instance.destroy(); }
            $(document).unbind('touchmove.popup', this.preventDefault);
            this.instance = null;
        }
    };

    var passengersBackFunc;
    var popupKit = models.popupKit = {
        showCore: function (target, setting) {
            var targetBox = $(target), set = setting || {};
            var iscroll = targetBox.find('div[iscroll="true"]').parent();
            $.fancybox.open({
                autoCenter: true,
                content: targetBox,
                title: targetBox.attr('title'),
                helpers: { title: { type: 'outside' } },
                margin: 24, padding: set.padding ? set.padding : [102, 0, 0, 0],
                closeBtn: (targetBox.attr('closeBtn') !== 'false'),
                beforeShow: function () {
                    if (set.autoScroll !== false) {
                        if (iscroll.length === 1) {
                            scrollKit.initalize(iscroll);
                        } else {
                            scrollKit.initalize($('.fancybox-inner'));
                        }
                    }
                    if (ctx.androidLow()) {//issue 27729
                        $('div.body-container :input').addClass('disabled').attr('disabled', 'disabled');
                        $('body').data('oldTop', $(document).scrollTop());
                        $(document).scrollTop(0);
                    }
                },
                afterShow: function () {
                    //
                    var closeCls = targetBox.attr('addcloseclass');
                    if (closeCls) { $('.fancybox-close').addClass(closeCls); }
                    //
                    if (set.autoScroll !== false) {
                        if (iscroll.length === 1) {
                            iscroll.css('overflow', 'hidden');
                        } else {
                            $('.fancybox-inner').css('overflow', 'hidden');
                        }
                        scrollKit.update();
                    }
                },
                beforeClose: function () {
                    if (set.beforeClose) {
                        var args = ctx.arg2arr(arguments);
                        return set.beforeClose.apply(this, args);
                    }
                },
                afterClose: function () {
                    $('.fancybox-overlay').remove();
                    if (set.autoScroll !== false) {
                        scrollKit.destroy();
                    }
                    if (ctx.androidLow()) {
                        $('div.body-container :input.disabled').removeAttr('disabled');
                        $(document).scrollTop($('body').data('oldTop'));
                    }
                },
                onUpdate: function () {
                    if (set.autoScroll !== false) {
                        scrollKit.update();
                    }
                }
            });
            var titleCls = targetBox.attr('addtitleclass');
            if (titleCls) { $('.fancybox-title-outside-wrap').addClass(titleCls); }
        },
        show: function () {
            var btn = $(arguments[1].currentTarget);
            popupKit.showCore(btn.attr('data-target'));
        },
        close: function () {
            passengersBackFunc = null;
            try { $.fancybox.close(true); }
            catch (ex) {
                try { $.fancybox.close(false); }
                catch (ex) { }
            }
        },
        update: function () {
            $.fancybox.update();
        }
    };

    $(window).bind('resize', popupKit.update);

    //#endregion

    //#region knockout model [empty]

    models.emptyModel = function () { };

    //#endregion

    //#region knockout model [about]

    models.aboutModel = function () {
        this.mFacebookLike = function () {
            // localytics
            ctx.intercept.localytics.tagEvent('Facebook Liked');
            // bubble
            return true;
        };
    };
    //#endregion

    //#region knockout model [disclaimer]

    models.disclaimerModel = function () {
        this.mPrev = function () {
            if (ctx.routeApp.has(-1)) {
                ctx.routeApp.prev();
            } else {
                return true;
            }
        };
    };
    //#endregion

    //#region knockout model [termsAndConditions]

    models.termsAndConditionsModel = function () {
        this.mPrev = function () {
            if (ctx.routeApp.has(-1)) {
                ctx.routeApp.prev();
            } else {
                return true;
            }
        };
    };
    //#endregion

    //#region knockout model [favoriteAirports]

    var AirportModel = function () {
        var self = this;
        this.Code = ko.observable('');
        this.DisplayName = ko.observable('');
        this.CountryCode = ko.observable('');
        this.initializeModel = function (data) {
            if (!data) { return; }
            self.Code(data.Code);
            self.DisplayName(data.DisplayName);
            self.CountryCode(data.CountryCode);
        };
    };

    models.favoriteAirportsModel = function () {
        var self = this;
        // field
        this.Favorites = null;
        this.Airports = null;
        this.ShowAirports = ko.observable(true);
        // other
        this.onChange = new ctx.dispatcher(this);
        this.mErrorMessages = ko.observableArray([]);
        this.mHasError = ko.computed(function () { return self.mErrorMessages().length > 0; });
        // init
        var currentParams, currentKey;
        this.initializeModel = function (params, data) {
            currentParams = params;
            currentKey = getUniqueKey();
            for (var i = 0; i < data.Favorites.length; i++)
            { data.Favorites[i].IsFavorite = true; }
            self.Favorites = ko.mapping.fromJS(data.Favorites);
            self.Airports = ko.mapping.fromJS(data.Favorites);
            self.onChange.dispatch(self.Favorites);
        };

        this.ShowFavorites = function (doNotReset) {
            if (doNotReset !== 'yes') { self.mAirportSearchValue(''); }
            self.Airports([]); // clear first
            self.Airports(self.Favorites());
            self.ShowAirports(true);
        };

        this.SelectAirport = function (airport) {
            var callback = function () {
                self.onChange.dispatch(self.Favorites);
            }
            if (airport.IsFavorite()) {
                deleteFavorite(airport, callback);
            } else {
                addFavorite(airport, callback);
            }
        };

        this.mAirportSearchValue = ko.observable('');
        this.mAirportSearchValue.subscribe(function (val) {
            if (val && val.length >= 3) {
                ctx.api.lookupAirports({ search: val }, function (data) {
                    if (data && !data.ModelState) {
                        var airports = [], item, applyData = data.Airports || data;
                        for (var i = 0, len = applyData.length; i < len; i++) {
                            airports.push(item = new AirportModel());
                            item.initializeModel(applyData[i]);
                            item.IsFavorite = ko.observable(isFavorite(applyData[i]));
                        }
                        self.Airports(airports);
                        self.ShowAirports(airports.length > 0);
                    }
                });
            } else {
                self.ShowFavorites('yes');
            }
        });

        //#region helpers
        function addFavorite(airport, callback) {
            var postData = ko.mapping.toJS(airport); postData.Key = currentKey;
            ctx.postJSON(ctx.wrapAjaxUrl('/Airport/AddFavorite'), postData, function (data) {
                self.Favorites.unshift(airport);
                airport.IsFavorite(true);
                callback && callback();
                // localytics
                ctx.intercept.localytics.tagEvent('Airport Favoured');
            });
        }

        function deleteFavorite(airport, callback) {
            var postData = ko.mapping.toJS(airport); postData.Key = currentKey;
            ctx.postJSON(ctx.wrapAjaxUrl('/Airport/DeleteFavorite'), postData, function (data) {
                airport.IsFavorite(false);
                self.Favorites.remove(function (item) {
                    return item.Code() === airport.Code();
                });
                callback && callback();
                // localytics
                ctx.intercept.localytics.tagEvent('Airport Disfavoured');
            });
        }

        function isFavorite(airport) {
            var favorites = self.Favorites();
            for (var i = 0; i < favorites.length; i++) {
                var item = favorites[i];
                if (item.Code() === airport.Code) {
                    return true;
                }
            }
            return false;
        }

        function getUniqueKey() {
            var key = $.cookie('FavoriteAirportKey');
            if (!key) {
                key = ctx.guid();
                $.cookie('FavoriteAirportKey', key, {
                    expires: 365
                });
            }
            return key;
        }
        //#endregion
    };

    //#endregion

    //#region knockout model [searchBox]

    models.searchBoxModel = function () {
        var self = this;
        // fields
        this.mDeparture = new ComboModel();
        this.mArrival = new ComboModel();
        this.mTripType = new ComboModel();
        this.mFlightClass = new ComboModel();
        this.mDepartureDate = ko.observable('');
        this.mReturnDate = ko.observable('');
        this.mAdults = ko.observable(1);
        this.mChildren = ko.observable(0);
        this.mInfants = ko.observable(0);
        // other
        this.mIsReturnTrip = ko.computed(function () { return this.mTripType.Value() === '0'; }, this);
        this.mErrorMessages = ko.observableArray([]);
        this.mHasError = ko.computed(function () { return self.mErrorMessages().length > 0; });
        this.mDepartureDateSelected = ko.observable(false);
        this.mDepartureDateSelected.subscribe(function () {
            self.mDepartureDate.errorMessages(true);
        });
        this.mReturnDateSelected = ko.observable(false);
        this.mReturnDateSelected.subscribe(function () {
            self.mReturnDate.errorMessages(true);
        });
        this.mDepartureDate.addMethod('requiredDate', function () {
            return self.mDepartureDateSelected();
        });
        this.mReturnDate.addMethod('requiredDate', function () {
            return self.mReturnDateSelected();
        });
        // init
        var currentParams;
        this.initializeModel = function (params, data) {
            currentParams = params;
            if (data.ModelState) {
                self.mErrorMessages(getModelStateMessages(data));
            } else {
                var mappedModel = ko.mapping.fromJS(data);
                $.extend(self, mappedModel);
            }
        };
        this.initializeFavoriteAirports = function (data) {
            if (data && data.Favorites) {
                self.mFavoriteAirports(data.Favorites);
                if (data.Favorites.length > 0) {
                    self.mDefaultFavorite(data.Favorites[0].DisplayName);
                } else {
                    self.mDefaultFavorite('');
                }
            }
        };
        this.favoitesChanged = function (favorites) {
            favorites = ko.mapping.toJS(favorites || []);
            self.initializeFavoriteAirports({ Favorites: favorites });
        };
        // fix issue: #26813
        setTimeout(function () {
            self.mDepartureDate.subscribe(function (val) {
                // issue 28634
                if (!self.mReturnDateSelected()) {
                    var d = ctx.parseDateStr(val);
                    if (d) {
                        d.setUTCDate(d.getUTCDate() + 1);
                        var year = d.getUTCFullYear(), month = d.getUTCMonth() + 1, day = d.getUTCDate();
                        self.mReturnDate(year + ctx.padLeft(month, 2, '0') + ctx.padLeft(day, 2, '0'));
                    }
                }
            });
        }, 128);

        // search airport
        var airportSearchCallback = function () { };
        this.mAirportSearchValue = ko.observable('');
        this.mDefaultFavorite = ko.observable('');
        this.mFavoriteAirports = ko.observableArray([]);
        this.mShowFavoriteAirports = ko.computed(function () { return self.mFavoriteAirports().length > 0; });
        this.mNearestAirports = ko.observableArray([]);
        this.mShowNearestAirports = ko.computed(function () { return self.mNearestAirports().length > 0; });
        this.mAirports = ko.observableArray([]);
        this.mShowAirports = ko.observable(true);
        this.mSelectAirportProxy = function (index) {
            return function () {
                var item = self.mAirports()[index];
                airportSearchCallback(item.Code, item.DisplayName);
                self.mHideAirportSearch();
            };
        };
        this.mSelectFavoriteAirportProxy = function (index) {
            return function () {
                var item = self.mFavoriteAirports()[index];
                airportSearchCallback(item.Code, item.DisplayName);
                self.mHideAirportSearch();
            };
        };
        this.mSelectNearestAirportProxy = function (index) {
            return function () {
                var item = self.mNearestAirports()[index];
                airportSearchCallback(item.Code, item.DisplayName);
                self.mHideAirportSearch();
            };
        };
        this.mAirportSearchValue.subscribe(function (val) {
            if (val && val.length >= 3) {
                var scroller = ctx.frameManager.getScroller();
                ctx.api.lookupAirports({ search: val }, function (data) {
                    if (data && !data.ModelState) {
                        var applyData = data.Airports || data;
                        self.mAirports(applyData);
                        self.mShowAirports(applyData.length > 0);
                        scroller.scrollTop(0);
                    }
                });
            } else if (!val) {
                self.mAirports([]);
                self.mShowAirports(true);
            } else {
                self.mAirports([]);
            }
        });
        this.mClearAirportSearchValue = function () {
            self.mAirportSearchValue('');
            self.mShowAirports(true);
        };
        var showAirportSearch = function () {
            var holder = ctx.frameManager.getHolder();
            var scroller = ctx.frameManager.getScroller();
            var airportSearch = holder.children('.body-container.airportsearch');
            airportSearch.frameSlide({
                from: -1, to: 0,
                beforeStart: function () {
                    airportSearch.show();
                    this.data('oldScrollTop', scroller.scrollTop());
                },
                beforeAnimate: function () {
                    $(this).find('input[type="text"]').focus(); // focus to call the keypad
                },
                complete: function () {
                    scroller.scrollTop(0);
                    holder.children('.body-container.home').hide();
                    $(window).bind('orientationchange.keypad', function () { //issue 27970
                        $('div.search input[type="text"]').blur().focus();
                    });
                }
            });
            if (!self.__favoritesLoaded) {
                self.__favoritesLoaded = true;
                ctx.frameLoading.hide();
                ctx.getJSON(ctx.wrapAjaxUrl('/Airport/Favorites'), function (data) {
                    ctx.frameLoading.show();
                    self.initializeFavoriteAirports(data);
                });
                //issue 28020
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(function (position) {
                        ctx.frameLoading.hide();
                        ctx.api.geoAirports({ lat: position.coords.latitude, lng: position.coords.longitude }, function (data) {
                            ctx.frameLoading.show();
                            if (data && !data.ModelState) {
                                var applyData = data.Airports || data;
                                self.mNearestAirports([applyData]);
                            }
                        });
                    }, null);
                }
            }
        };
        this.mHideAirportSearch = function () {
            var holder = ctx.frameManager.getHolder();
            var scroller = ctx.frameManager.getScroller();
            var airportSearch = holder.children('.body-container.airportsearch');
            airportSearch.frameSlide({
                from: 0, to: -1,
                beforeStart: function () {
                    holder.children('.body-container.home').show();
                    scroller.scrollTop(this.data('oldScrollTop'));
                },
                complete: function () {
                    airportSearch.hide();
                    $(window).unbind('orientationchange.keypad');
                }
            });
        };
        this.mShowDepartureAirportSearch = function () {
            self.mAirportSearchValue(self.mDeparture.Value());
            airportSearchCallback = function (code, name) {
                self.mDeparture.Value(code);
                self.mDeparture.Text(name);
                // localytics
                ctx.intercept.localytics.tagEvent('Departure Airport Selected');
            };
            showAirportSearch();
            // localytics
            ctx.intercept.localytics.tagEvent('Departure Airport Opened');
        };
        this.mShowArrivalAirportSearch = function () {
            self.mAirportSearchValue(self.mArrival.Value());
            airportSearchCallback = function (code, name) {
                self.mArrival.Value(code);
                self.mArrival.Text(name);
                // localytics
                ctx.intercept.localytics.tagEvent('Arrival Airport Selected');
            };
            showAirportSearch();
            // localytics
            ctx.intercept.localytics.tagEvent('Arrival Airport Opened');
        };

        // sidebar
        this.mShowSidebar = function () {
            var holder = ctx.frameManager.getHolder();
            var scroller = ctx.frameManager.getScroller();
            var container = holder.children('.body-container.home').frameSlide({
                from: 0, to: 0.879, autoDisplay: false,
                beforeStart: function () {
                    scroller.scrollTop(0);
                    holder.children('.sidebar').show();
                },
                complete: function () {
                    if (ctx.androidLow()) {
                        $('body').addClass('sidebar-active');
                        //$('body select').hide();
                        //container.width($(window).width());
                        if ($('#wrapper-setting').length == 0) {
                            $('div.for_gradient').wrap('<div id="wrapper-setting" class="wrapper">').wrap('<div class="scroller">');
                            ctx.iscroll('#wrapper-setting', { vScrollbar: false });
                        }
                    } else {
                        //container.width($(window).width());
                        $('body').addClass('sidebar-active');
                    }
                    // localytics
                    ctx.intercept.localytics.tagEvent('Sidebar Opened');
                }
            });
        };
        this.mHideSidebar = function () {
            var holder = ctx.frameManager.getHolder();
            var scroller = ctx.frameManager.getScroller();
            var container = holder.children('.body-container.home').frameSlide({
                from: 0.879, to: 0, autoDisplay: false,
                beforeStart: function () {
                    $('body').removeClass('sidebar-active');
                    if (ctx.androidLow()) {
                        $('body select').show();
                    }
                },
                complete: function () {
                    scroller.scrollTop(0);
                    holder.children('.sidebar').hide();
                    // localytics
                    ctx.intercept.localytics.tagEvent('Sidebar Closed');
                }
            });
        };

        this.mChildren.addMethod('maxcombine', function (obs) {
            return obs() + self.mAdults() <= 6;
        });
        this.mInfants.addMethod('infantslimit', function (obs) {
            return obs() <= self.mAdults();
        });
        this.mArrival.Value.addMethod('notsame', function (obs) {
            var arr = obs(), dep = self.mDeparture.Value();
            if (arr && dep) { return arr != dep; }
            return true;
        });
        this.mReturnDate.addMethod('lageOrEqual', function (obs) {
            var retDate = ctx.parseDateStr(obs());
            if (retDate) {
                var depDate = ctx.parseDateStr(self.mDepartureDate());
                if (depDate) { return depDate <= retDate; }
            }
            return false;
        });
        var isValid = function () {
            var messages = [], oneway = !self.mIsReturnTrip();
            ctx.each(self, function (key, obj) {
                if ((obj.hasMethod && obj.hasMethod()) || (obj instanceof ComboModel)) {
                    if (key === 'mReturnDate' && oneway) { return; }
                    messages = messages.concat(obj.errorMessages());
                }
            });
            self.mErrorMessages(messages);
            return !self.mHasError();
        };

        this.mSubmitHanlder = function () {
            // valid
            if (!isValid()) { return; }
            //
            var params = $.extend({}, currentParams);
            ctx.each(ctx.api.anyFlightSearchLinks(), function () {
                ctx.each(this.data, function () {
                    delete params[this.name.toLowerCase()];
                });
            });
            //
            var query = $(arguments[1].currentTarget).attr('data-href');
            params['out0_dep'] = self.mDeparture.Value();
            params['out0_date'] = self.mDepartureDate();
            params['out0_arr'] = self.mArrival.Value();
            if (self.mIsReturnTrip()) { params['in0_date'] = self.mReturnDate(); }
            params['adt'] = self.mAdults();
            params['chd'] = self.mChildren();
            params['inf'] = self.mInfants();
            params['cls'] = self.mFlightClass.Value();
            //params['oneway'] = self.mTripType.Value();
            //params['rid'] = ctx.unique(8);

            params['pagesize'] = 10;
            ctx.routeApp.goto1(query, params);

            // localytics
            ctx.intercept.localytics.tagEvent('Flight Searched');
        };
    };
    //#endregion

    //#region knockout model [waiting]

    models.waitingModel = function () {
        var self = this;
        // fields
        this.mDeparture = new ComboModel();
        this.mArrival = new ComboModel();
        this.mDepartureDate = ko.observable('');
        this.mReturnDate = ko.observable('');
        // others
        this.mIsReturnTrip = ko.observable(false);
        this.mErrorMessages = ko.observableArray([]);
        this.mHasError = ko.computed(function () { return self.mErrorMessages().length > 0; });
        // init
        this.initializeModel = function (params, set) {
            self.mDeparture.Value(params['out0_dep']);
            self.mArrival.Value(params['out0_arr']);
            self.mDepartureDate(params['out0_date']);
            self.mReturnDate(params['in0_date']);
            self.mIsReturnTrip(!!params['in0_date']);
            // query
            var nextUrl = set.next, prevUrl = set.prev;
            ctx.frameLoading.hide();
            ctx.api.createFlightResultsV2(params, function (data) {
                ctx.frameLoading.show();
                //
                if (data.ModelState) {
                    self.onApiError.dispatch();
                    self.mErrorMessages(getModelStateMessages(data));
                } else {
                    var useResultUrl = false;
                    if (useResultUrl) {
                        var flightResultsUrl = ctx.api.indexFlightsResultUrl(data);
                        if (flightResultsUrl && ctx.api.hasFlightsResult(data)) {
                            ctx.routeApp.goto1(nextUrl, { 'sru': flightResultsUrl });
                        } else {
                            self.homeMessages.dispatch([ctx.i18n.get('noSearchResultMessage')]);
                            ctx.routeApp.mark({ ret: true });
                            ctx.routeApp.goto1(prevUrl);
                        }
                    } else {
                        ctx.routeApp.goto1(nextUrl, params);
                    }
                }
            });
        };
        // event
        this.onApiError = new ctx.dispatcher(this);
        this.homeMessages = new ctx.dispatcher(this);
        //
        this.mDepartureTitle = ko.computed(function () {
            var title = splitCityName(self.mDeparture.Text());
            if (!title) { title = self.mDeparture.Value(); }
            return title;
        });
        this.mArrivalTitle = ko.computed(function () {
            var title = splitCityName(self.mArrival.Text());
            if (!title) { title = self.mArrival.Value(); }
            return title;
        });
    };
    //#endregion

    //#region knockout model [flightResults]

    var applyTimeFilterBinding = function (nodeId, model) {
        var node = $('#' + nodeId);
        if (node.length > 0) {
            ko.cleanNode(node[0]);
            ko.applyBindings(model, node[0]);
        }
    }, applyOutboundFilter = function (model) {
        applyTimeFilterBinding('search_result_filter_OutboundFilter', model);
    }, applyInoundFilter = function (model) {
        applyTimeFilterBinding('search_result_filter_InboundFilter', model);
    };

    var stopsValues = ['0', '1', '2'], copyStopsValues = function () {
        return Array.prototype.slice.call(stopsValues, 0);
    };

    var FilterModel = function () {
        var self = this;
        this.mHasMoreAirlineOptions = ko.observable(false).extend({ trackChange: true });
        this.mFlightStops = ko.observableArray(copyStopsValues()).extend({ trackChange: true });
        this.mFlightStops.subscribe(function (vals) {
            var result = true;
            ctx.each(vals, function (idx, val) {
                if (parseInt(val, 10) > 0) {
                    result = false;
                    return false;
                }
            });
            self.Filter1OrMoreStopFlights(result);
        });
        // fields
        this.Has1OrMoreStopFlights = ko.observable(false).extend({ trackChange: true });
        this.Filter1OrMoreStopFlights = ko.observable(false).extend({ trackChange: true });
        this.Filter1OrMoreStopFlightsInitialValue = false;
        this.Filter1OrMoreStopFlights.subscribe(function () {
            self.Filter1OrMoreStopFlights.hasChanged(self.Filter1OrMoreStopFlightsInitialValue != self.Filter1OrMoreStopFlights());
        });
        this.Filter1OrMoreStopFlightsStr = ko.observable('false');
        this.Filter1OrMoreStopFlightsStr.subscribe(function (val) {
            self.Filter1OrMoreStopFlights(val === 'true');
        });
        this.AirlineOptions = ko.observableArray([]).extend({ trackChange: true });
        this.AirlineOptionsInitialValue = [];
        this.AirlineOptionsEnable = ko.observable(false).extend({ trackChange: true });
        this.OutboundFilter = null;
        this.OutboundFilterEnable = ko.observable(false).extend({ trackChange: true });
        this.InboundFilter = null;
        this.InboundFilterEnable = ko.observable(false).extend({ trackChange: true });

        this.mWindowOrientation = ko.observable(null);
        this.mWindowOrientation.subscribe(function (newValue) {
            var orientationAbsoluteValue = Math.abs(newValue);
            var $nav = ctx.frameManager.getHolder().children('.body-container.listfilter').find("nav.nav").eq(0);
            if (orientationAbsoluteValue == 90) {
                var $ul = $nav.children().eq(0);
                setTimeout(function () {
                    if ($ul.height() + 120 >= $(window).height()) {//portrait on low resolution device
                        $nav.css("padding-top", "0");
                    }
                }, 500);
            }
            else {
                $nav.css("padding-top", "120px");
            }
        });
        // init
        var currentIndex = 0, firstShowNumber = 5;
        this.initializeModel = function (data, apply) {
            self.AirlineOptionsEnable(false);
            if (data.AirlineOptions) {
                // extend property
                ctx.each(data.AirlineOptions, function () { this.Visible = false; });
                //
                var totalCount = data.AirlineOptions.length;
                var allAirlines = ko.mapping.fromJS(data.AirlineOptions)();
                //
                self.AirlineOptions(allAirlines);
                self.AirlineOptionsEnable(totalCount > 0);
                self.mHasMoreAirlineOptions(totalCount > firstShowNumber);
                //
                currentIndex = totalCount > firstShowNumber ? firstShowNumber : totalCount;
                for (var i = 0; i < currentIndex; i++) {
                    allAirlines[i].Visible(true);
                }
            }
            //
            self.Has1OrMoreStopFlights(!!data.Has1OrMoreStopFlights);
            self.Filter1OrMoreStopFlights(!!data.Filter1OrMoreStopFlights);
            self.Filter1OrMoreStopFlightsStr(String(data.Filter1OrMoreStopFlights));
            // outbound
            self.OutboundFilter = ko.mapping.fromJS(data.OutboundFilter);
            //#27994
            self.InitialInboundStartDepartureTime = null;
            self.InitialInboundEndDepartureTime = null;
            self.OutboundFilterEnable(false);
            if (data.OutboundFilter &&
                ctx.isDateValid(ctx.parseDateStr(data.OutboundFilter.MinimalDepartureTime)) && ctx.isDateValid(ctx.parseDateStr(data.OutboundFilter.MaximalDepartureTime)) &&
                ctx.isDateValid(ctx.parseDateStr(data.OutboundFilter.FilterStartDepartureTime)) && ctx.isDateValid(ctx.parseDateStr(data.OutboundFilter.FilterEndDepartureTime))) {
                self.OutboundFilterEnable(true);
            }
            if (apply === true) {
                applyOutboundFilter(self.OutboundFilter);
            }
            // inbound
            self.InboundFilter = ko.mapping.fromJS(data.InboundFilter);
            //#27994
            self.InitialOutboundStartDepartureTime = null;
            self.InitialOutboundEndDepartureTime = null;
            self.InboundFilterEnable(false);
            if (data.InboundFilter &&
                ctx.isDateValid(ctx.parseDateStr(data.InboundFilter.MinimalDepartureTime)) && ctx.isDateValid(ctx.parseDateStr(data.InboundFilter.MaximalDepartureTime)) &&
                ctx.isDateValid(ctx.parseDateStr(data.InboundFilter.FilterStartDepartureTime)) && ctx.isDateValid(ctx.parseDateStr(data.InboundFilter.FilterEndDepartureTime))) {
                self.InboundFilterEnable(true);
            }
            if (apply === true) {
                applyInoundFilter(self.InboundFilter);
            }
            self.mWindowOrientation(null);
        };

        // make at least 1 airline selected
        this.AirlineOptions.subscribe(function (arr) {
            ctx.each(arr, function () {
                if (this.Selected._has_subscribe !== true) {
                    this.Selected._has_subscribe = true;
                    this.Selected.subscribe(function () {
                        var allUnselected = true;
                        ctx.each(self.AirlineOptions(), function () {
                            if (!this.Visible()) { return false; }
                            allUnselected = (allUnselected && !this.Selected());
                        });
                        if (allUnselected) {
                            var obs = this;
                            setTimeout(function () {
                                obs.target(true);
                            }, 16);
                        }
                        var airlineOptionsChanged = false;
                        var currentAirlineOptions = self.AirlineOptions();
                        for (var i = 0; i < currentAirlineOptions.length; i++) {
                            if (currentAirlineOptions[i].Selected() != self.AirlineOptionsInitialValue[i]) {
                                airlineOptionsChanged = true;
                                break;
                            }
                        }
                        self.AirlineOptions.hasChanged(airlineOptionsChanged);
                    });

                }
            });
        });

        this.mShowMoreAirports = function (num) {
            var allAirlines = self.AirlineOptions();
            if (allAirlines) {
                var newAirlines = allAirlines.slice(currentIndex, currentIndex + num);
                if (newAirlines.length > 0) {
                    currentIndex += newAirlines.length;
                    var idx = -1, done = function () {
                        if (currentIndex === allAirlines.length) {
                            self.mHasMoreAirlineOptions(false);
                        }
                    }, func = function () {
                        setTimeout(function () {
                            newAirlines[++idx].Visible(true);
                            if (newAirlines[idx + 1]) {
                                func();
                            } else {
                                done();
                            }
                        }, 256);
                    };
                    func();
                }
            }
        };

        this.mHasFilter = function () {
            return self.OutboundFilterEnable() ||
                   self.InboundFilterEnable() ||
                   self.Has1OrMoreStopFlights() ||
                   self.AirlineOptionsEnable();
        };
        this.mHasChanged = function () {
            for (key in self) {
                if (self.hasOwnProperty(key) && ko.isObservable(self[key])
                    && typeof self[key].hasChanged === 'function' && self[key].hasChanged()) {
                    self[key].hasChanged(false);
                    return true;
                }
            }
            if (self.OutboundFilter.FilterStartDepartureTime() != self.InitialOutboundStartDepartureTime
                    || self.OutboundFilter.FilterEndDepartureTime() != self.InitialOutboundEndDepartureTime
                    || self.InboundFilter.FilterStartDepartureTime() != self.InitialInboundStartDepartureTime
                    || self.InboundFilter.FilterEndDepartureTime() != self.InitialInboundEndDepartureTime) {
                return true;
            }
            return false;
        };
        this.mRestoreChangeTrack = function () {
            for (key in self) {
                if (self.hasOwnProperty(key) && ko.isObservable(self[key])
                    && typeof self[key].hasChanged === 'function' && self[key].hasChanged()) {
                    self[key].hasChanged(false);
                }
            }
            //outbound
            self.InitialOutboundStartDepartureTime = self.OutboundFilter.FilterStartDepartureTime();
            self.InitialOutboundEndDepartureTime = self.OutboundFilter.FilterEndDepartureTime();
            //inbound
            self.InitialInboundStartDepartureTime = self.InboundFilter.FilterStartDepartureTime();
            self.InitialInboundEndDepartureTime = self.InboundFilter.FilterEndDepartureTime();
            //
            self.Filter1OrMoreStopFlightsInitialValue = self.Filter1OrMoreStopFlights();
            self.AirlineOptionsInitialValue = [];
            $.each(self.AirlineOptions(), function (index, option) {
                self.AirlineOptionsInitialValue.push(option.Selected());
            });
        };

    };

    models.flightResultsModel = function () {
        var self = this;
        // fields
        this.mOptions = ko.observableArray([]);
        this.mDeparture = new ComboModel();
        this.mDestination = new ComboModel();
        this.mDepartureDate = ko.observable('');
        this.mReturnDate = ko.observable('');
        this.mAdults = ko.observable(1);
        this.mChildren = ko.observable(0);
        this.mInfants = ko.observable(0);
        this.mFilter = new FilterModel();
        this.mNextPageUrl = ko.observable(null);
        //this.mFilterCache = new FilterModel();
        this.mCurrency = ko.observable('');
        this.mNoSearchResult = ko.observable(false);
        this.mNoFilterResult = ko.observable(false);
        // other
        this.mIsReturnTrip = ko.observable(true);
        this.mErrorMessages = ko.observableArray([]);
        this.mHasError = ko.computed(function () { return self.mErrorMessages().length > 0; });
        // init
        var currentParams, filterResultsUrl;
        this.initializeModel = function (params, data) {
            currentParams = params;
            if (data.ModelState) {
                self.mErrorMessages(getModelStateMessages(data));
            } else {
                if (data.DepartureAirport) {
                    self.mDeparture.Text(data.DepartureAirport.City + ', ' + data.DepartureAirport.CountryCode);
                    self.mDeparture.Value(data.DepartureAirport.Code);
                } else {
                    self.mDeparture.Value(params['out0_dep']);
                }
                if (data.DestinationAirport) {
                    self.mDestination.Text(data.DestinationAirport.City + ', ' + data.DestinationAirport.CountryCode);
                    self.mDestination.Value(data.DestinationAirport.Code);
                } else {
                    self.mDestination.Value(params['out0_arr']);
                }
                self.mOptions(data._embedded.Options);
                if (ctx.api.hasFlightsResult(data)) {
                    self.mCurrency(data._embedded.Options[0].Fares[0].CurrencyCode);
                    self.mIsReturnTrip(!!data._embedded.Options[0].Inbound);
                    self.mDepartureDate(data.DepartureDate);
                    self.mReturnDate(data.ReturnDate);
                } else {
                    //self.mErrorMessages([ctx.i18n.get('noSearchResultMessage')]);
                    self.mNoSearchResult(true);
                    self.mIsReturnTrip(!!params['in0_date']);
                    self.mDepartureDate(params['out0_date']);
                    self.mReturnDate(params['in0_date']);
                }
                // filter
                if (data.FilterCriteria) {
                    ctx.each(data.FilterCriteria.AirlineOptions, function () { this.Selected = true; });
                    self.mFilter.initializeModel(data.FilterCriteria);
                    //self.mFilterCache.initializeModel(data.FilterCriteria);
                    filterResultsUrl = ctx.api.indexFlightsResultUrl(data);
                }
                // filter valid
                if (self.mFilter.OutboundFilterEnable()) {
                    self.mFilter.OutboundFilter.FilterEndDepartureTime.removeMethod('mustgreater');
                    self.mFilter.OutboundFilter.FilterEndDepartureTime.addMethod('mustgreater', function (obs) {
                        var startDate = ctx.parseDateStr(self.mFilter.OutboundFilter.FilterStartDepartureTime()), endDate = ctx.parseDateStr(obs());
                        var startTimeTicks = ctx.parseTicks(startDate.getUTCHours(), startDate.getUTCMinutes(), startDate.getUTCSeconds(), startDate.getUTCMilliseconds());
                        var endTimeTicks = ctx.parseTicks(endDate.getUTCHours(), endDate.getUTCMinutes(), endDate.getUTCSeconds(), endDate.getUTCMilliseconds());
                        return endTimeTicks > startTimeTicks;
                    });
                }
                if (self.mFilter.InboundFilterEnable() && self.mIsReturnTrip()) {
                    self.mFilter.InboundFilter.FilterEndDepartureTime.removeMethod('mustgreater');
                    self.mFilter.InboundFilter.FilterEndDepartureTime.addMethod('mustgreater', function (obs) {
                        var startDate = ctx.parseDateStr(self.mFilter.InboundFilter.FilterStartDepartureTime()), endDate = ctx.parseDateStr(obs());
                        var startTimeTicks = ctx.parseTicks(startDate.getUTCHours(), startDate.getUTCMinutes(), startDate.getUTCSeconds(), startDate.getUTCMilliseconds());
                        var endTimeTicks = ctx.parseTicks(endDate.getUTCHours(), endDate.getUTCMinutes(), endDate.getUTCSeconds(), endDate.getUTCMilliseconds());
                        return endTimeTicks > startTimeTicks;
                    });
                }
                if (self.mFilter.AirlineOptionsEnable()) {
                    self.mFilter.AirlineOptions.removeMethod('atleast1');
                    self.mFilter.AirlineOptions.addMethod('atleast1', function (obs) {
                        var count = 0;
                        ctx.each(obs(), function () {
                            if (this.Selected()) {
                                count++;
                            }
                        });
                        return count > 0;
                    });
                }
                //next page
                self.mNextPageUrl(getNextPageUrl(data.Pages));
                // cookie
                var sepIndex = location.href.indexOf('?');
                var searchResultQuery = location.href.substr(sepIndex);
                $.cookie('CurrentSearchResultQuery', searchResultQuery);
            }
            self.mAdults(params['adt']);
            self.mChildren(params['chd']);
            self.mInfants(params['inf']);
        };
        //apend more results
        this.appendMoreSearchResults = function (data) {
            var options = data._embedded.Options;
            if ($.isArray(options) && options.length > 0) {
                self.mOptions(self.mOptions().concat(data._embedded.Options));
            }
            self.mNextPageUrl(getNextPageUrl(data.Pages));
            // localytics
            ctx.intercept.localytics.tagEvent('Results Paged');
        };
        this.restoreWindowScroll = function () {
            $(window).scrollTop(0);
        };
        var getNextPageUrl = function (pages) {
            if (pages == null) {
                return null;
            }
            var nextPage = ko.utils.arrayFirst(pages, function (page) {
                return page.Position == "Next";
            });
            return nextPage ? nextPage.Link : null;
        };
        this.mUrlQuery = function (item) {
            var url = ctx.api.indexFlightBookingUrl(item);
            return ctx.appendQuery('', 'fbu', url);
        };

        var isFilterValid = function () {
            var messages = [];
            if (self.mFilter.OutboundFilterEnable()) { messages = messages.concat(self.mFilter.OutboundFilter.FilterEndDepartureTime.errorMessages()); }
            if (self.mFilter.InboundFilterEnable() && self.mIsReturnTrip()) { messages = messages.concat(self.mFilter.InboundFilter.FilterEndDepartureTime.errorMessages()); }
            if (self.mFilter.AirlineOptionsEnable()) { messages = messages.concat(self.mFilter.AirlineOptions.errorMessages()); }
            self.mErrorMessages(messages);
            return !self.mHasError();
        };
        var applyFilter = function () {
            if (self.mFilter.mHasFilter() && isFilterValid() && self.mFilter.mHasChanged()) {
                var filter = ko.mapping.toJS(self.mFilter);
                ctx.api.filterFlightResults(filterResultsUrl, filter, function (data) {
                    if (data.ModelState) {
                        self.mErrorMessages(getModelStateMessages(data));
                    } else {
                        self.mOptions(data._embedded.Options);
                        if (!self.mNoSearchResult()) { self.mNoFilterResult(!ctx.api.hasFlightsResult(data)); }
                        self.mNextPageUrl(getNextPageUrl(data.Pages));
                        self.restoreWindowScroll();
                        // localytics
                        ctx.intercept.localytics.tagEvent('Results Filter Applied');
                    }
                });
            }
        };
        this.mApplyFilter = function () {
            this.mHideFilter({ callback: applyFilter });
        };
        //var filterScroll;
        this.mShowFilter = function () {
            var holder = ctx.frameManager.getHolder();
            var scroller = ctx.frameManager.getScroller();
            var listfilter = holder.children('.body-container.listfilter');
            listfilter.frameSlide({
                from: -1, to: 0,
                beforeStart: function () {
                    listfilter.show();
                    this.data('oldScrollTop', scroller.scrollTop());
                    var $nav = this.find('nav.nav');
                    $nav.height($(window).height());
                    if (ctx.androidLow()) {
                        var $header = $(this).find('header');
                        $header.css('position', 'absolute');
                        var scrollTimer = null;
                        $(window).bind('scroll.header', function () {
                            if (scrollTimer) {
                                clearTimeout(scrollTimer);
                            }
                            scrollTimer = setTimeout(function () {
                                scrollTimer = null;
                                $header.css('top', $(window).scrollTop() + 'px');
                            }, 100);
                        });
                    }
                },
                complete: function () {
                    scroller.scrollTop(0);
                    holder.children('.body-container.flightlist').hide();
                    var $nav = this.find('nav.nav');
                    $nav.css({ height: '' });
                    if (ctx.androidLow()) {
                        $nav.css('position', 'absolute');
                        var scrollTimer = null;
                        $(window).bind('scroll.nav', function () {// nav position fixed bug
                            if (scrollTimer) {
                                clearTimeout(scrollTimer);
                            }
                            scrollTimer = setTimeout(function () {
                                scrollTimer = null;
                                if (!$('body').is(':animated')) {
                                    $nav.css('top', $(window).scrollTop() + 'px');
                                }
                            }, 100);
                        });
                    }
                    self.mFilter.mRestoreChangeTrack();
                    var checkOrientation = function () {
                        self.mFilter.mWindowOrientation(window.orientation);
                    };
                    $(window).bind("resize.checkOrientation", checkOrientation);
                    //$(window).bind("orientationchange.checkOrientation", checkOrientation);
                    self.mFilter.mWindowOrientation(window.orientation);
                    // localytics
                    ctx.intercept.localytics.tagEvent('Results Filter Opened');
                }
            });
        };
        this.mHideFilter = function (set) {
            var holder = ctx.frameManager.getHolder();
            var scroller = ctx.frameManager.getScroller();
            var listfilter = holder.children('.body-container.listfilter');
            listfilter.frameSlide({
                from: 0, to: -1,
                beforeStart: function () {
                    holder.children('.body-container.flightlist').show();
                    scroller.scrollTop(this.data('oldScrollTop'));
                    this.find('nav.nav').height($(window).height());
                },
                complete: function () {
                    listfilter.hide();
                    this.find('nav.nav').css({ height: '' });
                    if (ctx.androidLow()) {
                        $(window).unbind('scroll.nav'); // nav position fixed bug
                        $(window).unbind('scroll.header');
                    }
                    $(window).unbind('resize.checkOrientation');
                    //$(window).unbind('orientationchange.checkOrientation');
                    if (set.callback) {
                        set.callback();
                    } else {
                        applyFilter();
                    }
                    // localytics
                    ctx.intercept.localytics.tagEvent('Results Filter Closed');
                }
            });
        };
        this.mLocationGroup = function () {
            var source = $(arguments[1].currentTarget);
            source.parent().siblings().removeClass('active');
            source.parent().addClass('active');
            var target = $(source.attr('data-target'));
            if (target.length > 0) {
                var pos = target.offset();
                var scroller = ctx.frameManager.getScroller();
                if (scroller.prop('nodeType') !== 1) { scroller = $('html,body'); }
                if (ctx.androidLow()) {
                    scroller.scrollTop(pos.top);
                } else {
                    scroller.animate({ 'scrollTop': pos.top }, 512);
                }
                //filterScroll.scrollToElement(source.data('target'), 300);
            }
        };

        var applyFilterStops = function (select) {
            self.mFilter.mFlightStops(select ? copyStopsValues() : []);
        };
        this.mIsStopsAllSelected = ko.computed(function () {
            return self.mFilter.mFlightStops().length === stopsValues.length;
        });
        this.mSelectFilterStops = function () { applyFilterStops(true); };
        this.mClearFilterStops = function () { applyFilterStops(false); };

        var applyFilterAirlines = function (select) {
            var opts = self.mFilter.AirlineOptions;
            if (opts && (opts = opts())) {
                ctx.each(opts, function () { this.Selected(select); });
            }
        };
        this.mIsAirlinesAllSelected = ko.computed(function () {
            var opts = self.mFilter.AirlineOptions, allSelected = true;
            if (opts && (opts = opts())) {
                ctx.each(opts, function () { allSelected = (allSelected && this.Selected()); });
                return allSelected;
            }
        });
        this.mSelectFilterAirlines = function () { applyFilterAirlines(true); };
        this.mClearFilterAirlines = function () { applyFilterAirlines(false); };
        this.mMoreAirlineOptions = function () { self.mFilter.mShowMoreAirports(10); };

        //this.mResetOutboundFilter = function () {
        //    var cache = ko.mapping.toJS(self.mFilterCache.OutboundFilter);
        //    self.mFilter.OutboundFilter = ko.mapping.fromJS(cache);
        //    applyOutboundFilter(self.mFilter.OutboundFilter);
        //};
        //this.mResetInboundFilter = function () {
        //    var cache = ko.mapping.toJS(self.mFilterCache.InboundFilter);
        //    self.mFilter.InboundFilter = ko.mapping.fromJS(cache);
        //    applyInoundFilter(self.mFilter.InboundFilter);
        //};

        this.mNext = function () {
            var nextHref = $(arguments[1].currentTarget).attr('href');
            var flightBookingUrl = ctx.getQuery(nextHref, 'fbu');
            self.mErrorMessages([]);
            ctx.api.createFlightBooking(flightBookingUrl, function (data) {
                if (data.ModelState) {
                    self.mErrorMessages(getModelStateMessages(data));
                } else {
                    ctx.api.indexBookingInfoUrl(flightBookingUrl, function (info) {
                        var sepIndex = nextHref.indexOf('?'), nextPage = nextHref;
                        if (sepIndex > -1) { nextPage = nextHref.substr(0, sepIndex); }
                        if (ctx.httpsEnabled !== false) {
                            if (/^https:/i.test(flightBookingUrl)) {
                                nextPage = ctx.httpsUrl(nextPage);
                            }
                        }
                        ctx.routeApp.goto1(nextPage, { 'biu': info.bookingInfoUrl });
                        // localytics
                        ctx.intercept.localytics.tagEvent('Flight Booking Created');
                    });
                }
            });
        };
    };
    //#endregion

    //#region knockout model [metaLanding]

    models.metaLandingModel = function () {
        var self = this;

        // rules
        var discovers = [ctx.api.discoverChannel, ctx.api.discoverSubChannel, ctx.api.discoverLanguage, ctx.api.discoverCustomerId];
        var routeRule = [{ f: 'ch', t: '/ch-' }, { f: 'subch', t: '/sc-' }, { f: 'language', t: '/l-' }, { f: 'customerid', t: '/cid-' }];
        var queryRule = [{ f: 'mck', t: 'cachekey' }, { f: 'ci', t: 'cachename' }, { f: 'msfi', t: 'flightselector' }];

        // others
        this.mErrorMessages = ko.observableArray([]);
        this.mHasError = ko.computed(function () { return self.mErrorMessages().length > 0; });

        // init
        this.initializeModel = function (params, set) {
            var nextHref = set.next, currentParams = {};
            ctx.each(params, function (key, val) { currentParams[key.toLowerCase()] = val; });
            ctx.api.metaDetails(function (link) {
                if (link.ModelState) {
                    self.mErrorMessages(getModelStateMessages(link));
                } else {
                    var flightBookingUrl = ctx.trim(link.href, { find: '/' });
                    //
                    var discoverResults = [], result;
                    ctx.each(discovers, function (i, discover) {
                        discoverResults.push(result = discover(flightBookingUrl));
                        if (result) { flightBookingUrl = flightBookingUrl.replace(routeRule[i].t + result, ''); }
                    });
                    //
                    ctx.each(discoverResults, function (i, fromUrl) {
                        var fromQuery = currentParams[routeRule[i].f];
                        if (fromQuery) { flightBookingUrl += routeRule[i].t + fromQuery; }
                        else if (fromUrl) { flightBookingUrl += routeRule[i].t + fromUrl; }
                    });
                    ctx.each(queryRule, function () {
                        var value = currentParams[this.f];
                        if (value) { flightBookingUrl = ctx.appendQuery(flightBookingUrl, this.t, value); }
                    });
                    //
                    ctx.frameLoading.hide();
                    ctx.api.createFlightBooking(flightBookingUrl, function (data) {
                        ctx.frameLoading.show();
                        if (data.ModelState) {
                            if (data.TextStatus === 'notfound') {
                                self.onCacheNotFound.dispatch();
                            }
                            else {
                                self.onApiError.dispatch();
                                self.mErrorMessages(getModelStateMessages(data));
                            }
                        } else {
                            ctx.api.indexBookingInfoUrl(flightBookingUrl, function (info) {
                                var sepIndex = nextHref.indexOf('?'), nextPage = nextHref;
                                if (sepIndex > -1) { nextPage = nextHref.substr(0, sepIndex); }
                                if (ctx.httpsEnabled !== false) {
                                    if (/^https:/i.test(flightBookingUrl)) {
                                        nextPage = ctx.httpsUrl(nextPage);
                                    }
                                }
                                // absolute
                                if (!(/^(http:|https:|\/\/)/i.test(nextPage))) {
                                    nextPage = ctx.httpUrl(nextPage);
                                }
                                // replace
                                nextPage = nextPage.replace(/\/metalanding/i, '');
                                // go redirect
                                ctx.routeApp.goto1(nextPage, { 'biu': info.bookingInfoUrl, 'meta': 1 });
                                // localytics
                                ctx.intercept.localytics.tagEvent('Metalanding Booking Created');
                            });
                        }
                    });
                }
            });
        };

        // event
        this.onApiError = new ctx.dispatcher(this);
        this.onCacheNotFound = new ctx.dispatcher(this);
    };
    //#endregion

    //#region knockout model [bookingDetails]

    models.bookingDetailsModel = function () {
        var self = this;
        // fields
        this.mDepartureAirport = ko.observable(null);
        this.mDestinationAirport = ko.observable(null);
        this.mDepartureDate = ko.observable('');
        this.mReturnDate = ko.observable('');
        this.mAdults = ko.observable(1);
        this.mChildren = ko.observable(0);
        this.mInfants = ko.observable(0);
        this.mCurrency = ko.observable('');
        this.mTotalPrice = ko.observable(0);
        this.mTicketPrice = ko.observable(0);
        this.mExcludedBookingCost = ko.observable(0);
        this.mExcludedReservationCost = ko.observable(0);
        this.mIsReturnTrip = ko.observable(true);
        this.mSegments = ko.observableArray([]);
        this.mDiscount = ko.observable(0);
        this.mDiscountDescription = ko.observable('');
        // other
        this.mShowPopupInfo = popupKit.show;
        this.mFromMetaLading = ko.observable(false);
        this.mErrorMessages = ko.observableArray([]);
        this.mHasError = ko.computed(function () { return self.mErrorMessages().length > 0; });
        this.mTicketInsuranceApplicable = ko.observable(false);//skip ticketInsurance step
        // init
        var currentParams, searchResultUrl;
        this.initializeModel = function (params, data) {
            currentParams = params;
            if (data.ModelState) {
                self.mErrorMessages(getModelStateMessages(data));
            } else {
                var mappedModel = ko.mapping.fromJS(data);
                $.extend(self, mappedModel);
                if (data.Inbound) { self.mReturnDate(data.Inbound.DepartureDateTime); }
                if (data.Outbound) { self.mDepartureDate(data.Outbound.DepartureDateTime); }
                self.mDepartureAirport(data.DepartureAirport);
                self.mDestinationAirport(data.DestinationAirport);
                self.mIsReturnTrip(!!data.Inbound);
                if (data.Fares && data.Fares.length > 0) {
                    self.mCurrency(data.Fares[0].CurrencyCode);
                    self.mTotalPrice(data.Fares[0].Total);
                    self.mTicketPrice(data.Fares[0].DisplayFare.Total);
                    //TODO: the 'Code' may change in future api release,need to keep an eye on that.
                    for (var excludedCost in data.Fares[0].ExcludedCosts) {
                        if (excludedCost.Code == "Reservation Cost") {
                            self.mExcludedBookingCost(excludedCost.AmountPerPerson);
                        } else if (excludedCost.Code == "Airline Reservation Fee") {
                            self.mExcludedReservationCost(excludedCost.AmountPerPerson);
                    self.mDiscount(data.Fares[0].DisplayFare.Discount || 0);
                    self.mDiscountDescription(data.Fares[0].DisplayFare.mDiscountDescription || '');
                        }
                    }
                }
                // change alerts
                var changeAlerts = ctx.api.getChangeAlerts(data);
                if (changeAlerts) { self.mErrorMessages(changeAlerts); }
                // segments
                var outSegments = data.Outbound.Segments, inSegments = data.Inbound ? data.Inbound.Segments : {};
                if (outSegments) {
                    var index = 0, outb, inb;
                    while (true) {
                        outb = outSegments[index]; inb = inSegments[index];
                        if (outb || inb) {
                            index = index + 1;
                            self.mSegments.push({ Outbound: outb, Inbound: inb });
                        } else {
                            break;
                        }
                    }
                }
            }
            //
            self.mFromMetaLading(!!params['meta']);
            // query skip ticketInsurance step
            //ctx.api.ticketInsuranceApplicable(params['biu'], function (info) {
            //    self.mTicketInsuranceApplicable(info.applicable);
            //});
            ctx.api.indexFlightsResultUrlOfBooking(params['biu'], function (info) {
                searchResultUrl = info.flightResultsUrl;
            });
        };
        this.initializePassengers = function (data) {
            if (!data.Items) { return; }
            var adtNum = 0, chdNum = 0, infNum = 0, type, pt = ctx.api.PassengerTypeEnum;
            for (var i = 0, len = data.Items.length; i < len; i++) {
                type = data.Items[i].PassengerType;
                if (type === pt.Adult) {
                    adtNum++;
                } else if (type === pt.Child) {
                    chdNum++;
                } else if (type === pt.Infant) {
                    infNum++;
                }
            }
            self.mAdults(adtNum);
            self.mChildren(chdNum);
            self.mInfants(infNum);
        };

        this.mAllQuery = function () {
            if (self.mTicketInsuranceApplicable()) {
                return ctx.appendQuery('#/flight/booking/ticketinsurance', currentParams || {});
            } else {
                var query = ctx.appendQuery('#/flight/booking/passengers', currentParams || {});
                return ctx.appendQuery(query, 'tia', '0');
            }
        };

        this.mPrevQuery = function () {
            if (searchResultUrl && false) {//TODO: use or not
                return ctx.appendQuery('', 'sru', searchResultUrl);
            } else {
                return $.cookie('CurrentSearchResultQuery');
            }
        };

        this.mJourneyTitle = ko.computed(function () {
            var dep = this.mDepartureAirport(), des = this.mDestinationAirport();
            if (dep && des) {
                return dep.City + ' - ' + des.City;
            } else {
                return '';
            }
        }, this);

        this.mNext = function () {
            popupKit.close();
            // localytics
            ctx.intercept.localytics.tagEvent('BookingDetails Confirmed');
            // ret
            return true;
        };

        this.mPrev = function () {
            popupKit.close();
            var prevHref = $(arguments[1].currentTarget).attr('href');
            prevHref = ctx.httpUrl(prevHref);
            ctx.routeApp.goto1(prevHref);
            //return true;
        };
    };
    //#endregion

    //#region knockout model [ticketInsurance]

    models.ticketInsuranceModel = function () {
        var self = this;
        // fields
        this.mCosts = ko.observableArray([]);
        this.mIsSelected = ko.observable(false);
        this.mAmountPerPerson = ko.observable('');
        this.mCurrency = ko.observable('');
        // other
        this.mErrorMessages = ko.observableArray([]);
        this.mHasError = ko.computed(function () { return self.mErrorMessages().length > 0; });
        this.mTicketInsuranceApplicable = ko.observable(true);
        this.mNextStepNumber = ko.computed(function () { return self.mTicketInsuranceApplicable() ? '2.' : ''; });
        // init
        var currentParams;
        this.initializeModel = function (params, data) {
            currentParams = params;
            if (data.ModelState) {
                self.mErrorMessages(getModelStateMessages(data));
            } else {
                self.mCosts(data.Costs);
                self.mIsSelected(!!data.IsSelected);
                if (data.Costs && data.Costs.length > 0) {
                    self.mCurrency(data.Costs[0].CurrencyCode);
                    self.mAmountPerPerson(data.Costs[0].AmountPerPerson);
                }
            }
        };

        this.mAllQuery = function () {
            return ctx.appendQuery('', currentParams || {});
        };

        this.mCheckOnNext = function () {
            self.mIsSelected(true);
            self.mNext.apply(self, ctx.arg2arr(arguments));
            // localytics
            ctx.intercept.localytics.tagEvent('TicketInsurance Confirmed Yes');
        };

        this.mConfirmNext = function () {
            if (!self.mIsSelected()) {
                popupKit.show.apply(self, ctx.arg2arr(arguments));
                // localytics
                ctx.intercept.localytics.tagEvent('TicketInsurance Confirmation Opened');
            } else {
                self.mNext.apply(self, ctx.arg2arr(arguments));
                // localytics
                ctx.intercept.localytics.tagEvent('TicketInsurance Selected Yes');
            }
        };

        this.mNext = function () {
            if (!self.mIsSelected()) {
                // localytics
                ctx.intercept.localytics.tagEvent('TicketInsurance Confirmed No');
            }
            popupKit.close();
            var bookingInfoUrl = currentParams['biu'], nextHref = $(arguments[1].currentTarget).attr('href');
            ctx.api.postTicketInsurance(bookingInfoUrl, { IsSelected: self.mIsSelected() }, function (data) {
                //TODO: post error?
                if (!data) {
                    popupKit.close();
                    ctx.routeApp.goto1(nextHref);
                    return;
                }
                if (data.ModelState) {
                    self.mErrorMessages(getModelStateMessages(data));
                } else {
                    popupKit.close();
                    ctx.routeApp.goto1(nextHref);
                }
            });
        };
    };
    //#endregion

    //#region knockout model [passengers]

    var countAdult = countChild = countInfant = 0;

    var PassengerObjModel = function (parentModel) {
        var self = this;
        var validNameValidator = function (name) {
            if (!!name()) {
                var charSet = parentModel.AllowedCharacterSetForName;
                var regex = new RegExp('^[' + charSet + ']+$');
                return regex.test(name());
            }
            return true;
        };
        // fields
        this.GenderType = ko.observable('');
        this.FirstName = ko.observable('');
        this.FirstName.addMethod('validName', validNameValidator);
        this.LastName = ko.observable('');
        this.LastName.addMethod('validName', validNameValidator);
        this.Birthday = ko.observable('');
        this.PassengerType = ko.observable(''); // Adult,Child,Infant
        this.Reference = ko.observable(0);
        // other
        this.FrequentAirlineCode = ko.observable('');
        this.FrequentAirlineName = ko.observable('');
        this.FrequentFlyerNumber = ko.observable('');
        //this.FrequentFlyerNumber.addMethod('number');
        this.FrequentFlyerEnabled = ko.observable(false);
        this.MaxValidBirthday = ko.observable('');
        this.MinValidBirthday = ko.observable('');
        this.SelectedBaggageService = ko.observable(null);
        this.SelectedBaggageService.addMethod('requiredBaggageOption', function () {
            return !self.SelectedBaggageService() || !!self.SelectedBaggageService().Code;
        });
        this.SelectedBaggageServiceOption = ko.observable(null);
        this.SelectedMealOption = ko.observable(null);
        this.SelectedSeatOption = ko.observable(null);
        this.BaggageServiceOptions = {};
        this.BaggageServiceOptions.Items = ko.observableArray([]);

        // init
        this.initializeModel = function (params, data) {
            self.GenderType(data.Person.GenderType);
            self.FirstName(data.Person.FirstName || '');
            self.LastName(data.Person.LastName || '');
            self.Birthday(data.Person.Dob || '');
            self.MaxValidBirthday(data.Person.MaxValidDob);
            self.MinValidBirthday(data.Person.MinValidDob);
            self.PassengerType(data.PassengerType);
            self.Reference(data.Reference);
            self.SelectedBaggageService(data.SelectedBaggageService);
            self.SelectedMealOption(data.SelectedMealOption);
            self.SelectedSeatOption(data.SelectedSeatOption);
            if (data.BaggageServiceOptions && data.BaggageServiceOptions.Items.length > 0) {
                self.BaggageServiceOptions.Items(data.BaggageServiceOptions.Items);
            }
            if (!!data.FrequentFlyer) {
                self.FrequentAirlineCode(data.FrequentFlyer.AirlineCode);
                self.FrequentFlyerNumber(data.FrequentFlyer.FrequentFlyerNumber);
                self.FrequentFlyerEnabled(true);
            }
        };

        // helpers
        var pt = ctx.api.PassengerTypeEnum;
        this.IsAdult = function () { return (self.PassengerType() === pt.Adult); };
        this.IsChild = function () { return (self.PassengerType() === pt.Child); };
        this.IsInfant = function () { return (self.PassengerType() === pt.Infant); };
        this.Count = function () {
            if (self.IsAdult()) {
                return (++countAdult);
            } else if (self.IsChild()) {
                return (++countChild);
            } else if (self.IsInfant()) {
                return (++countInfant);
            }
        };
    };

    var SpecialWishesModel = function (parentModel) {
        var self = this;
        // fields
        this.mPassengers = null;
        this.mWishOptions = ko.observableArray([]);
        this.mWishesOverview = ko.observableArray([]);
        this.mWishesOverviewGlobal = ko.observableArray([]);

        this.mBoardingOptions = ko.observableArray([]);
        this.mMealOptions = ko.observableArray([]);
        this.mSeatOptions = ko.observableArray([]);

        this.mSpecialWishesAvailable = ko.computed(function () {
            return self.mBoardingOptions().length > 0
                   || self.mMealOptions().length > 0
                   || self.mSeatOptions().length > 0;
        });

        // dom
        var domMainContainer = '#Passengers_SpecialWishes';
        var domWishOptions = '#Passengers_SpecialWishes_WishOptions';
        var domPassengers = '#Passengers_SpecialWishes_Passengers';
        var domOverview = '#Passengers_SpecialWishes_Overview';

        //#region frames

        var previousAddtitleclass;
        var showFrame = function (target) {
            target = $(target);
            target.siblings().hide();
            target.show();
            popupKit.update();
            // title
            var titleNode = $('.fancybox-title-outside-wrap');
            var title = target.attr('title');
            if (title) { titleNode.html(title); }
            // title class
            if (previousAddtitleclass) {
                titleNode.removeClass(previousAddtitleclass);
                previousAddtitleclass = null;
            }
            var titleCls = target.attr('addtitleclass');
            if (titleCls) {
                titleNode.addClass(titleCls);
                previousAddtitleclass = titleCls;
            }
            // back
            passengersBackFunc = null;
            var prevFrame = target.attr('prevFrame');
            if (prevFrame) {
                passengersBackFunc = function () {
                    if (prevFrame === domWishOptions) {
                        self.mShowWishIndex();
                    } else {
                        showFrame(prevFrame);
                    }
                };
                var backBtn = target.attr('backBtn');
                if (backBtn) {
                    titleNode.html('<a class="back" href="javascript:;">Back</a>' + titleNode.html());
                    titleNode.find('.back').click(passengersBackFunc);
                }
            }
        };
        var showMain = function () {
            var mainContainer = $(domMainContainer);
            if (mainContainer.parent().hasClass('hide')) {
                popupKit.showCore(mainContainer, {
                    autoScroll: true,
                    beforeClose: function () {
                        if (passengersBackFunc) {
                            passengersBackFunc();
                            return false;
                        }
                    }
                });
            }
        };
        var hideMain = this.mKeepWishes = function () {
            passengersBackFunc = null; popupKit.close();
            var mainContainer = $(domMainContainer);
            mainContainer.children().hide();
            $(domWishOptions).show();
        };
        //#endregion

        //#region overview

        var updateOverview = function () {
            var wishov = [];
            ctx.each(self.mPassengers(), function () {
                if (this.Wishes().length > 0) {
                    wishov.push(this);
                }
            });
            self.mWishesOverview(wishov);
        };

        var insertWishCore = function (wishes, wish) {
            // clone, ensure each item object is different reference
            wish = $.extend({}, wish);
            // find exist type
            var findIndex = -1;
            if (wish.type) { // for single 
                ctx.each(wishes(), function (idx) {
                    if (this.type === wish.type) {
                        findIndex = idx;
                        return false;
                    }
                });
            }
            if (findIndex > -1) {
                wishes.splice(findIndex, 1, wish);
            } else {
                wishes.push(wish);
            }
            if (wish.change) {
                wish.change(wish, false, this);
            }
        };

        var removeWishCore = function (wishes, wish) {
            var index = -1, wss = wishes();
            ctx.each(wss, function (idx) {
                if (this == wish) {
                    index = idx;
                }
            });
            if (index > -1 && wss[index]) {
                var ws = wishes.splice(index, 1)[0];
                if (ws.change) { ws.change(ws, true, this); }
            }
        };

        var insertWish = function (wish, refs) {
            if (!refs) {
                insertWishCore(self.mWishesOverviewGlobal, wish);
                return;
            }
            // merge
            ctx.each(refs, function (idx, val) {
                var reference = parseInt(val, 10);
                ctx.each(self.mPassengers(), function () {
                    if (this.Reference() === reference) {
                        insertWishCore.call(this, this.Wishes, wish);
                        return false;
                    }
                });
            });
            // update
            updateOverview();
        };

        var removeWish = function (item) {
            removeWishCore(self.mWishesOverviewGlobal, item);
            ctx.each(self.mPassengers(), function () {
                removeWishCore.call(this, this.Wishes, item);
            });
            // update
            updateOverview();
            // localytics
            ctx.intercept.localytics.tagEvent('Passengers Special Wish Removed');
        };

        var findOption = function (items, code, type, change) {
            for (var it, i = 0, len = items.length; i < len; i++) {
                it = items[i];
                if (it.Code === code) {
                    return {
                        type: type,
                        change: change,
                        Item: it,
                        Code: it.Code,
                        Title: it.Title,
                        Costs: it.Costs,
                        Remove: removeWish
                    };
                }
            }
        };

        var selectedReferences = ko.observableArray([]), getSelectedWishFunc;
        this.mInsertWish = function () {
            var selectedRefs = selectedReferences(), selectedWish = getSelectedWishFunc ? getSelectedWishFunc() : null;
            if (selectedRefs.length > 0 && selectedWish) {
                insertWish(selectedWish, selectedRefs);
                showFrame(domOverview);
                getSelectedWishFunc = null;
            }
        };
        //#endregion

        //#region wishindex

        var selectedWishOption = ko.observableArray([]), resetList = [selectedWishOption, selectedReferences];
        this.mShowWishIndex = function () {
            if (!parentModel.hadCompletedPassengersInfo()) {
                return; /*#28082*/
            }
            showMain();
            showFrame(domWishOptions);
            ctx.each(resetList, function (idx, item) { item([]); });
        };
        var insertWishOptions = function (name, title, target, selected) {
            if (selected) { resetList.push(selected); }
            self.mWishOptions.push({
                Name: name, Title: title,
                Selected: selectedWishOption,
                Select: function () { showFrame(target); }
            });
        };
        //#endregion

        // init
        this.initializeModel = function (host, data) {
            var embedded = data._embedded;
            self.mPassengers = host.mPassengers;

            // mPassengers
            ctx.each(self.mPassengers(), function (idx, passenger) {
                passenger.Wishes = ko.observableArray([]);
                passenger.Selected = selectedReferences;
            });

            if (embedded) {
                // mBoardingOptions
                var boardingOptions = embedded.PriorityBoardingServiceOptions;
                if (boardingOptions) {
                    var findBoardingOption = function (code) {
                        return findOption(boardingOptions.Items, code, 'boarding', function (wish, isRemove) {
                            host.mSelectedPriorityBoardingService(isRemove ? { Code: '' } : wish.Item);
                        });
                    };
                    var onSelect = function (item) {
                        insertWish(findBoardingOption(item.Code));
                        showFrame(domOverview);
                        // localytics
                        ctx.intercept.localytics.tagEvent('Passengers Priority Boarding Service Selected');
                    };
                    var seldctedBoardingOptions = ko.observableArray([]);
                    ctx.each(boardingOptions.Items, function (idx, opt) {
                        opt.Selected = seldctedBoardingOptions;
                        opt.Select = onSelect;
                        opt.Title = ko.observable('');
                        var boarding = data.SelectedPriorityBoardingService;
                        if (boarding && opt.Code === boarding.Code) {
                            insertWish(findBoardingOption(opt.Code));
                        }
                    });
                    self.mBoardingOptions(boardingOptions.Items);
                    var domBoardingOptions = '#Passengers_SpecialWishes_BoardingOptions';
                    insertWishOptions('PriorityBoardingServiceOptions', ctx.i18n.get('SpeedyBoarding'), domBoardingOptions, seldctedBoardingOptions);
                }
            }
        };

        this.initializeMealOptions = function (data) {
            // mMealOptions
            if (!data || !data.Items) { return; }
            var findMealOption = function (code) {
                return findOption(data.Items, code, 'meal', function (wish, isRemove, passenger) {
                    passenger.SelectedMealOption(isRemove === true ? { Code: '' } : wish.Item);
                });
            };
            var onSelect = function (item) {
                showFrame(domPassengers);
                getSelectedWishFunc = function () {
                    // localytics
                    ctx.intercept.localytics.tagEvent('Passengers Meal Options Selected');
                    // ret
                    return findMealOption(item.Code);
                };
            };
            var selectedMealOptions = ko.observableArray([]);
            ctx.each(data.Items, function (idx, opt) {
                opt.Selected = selectedMealOptions;
                opt.Select = onSelect;
                opt.Title = ko.observable('');
                ctx.each(self.mPassengers(), function (idx, passenger) {
                    var meal = passenger.SelectedMealOption();
                    if (meal && meal.Code === opt.Code) { insertWish(findMealOption(meal.Code), [passenger.Reference()]); }
                });
            });
            self.mMealOptions(data.Items);
            var domMealOptions = '#Passengers_SpecialWishes_MealOptions';
            insertWishOptions('MealOptions', ctx.i18n.get('MealOptions'), domMealOptions, selectedMealOptions);
        };

        this.initializeSeatOptions = function (data) {
            // mSeatOptions
            if (!data || !data.Items) { return; }
            var findSeatOption = function (code) {
                return findOption(data.Items, code, 'seat', function (wish, isRemove, passenger) {
                    passenger.SelectedSeatOption(isRemove === true ? { Code: '' } : wish.Item);
                });
            };
            var onSelect = function (item) {
                showFrame(domPassengers);
                getSelectedWishFunc = function () {
                    // localytics
                    ctx.intercept.localytics.tagEvent('Passengers Seat Options Selected');
                    // ret
                    return findSeatOption(item.Code);
                };
            };
            var selectedSeatOptions = ko.observableArray([]);
            ctx.each(data.Items, function (idx, opt) {
                opt.Selected = selectedSeatOptions;
                opt.Select = onSelect;
                opt.Title = ko.observable('');
                ctx.each(self.mPassengers(), function (idx, passenger) {
                    var seat = passenger.SelectedSeatOption();
                    if (seat && seat.Code === opt.Code) { insertWish(findSeatOption(seat.Code), [passenger.Reference()]); }
                });
            });
            self.mSeatOptions(data.Items);
            var domSeatOptions = '#Passengers_SpecialWishes_SeatOptions';
            insertWishOptions('SeatOptions', ctx.i18n.get('SeatOptions'), domSeatOptions, selectedSeatOptions);
        };
    };

    models.passengersModel = function () {
        var self = this;
        // fields
        this.mPassengers = ko.observableArray([]);
        this.mSelectedPriorityBoardingService = ko.observable('');
        this.mSpecialWishes = new SpecialWishesModel(this);
        // other
        this.mShowPopupInfo = popupKit.show;
        this.mErrorMessages = ko.observableArray([]);
        this.mHasError = ko.computed(function () { return self.mErrorMessages().length > 0; });
        this.mTicketInsuranceApplicable = ko.observable(true);
        this.mNextStepNumber = ko.computed(function () { return self.mTicketInsuranceApplicable() ? '3.' : '2.'; });
        this.hadCompletedPassengersInfo = ko.computed(function () {
            var len = self.mPassengers().length; /*#28082*/
            var infoCompletedPassengersCount = 0;
            for (var i = 0; i < len; i++) {
                var passenger = self.mPassengers()[i];
                if (passenger.FirstName() && passenger.LastName() && passenger.Birthday()) {
                    infoCompletedPassengersCount++;
                }
            }
            return infoCompletedPassengersCount == len;
        });
        this.currentlySettingPassenger = ko.observable(new PassengerObjModel());
        this.getSelectedBaggageOption = function (passenger) {
            var selectedOption = ko.utils.arrayFirst(passenger.BaggageServiceOptions.Items(), function (option) {
                return option.Code === passenger.SelectedBaggageService().Code;
            });
            return selectedOption;
        };
        this.checkBaggageServiceOption = function (option) {
            self.currentlySettingPassenger().SelectedBaggageServiceOption(option);
            popupKit.close();
            // localytics
            ctx.intercept.localytics.tagEvent('Passengers Baggage Options Selected');
        };
        this.mSubscribePassengersToFrequentFlyer = ko.observable();
        // init
        var currentParams;
        this.initializeModel = function (params, data) {
            currentParams = params;
            if (data.ModelState) {
                self.mErrorMessages(getModelStateMessages(data));
            } else {
                countAdult = countChild = countInfant = 0;
                var array = [], options = data.Items, mdl;
                for (var i = 0; i < options.length; i++) {
                    array.push(mdl = new PassengerObjModel(self));
                    mdl.initializeModel(params, options[i]);
                    mdl.PassengerId = ctx.guid(true);
                    mdl.mBaggageEnable = ko.observable(true);
                    if (mdl.BaggageServiceOptions.Items().length > 0) {
                        baggageOptions = mdl.BaggageServiceOptions.Items();
                        if (baggageOptions.length > 0 && isFreeBaggage(data.SubscribePassengersToFrequentFlyer, baggageOptions)) {
                            mdl.SelectedBaggageService({ Code: baggageOptions[0].Code });
                            mdl.mBaggageEnable(false);
                        }
                        mdl.SelectedBaggageServiceOption(self.getSelectedBaggageOption(mdl));
                    }
                }
                self.mPassengers(array);
                self.mSpecialWishes.initializeModel(this, data);
                self.mZeroBaggageText = data.ZeroBaggageText;
                self.mPartiallZeroBaggageText = !!data.ZeroBaggageText ? data.ZeroBaggageText.substring(0, 205) : "";
                self.mZeroBaggageEnabled = !!data.ZeroBaggageEnabled;
                self.mSubscribePassengersToFrequentFlyer.keyUnsubscribe('k0');
                self.mSubscribePassengersToFrequentFlyer(data.SubscribePassengersToFrequentFlyer);
                self.mSubscribePassengersToFrequentFlyer.keySubscribe('k0', function (val) { subscribeAllPassengersToFrequentFlyer(val); });

                self.AllowedCharacterSetForName = data.AllowedCharacterSetForName;
            }
            // query
            if (params['tia']) {
                self.mTicketInsuranceApplicable(false);
            }
        };

        this.initializeMealOptions = function (data) { self.mSpecialWishes.initializeMealOptions(data); };
        this.initializeSeatOptions = function (data) { self.mSpecialWishes.initializeSeatOptions(data); };

        this.mAllQuery = function () {
            return ctx.appendQuery('', currentParams || {});
        };

        this.mPrevQuery = function () {
            if (self.mTicketInsuranceApplicable()) {
                return ctx.appendQuery('#/flight/booking/ticketinsurance', currentParams || {});
            } else {
                return ctx.appendQuery('#/flight/booking/details', 'biu', currentParams['biu']);
            }
        };

        var isValid = function () {
            var messages = [];
            ctx.each(self.mPassengers(), function (i, passenger) {
                ctx.each(passenger, function (j, obs) {
                    if ((obs.hasMethod && obs.hasMethod()) || (obs instanceof ComboModel)) {
                        messages = messages.concat(obs.errorMessages());
                    }
                });
            });
            self.mErrorMessages(messages);
            return !self.mHasError();
        };


        var atLeastOneAdult = function () {
            // check if at least one passenger is 18 years or older
            var hasAdult = false, now = new Date(), adt = ctx.api.PassengerTypeEnum.Adult;
            ctx.each(self.mPassengers(), function (i, passenger) {
                if (passenger.PassengerType() === adt) {
                    var birthday = ctx.parseDateStr(passenger.Birthday(), false);
                    if (now.getFullYear() - birthday.getFullYear() > 18) {
                        hasAdult = true;
                    } else if (now.getFullYear() - birthday.getFullYear() === 18) {
                        if (now.getMonth() > birthday.getMonth()) {
                            hasAdult = true;
                        } else if (now.getMonth() === birthday.getMonth()) {
                            if (now.getDate() > birthday.getDate()) {
                                hasAdult = true;
                            }
                        }
                    }
                }
                return !hasAdult;
            });
            return hasAdult;
        };
        this.mNext = function () {
            // do valid
            if (!isValid()) {
                return;
            }
            if (!atLeastOneAdult()) {
                popupKit.showCore('#Passengers_NoAudlt_Popup');
                return;
            }
            // gen data
            var postPassengers = [], pitem;
            ctx.each(self.mPassengers(), function (i, passenger) {
                postPassengers.push(pitem = {
                    Person: {
                        GenderType: passenger.GenderType(),
                        FirstName: passenger.FirstName(),
                        LastName: passenger.LastName(),
                        Dob: passenger.Birthday()
                    },
                    PassengerType: passenger.PassengerType(),
                    Reference: passenger.Reference(),
                    SelectedBaggageService: passenger.SelectedBaggageService(),
                    SelectedMealOption: passenger.SelectedMealOption(),
                    SelectedSeatOption: passenger.SelectedSeatOption(),
                    FrequentFlyer: {
                        AirlineCode: passenger.FrequentAirlineCode(),
                        FrequentFlyerNumber: passenger.FrequentFlyerNumber()
                    }
                });
                if (pitem.FrequentFlyer && (!pitem.FrequentFlyer.AirlineCode || !pitem.FrequentFlyer.FrequentFlyerNumber)) {
                    delete pitem.FrequentFlyer;
                }
            });
            // post data
            if (postPassengers.length > 0) {
                var postData = {
                    Items: postPassengers,
                    SelectedPriorityBoardingService: self.mSelectedPriorityBoardingService()
                };
                var bookingInfoUrl = currentParams['biu'], nextHref = $(arguments[1].currentTarget).attr('href');
                ctx.api.postPassengers(bookingInfoUrl, postData, function (data) {
                    if (data.ModelState) {
                        self.mErrorMessages(getModelStateMessages(data));
                    } else {
                        popupKit.close();
                        ctx.routeApp.goto1(nextHref);
                        // localytics
                        ctx.intercept.localytics.tagEvent('Passengers Info Filled');
                    }
                });
            }
        };

        this.mShowPopupBaggageOptions = function (passenger, e) {
            if (passenger.mBaggageEnable()) {
                self.currentlySettingPassenger(passenger);
                popupKit.showCore('#Passengers_BaggageOptions');
            }
        };

        //#region zero baggage related
        var baggageUpdatePosting = false, freeBaggageCode = 'zbagfree';
        this.onBaggageChanged = new ctx.dispatcher(this);
        // [Subscribe] SubscribePassengersToFrequentFlyer field
        var subscribeAllPassengersToFrequentFlyer = function (isSubscribe) {
            if (baggageUpdatePosting) {
                return;
            }
            //
            var postData = { Items: [], SubscribePassengersToFrequentFlyer: isSubscribe };
            ctx.each(self.mPassengers(), function () {
                postData.Items.push({
                    Reference: this.Reference(),
                    PassengerType: this.PassengerType(),
                    SelectedBaggageService: isSubscribe ? { Code: freeBaggageCode } : undefined
                });
            });
            //
            if (postData.Items.length > 0) {
                postToUpdateBaggages(postData);
            }
            // localytics
            ctx.intercept.localytics.tagEvent('Passengers Subscribe To Frequent Flyer Selected');
        };
        var postToUpdateBaggages = function (postData) {
            //ctx.binding.cluetip.hideAll();
            var bookingInfoUrl = currentParams['biu'];
            baggageUpdatePosting = true;
            ctx.api.postPassengersV2(bookingInfoUrl, postData, function (newData) {
                if (!newData || newData.ModelState || newData.Message) {
                    return;
                }
                self.mSubscribePassengersToFrequentFlyer(newData.SubscribePassengersToFrequentFlyer);
                ctx.each(newData.Items, function (index, newItem) {
                    var feItem = self.mPassengers()[index];
                    // clear
                    feItem.BaggageServiceOptions.Items([]);
                    feItem.SelectedBaggageService.Code = undefined;
                    feItem.mBaggageEnable(true);
                    // apply
                    var sets = newItem.BaggageServiceOptions;
                    if (sets && sets.Items && sets.Items.length > 0) {
                        feItem.BaggageServiceOptions.Items(sets.Items);
                        feItem.SelectedBaggageService.Code = newItem.SelectedBaggageService.Code;
                        if (isFreeBaggage(newData.SubscribePassengersToFrequentFlyer, sets.Items)) {
                            feItem.SelectedBaggageService({ Code: sets.Items[0].Code });
                            feItem.SelectedBaggageServiceOption(self.getSelectedBaggageOption(feItem));
                            feItem.mBaggageEnable(false);
                        } else {
                            feItem.SelectedBaggageService({ Code: "" });
                            feItem.SelectedBaggageServiceOption(null);
                        }
                    }
                });
                // event
                self.onBaggageChanged.dispatch();
                baggageUpdatePosting = false;
            });
        };
        var isFreeBaggage = function (hasSubscribe, baggageOptions) {
            return hasSubscribe || (baggageOptions && baggageOptions.length > 0 && baggageOptions[0].Code === freeBaggageCode);
        };
        //#endregion

        this.mFrequentFlyerOptions = ko.observableArray();
        this.initializeFrequentFlyerOptions = function (data) {
            if (!data || !data._embedded) {
                return;
            }
            self.mFrequentFlyerOptions(data._embedded.Airlines);
            $.each(self.mPassengers(), function (index, passenger) {
                if (passenger.FrequentFlyerEnabled()) {
                    var airLine = ko.utils.arrayFirst(data._embedded.Airlines, function (option) {
                        return option.Code === passenger.FrequentAirlineCode();
                    });
                    if (!!airLine) {
                        passenger.FrequentAirlineName(airLine.DisplayName);
                    }
                }
            });
        };
        this.mShowFrequentFlyerInputPopup = function (passenger) {
            self.currentlySettingPassenger(passenger);
            popupKit.showCore('#FrequentFlyer_InputPopup', { autoScroll: false });
        };
        this.mShowFrequentFlyerAirlinOptions = function () {
            popupKit.showCore('#FrequentFlyer_AirlinOptions', { padding: [0, 0, 0, 0] });
        };
        this.mSetFrequentFlyerAirline = function (airline, e) {
            self.currentlySettingPassenger().FrequentAirlineCode(airline.Code);
            self.currentlySettingPassenger().FrequentAirlineName(airline.DisplayName);
            popupKit.showCore('#FrequentFlyer_InputPopup', { autoScroll: false });
            return true;
        };
        this.mFrequentFlyerNonEmpty = function (passenger) {
            if (!passenger) {
                passenger = self.currentlySettingPassenger();
            }
            return !!passenger.FrequentAirlineCode() && !!passenger.FrequentFlyerNumber();
        }
        this.mSubscribePassengerToFrequentFlyer = function () {
            popupKit.close();
            var passenger = self.currentlySettingPassenger();
            if (baggageUpdatePosting) {
                return;
            }
            if (!self.mZeroBaggageEnabled) {
                return;
            }
            if (isPersonValid(passenger)) {
                var postData = { Items: [] };
                postData.Items.push({
                    Reference: passenger.Reference(),
                    PassengerType: passenger.PassengerType(),
                    Person: {
                        GenderType: passenger.GenderType(),
                        FirstName: passenger.FirstName(),
                        LastName: passenger.LastName(),
                        Dob: passenger.Birthday()
                    },
                    FrequentFlyer: {
                        AirlineCode: passenger.FrequentAirlineCode(),
                        FrequentFlyerNumber: passenger.FrequentFlyerNumber()
                    }
                });
                //
                if (postData.Items.length > 0) {
                    postToUpdateBaggages(postData);
                }
            }

        };
        var isPersonValid = function (person) {
            var messages = [];
            ctx.each(person, function (key, obj) {
                if (obj && obj.hasMethod && obj.hasMethod()) {
                    messages = messages.concat(obj.errorMessages());
                }
            });
            return messages.length === 0;
        };
    };
    //#endregion

    //#region knockout model [contact]

    var ContactObjModel = function () {
        var self = this;
        // fields
        this.City = ko.observable('');
        this.CountryCode = ko.observable('');
        this.Email = ko.observable('');
        this.HouseNumber = ko.observable('');
        this.HouseNumberAddition = ko.observable('');
        this.PhoneNumberHome = ko.observable('');
        this.PhoneNumberMobile = ko.observable('');
        this.PostalCode = ko.observable('');
        this.RequestedNewsLetter = ko.observable(false);
        this.Street = ko.observable('');
        this.TravelerId = ko.observable(0);

        this.FullStreet = ko.computed(function () {/*#28079*/
            var street = self.Street() ? self.Street() : "";
            var houseNumber = self.HouseNumber() ? self.HouseNumber() : "";
            var houseNumberAddition = self.HouseNumberAddition() ? self.HouseNumberAddition() : "";
            return street + ' ' + houseNumber + ' ' + houseNumberAddition;
        });
        // init
        this.initializeModel = function (data) {
            if (data.RequestedNewsLetter == null && $.trim($("#news-letter-default-checked").val()) == "true") {//#28223
                data.RequestedNewsLetter = true;
            }
            self.City(data.City);
            self.CountryCode(data.CountryCode || window.CMS.currentLanguageCountryCode.toUpperCase());
            self.Email(data.Email);
            self.HouseNumber(data.HouseNumber);
            self.HouseNumberAddition(data.HouseNumberAddition);
            self.PhoneNumberHome(data.PhoneNumberHome);
            self.PhoneNumberMobile(data.PhoneNumberMobile);
            self.PostalCode(data.PostalCode);
            self.RequestedNewsLetter(data.RequestedNewsLetter);
            self.Street(data.Street);
            self.TravelerId(data.TravelerId);
        };
    };

    models.contactModel = function () {
        var self = this;
        // fields
        this.mContact = new ContactObjModel();
        // other
        this.mTravelers = ko.observableArray([]);
        this.mSelectedTraveler = new ComboModel();
        this.mCountries = ko.observableArray([]);
        this.mSelectedCountry = new ComboModel();
        this.mErrorMessages = ko.observableArray([]);
        this.mHasError = ko.computed(function () { return self.mErrorMessages().length > 0; });
        this.mTicketInsuranceApplicable = ko.observable(true);
        this.mNextStepNumber = ko.computed(function () { return self.mTicketInsuranceApplicable() ? '4.' : '3.'; });
        // init
        var currentParams;
        this.initializeModel = function (params, data) {
            currentParams = params;
            if (data.ModelState) {
                self.mErrorMessages(getModelStateMessages(data));
            } else {
                self.mContact.initializeModel(data);
            }
            // query
            if (params['tia']) { self.mTicketInsuranceApplicable(false); }
        };
        // init traveller
        this.initializeTravellers = function (data) {
            var travelers = [], item;
            if (data && data.Items) {
                for (var i = 0, len = data.Items.length; i < len; i++) {
                    travelers.push(item = new ComboModel());
                    item.Text(data.Items[i].DisplayName);
                    item.Value(data.Items[i].Id);
                }
            }
            self.mTravelers(travelers);
            self.mSelectedTraveler.Text(travelers.length > 0 ? travelers[0].Text() : '');
            self.mSelectedTraveler.Value(travelers.length > 0 ? travelers[0].Value() : '');
        };
        this.mContact.TravelerId.subscribe(function (val) {
            var travelers = self.mTravelers();
            for (var i = 0, len = travelers.length; i < len; i++) {
                if (travelers[i].Value() + '' === val + '') {
                    self.mSelectedTraveler.Text(travelers[i].Text());
                    self.mSelectedTraveler.Value(travelers[i].Value());
                    break;
                }
            }
        });
        // init country
        this.initializeCountries = function (data) {
            var countries = [new ComboModel()], item;
            if (data && data.Countries) {
                for (var i = 0, len = data.Countries.length; i < len; i++) {
                    countries.push(item = new ComboModel());
                    item.Text(data.Countries[i].DisplayName);
                    item.Value(data.Countries[i].Code);
                }
            }
            self.mCountries(countries);
            self.mSelectedCountry.Text(countries.length > 0 ? countries[0].Text() : '');
            self.mSelectedCountry.Value(countries.length > 0 ? countries[0].Value() : '');
        };
        this.mContact.CountryCode.subscribe(function (val) {
            var countries = self.mCountries();
            for (var i = 0, len = countries.length; i < len; i++) {
                if (countries[i].Value() + '' === val + '') {
                    self.mSelectedCountry.Text(countries[i].Text());
                    self.mSelectedCountry.Value(countries[i].Value());
                    break;
                }
            }
        });

        this.mAllQuery = function () {
            return ctx.appendQuery('', currentParams || {});
        };

        var isValid = function () {
            var messages = [];
            ctx.each(self.mContact, function (j, obs) {
                if ((obs.hasMethod && obs.hasMethod()) || (obs instanceof ComboModel)) {
                    messages = messages.concat(obs.errorMessages());
                }
            });
            self.mErrorMessages(messages);
            return !self.mHasError();
        };

        this.mNext = function () {
            // do valid
            if (!isValid()) { return; }
            // gen data
            var contact = ko.mapping.toJS(self.mContact);
            // post data
            var bookingInfoUrl = currentParams['biu'], nextHref = $(arguments[1].currentTarget).attr('href');
            ctx.api.postContact(bookingInfoUrl, contact, function (data) {
                if (data.ModelState) {
                    fireInvalidActions(data, function (name) { return self.mContact[name]; });
                    self.mErrorMessages(getModelStateMessages(data));
                } else {
                    popupKit.close();
                    ctx.routeApp.goto1(nextHref);
                    // localytics
                    ctx.intercept.localytics.tagEvent('Contact Info Filled');
                }
            });
        };
    };
    //#endregion

    //#region knockout model [insurance]

    models.insuranceModel = function () {
        var self = this;
        // fields
        this.mData = null;
        this.mOptions = ko.observableArray([]);
        this.mHasOptions = ko.observable(false);

        //ticket insurance fields
        this.mTicketInsuranceCosts = ko.observableArray([]);
        this.mTicketInsuranceIsSelected = ko.observable(false);
        this.mTicketInsuranceAmountPerPerson = ko.observable('');
        this.mTicketInsuranceCurrency = ko.observable('');
        // other
        this.mShowPopupInfo = popupKit.show;
        this.mErrorMessages = ko.observableArray([]);
        this.mHasError = ko.computed(function () { return self.mErrorMessages().length > 0; });
        this.mTicketInsuranceApplicable = ko.observable(true);
        this.mNextStepNumber = ko.computed(function () { return self.mTicketInsuranceApplicable() ? '5.' : '4.'; });
        // init
        var currentParams;
        this.initializeModel = function (params, data) {
            currentParams = params;
            if (data.ModelState) {
                self.mErrorMessages(getModelStateMessages(data));
            } else {
                // when it's not api applicable, default to []
                var items = data.Items || [];
                self.mHasOptions(items.length > 0);
                // new version api will allow IsSelected field null
                // here we got to default it to false on mobile sites.
                ctx.each(items, function () {
                    if ($.type(this.IsSelected) !== 'boolean') {
                        this.IsSelected = false;
                    }
                });
                if (self.mHasOptions()) {
                    self.mData = data;
                    self.mOptions(ko.mapping.fromJS(items)());
                }
            }
            // query
            if (params['tia']) { self.mTicketInsuranceApplicable(false); }
        };
        this.initializeTicketInsurance = function(params, data) {
            currentParams = params;
            if (data.ModelState) {
                self.mErrorMessages(getModelStateMessages(data));
            } else {
                self.mTicketInsuranceCosts(data.Costs);
                self.mTicketInsuranceIsSelected(!!data.IsSelected);
                if (data.Costs && data.Costs.length > 0) {
                    self.mTicketInsuranceCurrency(data.Costs[0].CurrencyCode);
                    self.mTicketInsuranceAmountPerPerson(data.Costs[0].AmountPerPerson);
                }
            }
        };
        this.mAllQuery = function () {
            return ctx.appendQuery('', currentParams || {});
        };

        this.mNext = function () {
            var nextHref = $(arguments[1].currentTarget).attr('href');
            // post data
            var bookingInfoUrl = currentParams['biu'];
            var insuranceBinder = new ctx.countExecuter({
                num: self.mHasOptions()?2:1,
                exec: function () {
                    popupKit.close();
                    ctx.routeApp.goto1(nextHref);
                    // localytics
                    ctx.each(self.mData.Items, function () {
                        if (this.IsSelected) {
                            ctx.intercept.localytics.tagEvent('Insurance (' + this.DisplayName + ') Selected Yes');
                        } else {
                            ctx.intercept.localytics.tagEvent('Insurance (' + this.DisplayName + ') Selected No');
                        }
                    });
                }
            });
        
            if (self.mHasOptions()) {
                // gen data
                self.mData.Items = ko.mapping.toJS(self.mOptions);
                ctx.each(self.mData.Items, function (index, item) {
                    item.Description = ""; //remove potential dangerous markups
                });
                self.mData.GenericInsuranceText = ""; //remove potential dangerous markups
               
                ctx.api.postInsuranceOptions(bookingInfoUrl, self.mData, function (data) {
                    //TODO: post error?
                    if (!data) {
                        insuranceBinder.count();
                    }
                    if (data.ModelState) {
                        self.mErrorMessages(getModelStateMessages(data));
                    } else {
                        insuranceBinder.count();
                    }
                });
            }
            ctx.api.postTicketInsurance(bookingInfoUrl, { IsSelected: self.mTicketInsuranceIsSelected() }, function (data) {
                //TODO: post error?
                if (!data) {
                    insuranceBinder.count();
                }
                if (data.ModelState) {
                    self.mErrorMessages(getModelStateMessages(data));
                } else {
                    insuranceBinder.count();
                }
            });
        };
    };

    //#endregion

    //#region knockout model [summary]

    var ESTAModel = function () {
        var self = this;
        this.Has = ko.observable(false);
        this.Message = ko.observable('');
        this.Checked = ko.observable(true); // ko.observable(false);  now default to true.
        this.Approved = ko.computed(function () {
            return self.Has() ? self.Checked() : true;
        });
    };

    models.summaryModel = function () {
        var self = this;
        // fields
        this.mDepartureAirport = ko.observable({});
        this.mDestinationAirport = ko.observable({});
        this.mDepartureDate = ko.observable('');
        this.mReturnDate = ko.observable('');
        this.mAdults = ko.observable(1);
        this.mChildren = ko.observable(0);
        this.mInfants = ko.observable(0);
        this.mIsReturnTrip = ko.observable(true);
        this.mCosts = ko.observableArray([]);
        this.mCurrency = ko.observable('');
        this.mTotalPrice = ko.observable(0);
        this.mPassengers = ko.observableArray([]);
        this.mContact = new ContactObjModel();
        this.mContactName = ko.observable('');
        this.mContactLand = ko.observable('');
        this.mDiscountCode = ko.observable();
        this.mLastValidDiscountCode = ko.observable();
        this.mDiscountCode.subscribe(function (newCode) {
            if (self.mLastValidDiscountCode() === newCode) {
                self.mDiscountCodeApplicable(true);
            }
            else {
                self.mDiscountCodeApplicable(false);
            }
            self.mIsDiscountCodeChanged(true);
        });
        this.mIsDiscountCodeChanged = ko.observable(false);
        this.mDiscountCodeApplicable = ko.observable(false);
        this.mESTA = new ESTAModel();
        this.mSegments = ko.observableArray([]);
        // other
        this.mShowPopupInfo = popupKit.show;
        this.mErrorMessages = ko.observableArray([]);
        this.mHasError = ko.computed(function () { return self.mErrorMessages().length > 0; });
        this.mTicketInsuranceApplicable = ko.observable(true);
        this.mShowDiscountCodeOptions = function () {
            popupKit.showCore('#Summary_PromotionCodeOptions', { autoScroll: false });
            // localytics
            ctx.intercept.localytics.tagEvent('Voucher Options Opened');
        };
        // init
        var currentParams;
        this.initializeModel = function (params, data) {
            currentParams = params;
            if (data.ModelState) {
                self.mErrorMessages(getModelStateMessages(data));
            } else {
                var mappedModel = ko.mapping.fromJS(data);
                $.extend(self, mappedModel);
                if (data.Inbound) { self.mReturnDate(data.Inbound.DepartureDateTime); }
                if (data.Outbound) { self.mDepartureDate(data.Outbound.DepartureDateTime); }
                self.mDepartureAirport(data.DepartureAirport);
                self.mDestinationAirport(data.DestinationAirport);
                self.mIsReturnTrip(!!data.Inbound);
                // segments
                var outSegments = data.Outbound.Segments, inSegments = data.Inbound ? data.Inbound.Segments : {};
                if (outSegments) {
                    var index = 0, outb, inb;
                    while (true) {
                        outb = outSegments[index]; inb = inSegments[index];
                        if (outb || inb) {
                            index = index + 1;
                            self.mSegments.push({ Outbound: outb, Inbound: inb });
                        } else {
                            break;
                        }
                    }
                }
            }
            // query
            if (params['tia']) { self.mTicketInsuranceApplicable(false); }
        };
        this.initializePassengers = function (data) {
            if (!data.Items) { return; }
            var adtNum = 0, chdNum = 0, infNum = 0, type, pt = ctx.api.PassengerTypeEnum;
            for (var i = 0, len = data.Items.length; i < len; i++) {
                type = data.Items[i].PassengerType;
                if (type === pt.Adult) {
                    adtNum++;
                } else if (type === pt.Child) {
                    chdNum++;
                } else if (type === pt.Infant) {
                    infNum++;
                }
            }
            self.mAdults(adtNum);
            self.mChildren(chdNum);
            self.mInfants(infNum);
            // init mPassengers
            var array = [], options = data.Items, mdl;
            for (var i = 0; i < options.length; i++) {
                array.push(mdl = new PassengerObjModel());
                mdl.initializeModel({}, options[i]);
            }
            self.mPassengers(array);
        };
        this.initializeContact = function (data) {
            self.mContact.initializeModel(data);
        };
        this.initializeTravellers = function (data) {
            if (data && data.Items) {
                var id = self.mContact.TravelerId();
                for (var i = 0, len = data.Items.length; i < len; i++) {
                    if (data.Items[i].Id === id) {
                        self.mContactName(data.Items[i].DisplayName);
                        break;
                    }
                }
            }
        };
        this.initializeCountries = function (data) {
            if (data && data.Countries) {
                var code = self.mContact.CountryCode();
                for (var i = 0, len = data.Countries.length; i < len; i++) {
                    if (data.Countries[i].Code === code) {
                        self.mContactLand(data.Countries[i].DisplayName);
                        break;
                    }
                }
            }
        };
        this.initializeCosts = function (data) {
            if (data && data.Costs) {
                var cost = data.Costs[0];
                if (cost) {
                    self.mCosts(cost.Items);
                    self.mTotalPrice(cost.Total);
                    self.mCurrency(cost.CurrencyCode);
                }
            }
        };
        this.initializeESTA = function (data) {
            if (data && data.Message) {
                self.mESTA.Has(true);
                self.mESTA.Message(data.Message);
            }
        };
        this.initializeVoucherOptions = function (data) {
            //
            if (data && !data.ModelState && data.applicable !== false) {
                if (!!data.DiscountCode) {
                    self.mDiscountCode(data.DiscountCode);
                    self.mLastValidDiscountCode(data.DiscountCode);
                    self.mDiscountCodeApplicable(true);
                }
                else {
                    self.mIsDiscountCodeChanged(true);
                }
            }

        };
        this.mJourneyTitle = ko.computed(function () {
            var dep = this.mDepartureAirport(), des = this.mDestinationAirport();
            if (dep && des) {
                return dep.City + ' - ' + des.City;
            } else {
                return '';
            }
        }, this);

        this.mAllQuery = function () {
            return ctx.appendQuery('', currentParams || {});
        };
        this.mCheckDiscountCode = function (data, event) {
            //event.target.focus();
            var code = ctx.trim(self.mDiscountCode());
            if (!code) {
                return;
            }
            ctx.api.voucherDiscountCodes(currentParams['biu'], { DiscountCode: code }, function (data) {
                self.mIsDiscountCodeChanged(false);
                if (data && !data.ModelState) {
                    self.mDiscountCodeApplicable(true);
                    self.mLastValidDiscountCode(code);
                    // localytics
                    ctx.intercept.localytics.tagEvent('Voucher Code Success');
                } else {
                    self.mDiscountCodeApplicable(false);
                    // localytics
                    ctx.intercept.localytics.tagEvent('Voucher Code Failured');
                }
            });
        };
        this.mUpdateCosts = function () {
            var bookingInfoUrl = currentParams['biu'];
            ctx.api.costs(bookingInfoUrl, function (data) {
                self.initializeCosts(data);
            });
            popupKit.close();
        };

        this.mNext = function () {
            var nextHref = $(arguments[1].currentTarget).attr('href');
            if (self.mESTA.Has()) {
                if (self.mESTA.Checked()) {
                    //TODO: send email?
                    ctx.routeApp.goto1(nextHref);
                }
            } else {
                ctx.routeApp.goto1(nextHref);
            }
        };
    };

    //#endregion

    //#region knockout model [paymentOptions]

    var PaymentOption = function () {
        this.DisplayName = ko.observable('');
        this.NextUrl = ko.observable('');
        this.Costs = ko.observable(0);
    };

    models.paymentOptionsModel = function () {
        var self = this;
        // fields
        this.mOptions = ko.observableArray([]);
        this.mSelectedLink = ko.observable('');
        // other
        this.mErrorMessages = ko.observableArray([]);
        this.mHasError = ko.computed(function () { return self.mErrorMessages().length > 0; });
        this.mTicketInsuranceApplicable = ko.observable(true);
        // init
        var currentParams;
        this.initializeModel = function (params, data) {
            currentParams = params;
            if (data.ModelState) {
                self.mErrorMessages(getModelStateMessages(data));
            } else {
                var item, opt, options = [];
                for (var i = 0, len = data._embedded.Options.length; i < len; i++) {
                    item = data._embedded.Options[i];
                    options.push(opt = new PaymentOption());
                    opt.NextUrl(item._links.next.href);
                    opt.DisplayName(item.DisplayName);
                    opt.Costs(item.Costs);
                }
                self.mOptions(options);
            }
            // query
            if (params['tia']) { self.mTicketInsuranceApplicable(false); }
        };

        this.mAllQuery = function () {
            return ctx.appendQuery('', currentParams || {});
        };

        var isValid = function () {
            var messages = [];
            ctx.each(self, function (j, obs) {
                if ((obs.hasMethod && obs.hasMethod()) || (obs instanceof ComboModel)) {
                    messages = messages.concat(obs.errorMessages());
                }
            });
            self.mErrorMessages(messages);
            return !self.mHasError();
        };

        this.mNext = function () {
            // do valid
            if (!isValid()) { return; }
            // gen data
            var link = self.mSelectedLink();
            // post data
            var nextHref = $(arguments[1].currentTarget).attr('href');
            ctx.api.selectPaymentOption(link, function (data) {
                if (data.ModelState) {
                    self.mErrorMessages(getModelStateMessages(data));
                } else {
                    ctx.routeApp.goto1(nextHref, { 'piu': link });
                    // localytics
                    ctx.intercept.localytics.tagEvent('Payment Options Selected');
                }
            });
            // ret
            return true;
        };
    };

    //#endregion

    //#region knockout model [companyConditions]

    models.companyConditionsModel = function () {
        var self = this;
        // field
        this.mIsCompanyConditionAgreed = ko.observable(false);
        // other
        this.mShowPopupInfo = popupKit.show;
        this.mErrorMessages = ko.observableArray([]);
        this.mHasError = ko.computed(function () { return self.mErrorMessages().length > 0; });
        this.mTicketInsuranceApplicable = ko.observable(true);
        // init
        var currentParams;
        this.initializeModel = function (params, data) {
            currentParams = params;
            if (data.ModelState) {
                self.mErrorMessages(getModelStateMessages(data));
            } else {
                self.mIsCompanyConditionAgreed(!!data.IsCompanyConditionAgreed);
            }
            // query
            if (params['tia']) { self.mTicketInsuranceApplicable(false); }
        };

        this.mAllQuery = function () {
            var copy = $.extend({}, currentParams);
            try { delete copy['piu']; } catch (ex) { }
            return ctx.appendQuery('', copy);
        };

        this.mNextQuery = function () {
            return ctx.appendQuery('', currentParams || {});
        };

        this.mNext = function () {
            popupKit.close();
            // gen data
            self.mIsCompanyConditionAgreed(true); // default to 'true'
            var postData = { IsCompanyConditionAgreed: self.mIsCompanyConditionAgreed() };
            // post data
            var bookingInfoUrl = currentParams['biu'], nextHref = $(arguments[1].currentTarget).attr('href');
            ctx.api.postCompanyConditions(bookingInfoUrl, postData, function (data) {
                if (data && data.ModelState) {
                    self.mErrorMessages(getModelStateMessages(data));
                } else {
                    ctx.routeApp.goto1(nextHref);
                    // localytics
                    ctx.intercept.localytics.tagEvent('Company Conditions Checked');
                }
            });
        };
    };
    //#endregion

    //#region knockout model [payment]

    models.paymentModel = function () {
        var self = this;
        // field
        this.mPaymentGatwayUrl = ko.observable('');
        // other
        this.mErrorMessages = ko.observableArray([]);
        this.mHasError = ko.computed(function () { return self.mErrorMessages().length > 0; });
        this.mTicketInsuranceApplicable = ko.observable(true);
        // init
        var currentParams, showed = false;
        this.initializeModel = function (params, data) {
            currentParams = params;
            if (data.ModelState) {
                self.mErrorMessages(getModelStateMessages(data));
            } else {
                self.mPaymentGatwayUrl(ctx.appendQuery(data.gateway, '_', $.now()));
                ctx.frameLoading.show();
                showed = true;
            }
            // query
            if (params['tia']) { self.mTicketInsuranceApplicable(false); }
        };

        var hided = false;
        this.mOnload = function () {
            if (!hided && showed) {
                hided = true;
                ctx.frameLoading.hide();
            }
        };

        this.mPrevQuery = function () {
            return ctx.appendQuery('', currentParams || {});
        };

        this.mAllQuery = function () {
            return ctx.appendQuery('', 'biu', currentParams['biu']);
        };
    };
    //#endregion

    //#region knockout model [confirmation]

    models.confirmationModel = function () {
        var self = this;
        // field
        this.mContactEmail = ko.observable('');
        this.mNumberOfAdults = ko.observable(0);
        this.mNumberOfChildren = ko.observable(0);
        this.mNumberOfInfants = ko.observable(0);
        this.mOutbound = null;
        this.mInbound = null;
        this.mOrderNumber = ko.observable('');
        this.mBookedStateOK = ko.observable(null);
        this.mBookState = ko.observable('');
        // other
        this.mJourney = ko.observable('');
        this.mIsReturnTrip = ko.observable(false);
        this.mErrorMessages = ko.observableArray([]);
        this.mHasError = ko.computed(function () { return self.mErrorMessages().length > 0; });
        // init
        var currentParams;
        this.initializeModel = function (params, data) {
            currentParams = params;
            if (data.ModelState) {
                self.mErrorMessages(getModelStateMessages(data));
            } else {
                switch (data.State) {
                    case ctx.api.OrderStateEnum.OrderOk:
                        // fill
                        self.mBookedStateOK(true);
                        self.mContactEmail(data._embedded.Contact.Email);
                        self.mNumberOfAdults(data.Products[0].NumberOfAdults);
                        self.mNumberOfChildren(data.Products[0].NumberOfChildren);
                        self.mNumberOfInfants(data.Products[0].NumberOfInfants);
                        self.mOutbound = ko.mapping.fromJS(data.Products[0].Outbound);
                        self.mInbound = ko.mapping.fromJS(data.Products[0].Inbound);
                        self.mOrderNumber(data.ReservationId);
                        // other
                        self.mIsReturnTrip(!!data.Products[0].Inbound);
                        //
                        var fromDist = data.Products[0].Outbound.DepartureAirport.DisplayName, fromCity = splitCityName(fromDist);
                        var toDist = data.Products[0].Outbound.ArrivalAirport.DisplayName, toCity = splitCityName(toDist);
                        self.mJourney((fromCity || fromDist) + ' - ' + (toCity || toDist));
                        // localytics
                        ctx.intercept.localytics.tagEvent('Confirmation Order OK');
                        break;

                    case ctx.api.OrderStateEnum.OrderNotOk:
                    case ctx.api.OrderStateEnum.PaymentFailed:
                    case ctx.api.OrderStateEnum.PaymentPending:
                        self.mBookedStateOK(false);
                        self.mBookState(data.State);
                        self.mOrderNumber(data.ReservationId);
                        // localytics
                        ctx.intercept.localytics.tagEvent('Confirmation Order NotOK');
                        break;

                    case ctx.api.OrderStateEnum.OrderOpenNotPaid:
                    case ctx.api.OrderStateEnum.PaymentCancelled:
                        self.mBookedStateOK(null);
                        self.toPayment.dispatch();
                        // localytics
                        ctx.intercept.localytics.tagEvent('Return To PayemntOptions');
                        break;
                };
            }
        };

        // book extra
        this.mBookExtra = function () {
            // localytics
            ctx.intercept.localytics.tagEvent('Book Extra Selected');
            // bubble
            return true;
        };

        // share
        this.mShare = function () {
            // localytics
            ctx.intercept.localytics.tagEvent('Share Selected');
            // bubble
            return true;
        };

        // event
        this.toPayment = new ctx.dispatcher(this);

        // go home
        this.mPrev = function () {
            var prevHref = $(arguments[1].currentTarget).attr('href');
            prevHref = ctx.httpUrl(prevHref);
            ctx.routeApp.goto1(prevHref);
            //return true;
        };
    };
    //#endregion

}(jQuery, travixmob));
