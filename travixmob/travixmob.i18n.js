/*
* i18n
*/

(function ($, ctx) {

    // namespace
    var i18n = ctx.i18n = function () {
        //#region internationalization
        var langs = {}, currLang;
        return {
            regional: langs,
            current: function () {
                return currLang;
            },
            get: function (key) {
                return ctx.readObj(this.current(), key);
            },
            setDefaults: function (lang) {
                currLang = $.type(lang) === 'string' ? langs[lang] : lang;
            }
        };
        //#endregion
    } ();

    // register nl default

    var labels = window.CMS.labels || {};

    i18n.regional['nl-NL'] = {
        Name: 'nl-NL',
        monthNames: ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'],
        monthNamesShort: ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'],
        //
        flightDuration: { hour: 'u.', minute: 'min.' },
        //
        browserNotSupportMessage: 'Not support IE6,IE7',
        APIRequestFailure: labels.requestAPIFailure,
        APIRequestTimeout: 'APIRequestTimeout',
        APIResourceNotFound: labels.APIResourceNotFound,
        APINotApplicable: 'APINotApplicable',
        //
        flightNotBookableMessage: labels.flightNotBookableMessage,
        noSearchResultMessage: labels.noSearchResultMessage,
        //
        FlightStopsDirect: labels.FlightStopsDirect,
        FlightStopsStile: labels.FlightStopsStile,
        FlightStopsStiles: labels.FlightStopsStiles,
        //
        MaleTitle: labels.MaleTitle,
        FemaleTitle: labels.FemaleTitle,
        //
        BaggageService: labels.BaggageService,
        SpeedyBoarding: labels.SpeedyBoarding,
        MealOptions: labels.MealOptions,
        SeatOptions: labels.SeatOptions
    };

    if (labels.monthNames) {
        i18n.regional['nl-NL'].monthNames = [
            labels.monthNames.January,
            labels.monthNames.February,
            labels.monthNames.March,
            labels.monthNames.April,
            labels.monthNames.May,
            labels.monthNames.June,
            labels.monthNames.July,
            labels.monthNames.August,
            labels.monthNames.September,
            labels.monthNames.October,
            labels.monthNames.November,
            labels.monthNames.December];
    }

    if (labels.monthNamesShort) {
        i18n.regional['nl-NL'].monthNamesShort = [
            labels.monthNamesShort.January,
            labels.monthNamesShort.February,
            labels.monthNamesShort.March,
            labels.monthNamesShort.April,
            labels.monthNamesShort.May,
            labels.monthNamesShort.June,
            labels.monthNamesShort.July,
            labels.monthNamesShort.August,
            labels.monthNamesShort.September,
            labels.monthNamesShort.October,
            labels.monthNamesShort.November,
            labels.monthNamesShort.December];
    }

    // apply default
    i18n.setDefaults('nl-NL');

} (jQuery, travixmob));
