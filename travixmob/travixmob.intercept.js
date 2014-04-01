/*
* intercept
*/

(function ($, ctx) {

    // namespance
    var intercept = ctx.intercept = {
        tagmanSet: {
            enable: ctx.tagmanEnabled || false
        },
        localyticsSet: {
            enable: window.CMS.localyticsEnabled,
            appKey: window.CMS.localyticsAppKey
        },
        optimizelySet: {
            enable: window.CMS.currentSiteName.toLowerCase() === 'cheaptickets-mobile~de'//hard coded for now
        }
    };

    //#region tagman

    intercept.tagman = function () {
        // closure
        var set = intercept.tagmanSet;
        // outer func
        return {
            fire: function (triggerName, initArgs) {
                if (set.enable && ctx.tagmanTriggers) {
                    var trigger = ctx.tagmanTriggers[triggerName];
                    if (trigger) {
                        trigger.initalize.apply(trigger, ctx.arg2arr(initArgs));
                        trigger.fire();
                    }
                }
            },
            tagHome: function () {
                this.fire('homeTrigger', arguments);
            },
            tagResults: function () {
                this.fire('flightResultsTrigger', arguments);
            },
            tagDetails: function () {
                this.fire('bookingDetailsTrigger', arguments);
            },
            tagTicketInsurance: function () {
                this.fire('ticketInsuranceTrigger', arguments);
            },
            tagPassengers: function () {
                this.fire('passengersTrigger', arguments);
            },
            tagContact: function () {
                this.fire('contactTrigger', arguments);
            },
            tagInsurance: function () {
                this.fire('insuranceTrigger', arguments);
            },
            tagSummary: function () {
                this.fire('summaryTrigger', arguments);
            },
            tagPaymentOptions: function () {
                this.fire('paymentOptionsTrigger', arguments);
            },
            tagConditions: function () {
                this.fire('conditionsTrigger', arguments);
            },
            tagPaymentDetails: function () {
                this.fire('paymentDetailsTrigger', arguments);
            },
            tagConfirmation: function () {
                this.fire('confirmationTrigger', arguments);
            }
        };
    }();

    //#endregion

    //#region localytics

    /*
    * related doc:
    * http://www.localytics.com/docs/sdks-integration-guides/?p=web
    */

    intercept.localytics = function () {
        // setting
        var set = intercept.localyticsSet;
        // closure
        var session, withSession = function () {
            if (!set.enable) { return; }
            if (session) { return session; }
            if (set.appKey && window.LocalyticsSession) {
                var s = LocalyticsSession(set.appKey, {
                    appVersion: 'v1.0',
                    //networkCarrier: 'AT&T',
                    polling: 10000,
                    uploadTimeout: 60000,
                    sessionTimeoutSeconds: 30,
                    storage: 100000,
                    logger: false
                });
                s.open();
                return s;
            }
        };
        // outer func
        return {
            tagEvent: function (event, attrs) {
                if (session = withSession()) {
                    session.tagEvent(event, attrs);
                    session.upload();
                    return session;
                }
            },
            tagOnload: function (page, attrs) {
                this.tagEvent(page + ' Page Loaded', attrs);
            }
        };
    }();

    //#endregion

    //#region optimizely

    intercept.optimizely = function () {
        var set = intercept.optimizelySet;
        return {
            activateExperiments: function () {//FRB-422
                if (set.enable) {
                    window['optimizely'] = window['optimizely'] || [];
                    var activate_experiments = activate_experiments || [];
                    for (var exp in window['activate_experiments']) {
                        window['optimizely'].push(["activate", activate_experiments[exp]]);
                        console.log(activate_experiments[exp]);
                    }
                }
            }
        };
    }();

    //#endregion
}(jQuery, travixmob));
