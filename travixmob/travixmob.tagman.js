(function ($, ctx) {

    var triggers = ctx.tagmanTriggers = {};
    if (window.tmParam) { ctx.tagmanEnabled = true; }

    //#region helpers
    var dateStrFormat = "{0}-{1}-{2}";//0:year 1:month 2:day
    var timeStrFormat = "{0}:{1}";//0:hour 1:minute
    function getDaysBetween(date1, date2) {
        var ONE_DAY = 1000 * 60 * 60 * 24;
        var date1_ms = date1.getTime();
        var date2_ms = date2.getTime();
        var difference_ms = Math.abs(date1_ms - date2_ms);
        return Math.round(difference_ms / ONE_DAY);
    }
    function getDateString(dateTime) {
        return ctx.format(dateStrFormat, dateTime.getUTCFullYear(), ctx.padLeft(dateTime.getUTCMonth() + 1, 2, '0'), dateTime.getUTCDate());
    }
    function getTimeString(dateTime) {
        var hour = dateTime.getUTCHours(), minute = dateTime.getUTCMinutes();
        return ctx.format(timeStrFormat, ctx.padLeft(hour, 2, '0'), ctx.padLeft(minute, 2, '0'));
    }
    //#endregion

    var pages = {
        home: "MOB_HOME_PAGE_TRIGGER",
        flightResults: "MOB_SEARCH_RESULTS_PAGE_TRIGGER",
        bookingDetails: "MOB_FLIGHT_DETAIL_PAGE_TRIGGER",
        ticketInsurance: "MOB_TICKET_INSURANCE_PAGE_TRIGGER",
        passengers: "MOB_PASSENGERS_DETAIL_PAGE_TRIGGER",
        contact: "MOB_CONTACT_DETAILS_PAGE_TRIGGER",
        insurance: "MOB_INSURANCES_PAGE_TRIGGER",
        summary: "MOB_BOOKING_OVERVIEW_PAGE_TRIGGER",
        paymentOptions: "MOB_PAYMENT_PAGE_TRIGGER",
        conditions:"MOB_CONDITIONS_PAGE_TRIGGER ",
        paymentDetails: "MOB_PAYMENT_DETAIL_PAGE_TRIGGER",
        confirmation: "MOB_CONFIRMATION_PAGE_TRIGGER"
    };

    //#region baseTrigger
    var Trigger = function (name) {
        this.Name = name;
        this.Options = {};
        this.Initialized = false;
    };
    Trigger.prototype.fire = function () {
        if (window.TAGMAN && window.TAGMAN.fireEvent) {
            tmParam.page_type = this.Options.page_name;
            window.TAGMAN.fireEvent(this.Name, this.Options);
        };
    };
    //#endregion

    //#region homeTrigger
    var homeTrigger = triggers.homeTrigger = new Trigger(pages.home);
    homeTrigger.initalize = function (data) {
        this.Options = {
            page_name: 'mob home'
        };
        this.Initialized = true;
    };
    //#endregion

    //#region flightResultsTrigger
    var flightResultsTrigger = triggers.flightResultsTrigger = new Trigger(pages.flightResults);
    flightResultsTrigger.initalize = function (data, rawData) {
        var departureDate = getDateString(ctx.parseDateStr(data.mDepartureDate()));
        var departureTime = "";
        var departureAirLineName = "";
        var productPrice = "";
        for (var i = 0; i < 3 && i < data.mOptions().length; i++) {
            var option = data.mOptions()[i];
            var dateTimeString = ctx.parseDateStr(option.Outbound.DepartureDateTime);
            var time = getTimeString(dateTimeString);
            departureTime += time;
            departureTime += "|";
            var airlineName = option._embedded.Carrier.DisplayName;
            departureAirLineName += airlineName;
            departureAirLineName += "|";
            var price = option.Fares[0].Total;
            productPrice += price;
            productPrice += "|";
        }
      
        var returnDate = "";
        var returnTime = "";
        var returnAirlineName = "";
        var duarationDays = "";
        if (data.mIsReturnTrip()) {
            returnDate = getDateString(ctx.parseDateStr(data.mReturnDate()));
            duarationDays = getDaysBetween(new Date(departureDate), new Date(returnDate));
            for (var i = 0; i < 3 && i < data.mOptions().length; i++) {
                var option = data.mOptions()[i];
                var dateTimeString = ctx.parseDateStr(option.Inbound.DepartureDateTime);
                var time = getTimeString(dateTimeString);
                returnTime += time;
                returnTime += "|";
                var airlineName = option._embedded.Carrier.DisplayName;
                returnAirlineName += airlineName;
                returnAirlineName += "|";
            }
        }
        
        var cabinClass = ctx.getQuery(window.location.href, "cls");

        var departureAirport = data.mDeparture.Value();
        var departureCityName = rawData.DepartureAirport.City;
        var departureCountryCode = rawData.DepartureAirport.CountryCode;
        var departureCountryName = "";
        var destinationCountryName = "";
        if (rawData._embedded.Options.length > 0) {
            var departureDisplayName = rawData._embedded.Options[0].Outbound.DepartureAirport.DisplayName;
            var destinationDisplayName = rawData._embedded.Options[0].Outbound.ArrivalAirport.DisplayName;
            if (!!departureDisplayName) {
                departureDisplayName = departureDisplayName.split(',');
                if (departureDisplayName.length >= 3) {
                    departureCountryName = ctx.trim(departureDisplayName[2]);
                }
            }
            if (!!destinationDisplayName) {
                destinationDisplayName = destinationDisplayName.split(',');
                if (destinationDisplayName.length >= 3) {
                    destinationCountryName = ctx.trim(destinationDisplayName[2]);
                }
            }
        }

        var destinationAirport = data.mDestination.Value();
        var destinationCityName = rawData.DestinationAirport.City;
        var destinationCountryCode = rawData.DestinationAirport.CountryCode;

        var travelType = data.mIsReturnTrip() ? "return trip" : "one way";
        var numberOfPassengers = parseInt(data.mAdults()) + parseInt(data.mChildren()) + parseInt(data.mInfants());
        var numberOfTickets = parseInt(data.mAdults()) + parseInt(data.mChildren());
        this.Options = {
            page_name: 'mob search',
            departure_date: departureDate,
            departure_time: departureTime,
            return_date: returnDate,
            return_time: returnTime,
            travel_duration_days: duarationDays,
            cabin_class: cabinClass,
            travel_type: travelType,
            departure_airport: departureAirport,
            destination_aiport: destinationAirport,
            departure_city_name: departureCityName,
            destination_city_name: destinationCityName,
            departure_country_code: departureCountryCode,
            destination_country_code: destinationCountryCode,
            departure_country_name: departureCountryName,
            destination_country_name: destinationCountryName,
            departure_airline_name: departureAirLineName,
            return_airline_name: returnAirlineName,
            product_code: '',
            product_price: productPrice,
            product_url: '',
            product_photo: '',
            number_of_passengers: numberOfPassengers,
            number_of_tickets: numberOfTickets
        };
        this.Initialized = true;
    };
    //#endregion

    //#region bookingDetailsTrigger
    var bookingDetailsTrigger = triggers.bookingDetailsTrigger = new Trigger(pages.bookingDetails);
    bookingDetailsTrigger.initalize = function (data, rawData) {
        var departureDateTime = ctx.parseDateStr(data.mDepartureDate());
        var departureDate = getDateString(departureDateTime);
        var departureTime = getTimeString(departureDateTime);
        var returnDateTime = ctx.parseDateStr(data.mReturnDate());
        var returnDate = "";
        var returnTime = "";
        var duarationDays = "";
        if (data.mIsReturnTrip()) {
            returnDate = getDateString(ctx.parseDateStr(data.mReturnDate()));
            returnTime = getTimeString(returnDateTime);
            duarationDays = getDaysBetween(new Date(departureDate), new Date(returnDate));
        }
        
        var cabinClass="";
        if (flightResultsTrigger.Initialized) {
            var options = flightResultsTrigger.Options;
            cabinClass = options.cabin_class;
        }

        var departureAirport = data.mDepartureAirport().Code;
        var departureCityName = data.mDepartureAirport().City;
        var departureCountryCode = data.mDepartureAirport().CountryCode;

        var destinationAirport = data.mDestinationAirport().Code;
        var destinationCityName = data.mDestinationAirport().City;
        var destinationCountryCode = data.mDestinationAirport().CountryCode;
        
        var departureCountryName = "";
        var destinationCountryName = "";
        
        var productCode = "";
        
        if (rawData && rawData.Outbound) {
            var departureDisplayName = rawData.Outbound.DepartureAirport.DisplayName;
            var destinationDisplayName = rawData.Outbound.ArrivalAirport.DisplayName;
            if (!!departureDisplayName) {
                departureDisplayName = departureDisplayName.split(',');
                if (departureDisplayName.length >= 3) {
                    departureCountryName = ctx.trim(departureDisplayName[2]);
                }
            }
            if (!!destinationDisplayName) {
                destinationDisplayName = destinationDisplayName.split(',');
                if (destinationDisplayName.length >= 3) {
                    destinationCountryName = ctx.trim(destinationDisplayName[2]);
                }
            }
            $.each(rawData.Outbound.Segments, function (index, option) {
                var carrierCode = option.Carrier.Code;
                var number = option.FlightNumber;
                productCode += (carrierCode + number) + "|";
            });
            productCode = productCode.substring(0, productCode.length - 1);
        }

        var departureAirlineName = data.Carrier.DisplayName();
        var returnAirlineName = data.Carrier.DisplayName();

        var carrierLogo = data.Carrier.Logo();
        var ticketPrice = data.mTicketPrice();

        var travelType = data.mIsReturnTrip() ? "return trip" : "one way";
        var numberOfPassengers = parseInt(data.mAdults()) + parseInt(data.mChildren()) + parseInt(data.mInfants());
        var numberOfTickets = parseInt(data.mAdults()) + parseInt(data.mChildren());

        
        
        this.Options = {
            page_name: 'mob flight detail',
            departure_date: departureDate,
            departure_time: departureTime,
            return_date: returnDate,
            return_time: returnTime,
            travel_duration_days: duarationDays,
            cabin_class: cabinClass,
            travel_type: travelType,
            departure_airport: departureAirport,
            destination_aiport: destinationAirport,
            departure_city_name: departureCityName,
            destination_city_name: destinationCityName,
            departure_country_code: departureCountryCode,
            destination_country_code: destinationCountryCode,
            departure_country_name: departureCountryName,
            destination_country_name: destinationCountryName,
            departure_airline_name: departureAirlineName,
            return_airline_name: returnAirlineName,
            product_code: productCode,
            product_price: ticketPrice,
            product_url: '',
            product_photo: "",
            number_of_passengers: numberOfPassengers,
            number_of_tickets: numberOfTickets
        };
        this.Initialized = true;
    };
    //#endregion

    //#region ticketInsuranceTrigger
    var ticketInsuranceTrigger = triggers.ticketInsuranceTrigger = new Trigger(pages.ticketInsurance);
    ticketInsuranceTrigger.initalize = function (data) {
        var departureDate = "";
        var departureTime = "";
        var returnDate = "";
        var returnTime = "";
        var duarationDays = "";
        var cabinClass = "";
        var departureAirport = "";
        var departureCityName  = "";
        var departureCountryCode = "";
        var destinationAirport = "";
        var destinationCityName = "";
        var destinationCountryCode = "";
        
        var departureCountryName = "";
        var destinationCountryName = "";
        
        var carrier = "";
        var carrierLogo = "";
        var ticketPrice = "";
        var totalPrice = "";
        var travelType = "";
        var numberOfPassengers = "";
        var numberOfTickets = "";
        
        var productCode = "";
        
        if (bookingDetailsTrigger.Initialized) {
            var options = bookingDetailsTrigger.Options;
            departureDate = options.departure_date;
            departureTime = options.departure_time;
            returnDate = options.return_date;
            returnTime = options.return_time;
            duarationDays = options.travel_duration_days;
            cabinClass = options.cabin_class;
            departureAirport = options.departure_airport;
            departureCityName = options.departure_city_name;
            departureCountryCode = options.departure_country_code;
            destinationAirport = options.destination_aiport;
            destinationCityName = options.destination_city_name;
            destinationCountryCode = options.destination_country_code;
            departureCountryName = options.departure_country_name;
            destinationCountryName = options.destination_country_name;
            carrier = options.departure_airline_name;
            carrierLogo = options.product_photo;
            ticketPrice = options.product_price;
            travelType = options.travel_type;
            numberOfPassengers = options.number_of_passengers;
            numberOfTickets = options.number_of_tickets;

            productCode = options.product_code;
        }
        this.Options = {
            page_name: 'mob ticket insurance',
            departure_date: departureDate,
            departure_time: departureTime,
            return_date: returnDate,
            return_time: returnTime,
            travel_duration_days: duarationDays,
            cabin_class: cabinClass,
            travel_type: travelType,
            departure_airport: departureAirport,
            destination_aiport: destinationAirport,
            departure_city_name: departureCityName,
            destination_city_name: destinationCityName,
            departure_country_code: departureCountryCode,
            destination_country_code: destinationCountryCode,
            departure_country_name: departureCountryName,
            destination_country_name: destinationCountryName,
            departure_airline_name: carrier,
            return_airline_name: carrier,
            product_code: productCode,
            product_price: ticketPrice,
            product_url: '',
            product_photo: "",
            basket_total: totalPrice,
            number_of_passengers: numberOfPassengers,
            number_of_tickets: numberOfTickets
        };
        this.Initialized = true;
    };
    //#endregion

    //#region passengersTrigger
    var passengersTrigger = triggers.passengersTrigger = new Trigger(pages.passengers);
    passengersTrigger.initalize = function (data) {
        var departureDate = "";
        var departureTime = "";
        var returnDate = "";
        var returnTime = "";
        var duarationDays = "";
        var cabinClass = "";
        var departureAirport = "";
        var departureCityName = "";
        var departureCountryCode = "";
        var destinationAirport = "";
        var destinationCityName = "";
        var destinationCountryCode = "";
        
        var departureCountryName = "";
        var destinationCountryName ="";
        
        var departureAirlineName = "";
        var returnAirlineName = "";
        var carrierLogo = "";
        var ticketPrice = "";
        var totalPrice = "";
        var travelType = "";
        var numberOfPassengers = "";
        var numberOfTickets = "";
        var productCode = "";
        if (bookingDetailsTrigger.Initialized) {
            var options = bookingDetailsTrigger.Options;
            departureDate = options.departure_date;
            departureTime = options.departure_time;
            returnDate = options.return_date;
            returnTime = options.return_time;
            duarationDays = options.travel_duration_days;
            cabinClass = options.cabin_class;
            departureAirport = options.departure_airport;
            departureCityName = options.departure_city_name;
            departureCountryCode = options.departure_country_code;
            destinationAirport = options.destination_aiport;
            destinationCityName = options.destination_city_name;
            destinationCountryCode = options.destination_country_code;
            departureCountryName = options.departure_country_name;
            destinationCountryName = options.destination_country_name;
            
            departureAirlineName = options.departure_airline_name;
            returnAirlineName = options.return_airline_name;

            carrierLogo = options.product_photo;
            ticketPrice = options.product_price;
            travelType = options.travel_type;
            numberOfPassengers = options.number_of_passengers;
            numberOfTickets = options.number_of_tickets;
            
            productCode = options.product_code;
        }
        this.Options = {
            page_name: 'mob passenger detail',
            departure_date: departureDate,
            departure_time: departureTime,
            return_date: returnDate,
            return_time: returnTime,
            travel_duration_days: duarationDays,
            cabin_class: cabinClass,
            travel_type: travelType,
            departure_airport: departureAirport,
            destination_aiport: destinationAirport,
            departure_city_name: departureCityName,
            destination_city_name: destinationCityName,
            departure_country_code: departureCountryCode,
            destination_country_code: destinationCountryCode,
            departure_country_name: departureCountryName,
            destination_country_name: destinationCountryName,
            departure_airline_name: departureAirlineName,
            return_airline_name: returnAirlineName,
            product_code: productCode,
            product_price: ticketPrice,
            product_url: '',
            product_photo: "",
            basket_total: totalPrice,
            number_of_passengers: numberOfPassengers,
            number_of_tickets: numberOfTickets
        };
        this.Initialized = true;
    };
    //#endregion

    //#region contactTrigger
    var contactTrigger = triggers.contactTrigger = new Trigger(pages.contact);
    contactTrigger.initalize = function (data) {
        var departureDate = "";
        var departureTime = "";
        var returnDate = "";
        var returnTime = "";
        var duarationDays = "";
        var cabinClass = "";
        var departureAirport = "";
        var departureCityName = "";
        var departureCountryCode = "";
        var destinationAirport = "";
        var destinationCityName = "";
        var destinationCountryCode = "";
        var departureCountryName = "";
        var destinationCountryName = "";
        var departureAirlineName = "";
        var returnAirlineName = "";
        var carrierLogo = "";
        var ticketPrice = "";
        var totalPrice = "";
        var travelType = "";
        var numberOfPassengers = "";
        var numberOfTickets = "";

        var productCode = "";
        if (passengersTrigger.Initialized) {
            var options = passengersTrigger.Options;
            departureDate = options.departure_date;
            departureTime = options.departure_time;
            returnDate = options.return_date;
            returnTime = options.return_time;
            duarationDays = options.travel_duration_days;
            cabinClass = options.cabin_class;
            departureAirport = options.departure_airport;
            departureCityName = options.departure_city_name;
            departureCountryCode = options.departure_country_code;
            destinationAirport = options.destination_aiport;
            destinationCityName = options.destination_city_name;
            destinationCountryCode = options.destination_country_code;
            departureCountryName = options.departure_country_name;
            destinationCountryName = options.destination_country_name;
            departureAirlineName = options.departure_airline_name;
            returnAirlineName = options.return_airline_name;
            carrierLogo = options.product_photo;
            ticketPrice = options.product_price;
            travelType = options.travel_type;
            numberOfPassengers = options.number_of_passengers;
            numberOfTickets = options.number_of_tickets;
            
            productCode = options.product_code;
        }
        this.Options = {
            page_name: 'mob contact detail',
            departure_date: departureDate,
            departure_time: departureTime,
            return_date: returnDate,
            return_time: returnTime,
            travel_duration_days: duarationDays,
            cabin_class: cabinClass,
            travel_type: travelType,
            departure_airport: departureAirport,
            destination_aiport: destinationAirport,
            departure_city_name: departureCityName,
            destination_city_name: destinationCityName,
            departure_country_code: departureCountryCode,
            destination_country_code: destinationCountryCode,
            departure_country_name: departureCountryName,
            destination_country_name: destinationCountryName,
            departure_airline_name: departureAirlineName,
            return_airline_name: returnAirlineName,
            product_code: productCode,
            product_price: ticketPrice,
            product_url: '',
            product_photo: "",
            basket_total: totalPrice,
            number_of_passengers: numberOfPassengers,
            number_of_tickets: numberOfTickets
        };
        this.Initialized = true;
    };
    //#endregion

    //#region insuranceTrigger
    var insuranceTrigger = triggers.insuranceTrigger = new Trigger(pages.insurance);
    insuranceTrigger.initalize = function (data) {
        var departureDate = "";
        var departureTime = "";
        var returnDate = "";
        var returnTime = "";
        var duarationDays = "";
        var cabinClass = "";
        var departureAirport = "";
        var departureCityName = "";
        var departureCountryCode = "";
        var destinationAirport = "";
        var destinationCityName = "";
        var destinationCountryCode = "";
        var departureCountryName = "";
        var destinationCountryName = "";
        var departureAirlineName = "";
        var returnAirlineName = "";
        var carrierLogo = "";
        var ticketPrice = "";
        var totalPrice = "";
        var travelType = "";
        var numberOfPassengers = "";
        var numberOfTickets = "";

        var productCode = "";
        if (contactTrigger.Initialized) {
            var options = contactTrigger.Options;
            departureDate = options.departure_date;
            departureTime = options.departure_time;
            returnDate = options.return_date;
            returnTime = options.return_time;
            duarationDays = options.travel_duration_days;
            cabinClass = options.cabin_class;
            departureAirport = options.departure_airport;
            departureCityName = options.departure_city_name;
            departureCountryCode = options.departure_country_code;
            destinationAirport = options.destination_aiport;
            destinationCityName = options.destination_city_name;
            destinationCountryCode = options.destination_country_code;
            departureCountryName = options.departure_country_name;
            destinationCountryName = options.destination_country_name;
            departureAirlineName = options.departure_airline_name;
            returnAirlineName = options.return_airline_name;
            carrierLogo = options.product_photo;
            ticketPrice = options.product_price;
            travelType = options.travel_type;
            numberOfPassengers = options.number_of_passengers;
            numberOfTickets = options.number_of_tickets;
            
            productCode = options.product_code;
        }
        this.Options = {
            page_name: 'mob insurances',
            departure_date: departureDate,
            departure_time: departureTime,
            return_date: returnDate,
            return_time: returnTime,
            travel_duration_days: duarationDays,
            cabin_class: cabinClass,
            travel_type: travelType,
            departure_airport: departureAirport,
            destination_aiport: destinationAirport,
            departure_city_name: departureCityName,
            destination_city_name: destinationCityName,
            departure_country_code: departureCountryCode,
            destination_country_code: destinationCountryCode,
            departure_country_name: departureCountryName,
            destination_country_name: destinationCountryName,
            departure_airline_name: departureAirlineName,
            return_airline_name: returnAirlineName,
            product_code: productCode,
            product_price: ticketPrice,
            product_url: '',
            product_photo: "",
            basket_total: totalPrice,
            number_of_passengers: numberOfPassengers,
            number_of_tickets: numberOfTickets
        };
        this.Initialized = true;
    };
    //#endregion

    //#region summaryTrigger
    var summaryTrigger = triggers.summaryTrigger = new Trigger(pages.summary);
    summaryTrigger.initalize = function (data) {
        var departureDateTime = ctx.parseDateStr(data.mDepartureDate());
        var departureDate = getDateString(departureDateTime);
        var departureTime = getTimeString(departureDateTime);
        var returnDate = "";
        var returnTime = "";
        var duarationDays = "";
        if (data.mIsReturnTrip()) {
            var returnDateTime = ctx.parseDateStr(data.mReturnDate());
            returnDate = getDateString(returnDateTime);
            returnTime = getTimeString(returnDateTime);
            duarationDays = getDaysBetween(new Date(departureDateTime), new Date(returnDateTime));
        }
        var cabinClass = "";
        if (flightResultsTrigger.Initialized) {
            var options = flightResultsTrigger.Options;
            cabinClass = options.cabin_class;
        }

        var departureAirport = data.mDepartureAirport().Code;
        var departureCityName = data.mDepartureAirport().City;
        var departureCountryCode = data.mDepartureAirport().CountryCode;

        var destinationAirport = data.mDestinationAirport().Code;
        var destinationCityName = data.mDestinationAirport().City;
        var destinationCountryCode = data.mDestinationAirport().CountryCode;

        var departureCountryName = "";
        var destinationCountryName = "";
        
        var departureDisplayName = data.Outbound.DepartureAirport.DisplayName();
        var destinationDisplayName = data.Outbound.ArrivalAirport.DisplayName();
        if (!!departureDisplayName) {
            departureDisplayName = departureDisplayName.split(',');
            if (departureDisplayName.length >= 3) {
                departureCountryName = ctx.trim(departureDisplayName[2]);
            }
        }
        if (!!destinationDisplayName) {
            destinationDisplayName = destinationDisplayName.split(',');
            if (destinationDisplayName.length >= 3) {
                destinationCountryName = ctx.trim(destinationDisplayName[2]);
            }
        }
        

        var productCode = "";

        $.each(data.Outbound.Segments(), function (index, option) {
            var carrierCode = option.Carrier.Code();
            var number = option.FlightNumber();
            productCode += (carrierCode + number) + "|";
        });
        productCode = productCode.substring(0, productCode.length - 1);
        
        var departureAirlineName = data.Carrier.DisplayName();
        var returnAirlineName = data.Carrier.DisplayName();

        var carrierLogo = data.Carrier.Logo();
        var ticketPrice = data.mTotalPrice();
        var totalPrice = data.mTotalPrice();

        var travelType = data.mIsReturnTrip() ? "return trip" : "one way";
        var numberOfPassengers = parseInt(data.mAdults()) + parseInt(data.mChildren()) + parseInt(data.mInfants());
        var numberOfTickets = parseInt(data.mAdults()) + parseInt(data.mChildren());

        this.Options = {
            page_name: 'mob booking overview',
            departure_date: departureDate,
            departure_time: departureTime,
            return_date: returnDate,
            return_time: returnTime,
            travel_duration_days: duarationDays,
            cabin_class: cabinClass,
            travel_type: travelType,
            departure_airport: departureAirport,
            destination_aiport: destinationAirport,
            departure_city_name: departureCityName,
            destination_city_name: destinationCityName,
            departure_country_code: departureCountryCode,
            destination_country_code: destinationCountryCode,
            departure_country_name: destinationCountryName,
            destination_country_name: destinationCountryName,
            departure_airline_name: departureAirlineName,
            return_airline_name: returnAirlineName,
            product_code: productCode,
            product_price: ticketPrice,
            product_url: '',
            product_photo: "",
            basket_total: totalPrice,
            number_of_passengers: numberOfPassengers,
            number_of_tickets: numberOfTickets
        };
        this.Initialized = true;
    };
    //#endregion

    //#region paymentOptionsTrigger
    var paymentOptionsTrigger = triggers.paymentOptionsTrigger = new Trigger(pages.paymentOptions);
    paymentOptionsTrigger.initalize = function (data) {
        var departureDate = "";
        var departureTime = "";
        var returnDate = "";
        var returnTime = "";
        var duarationDays = "";
        var cabinClass = "";
        var departureAirport = "";
        var departureCityName = "";
        var departureCountryCode = "";
        var destinationAirport = "";
        var destinationCityName = "";
        var destinationCountryCode = "";
        var departureCountryName = "";
        var destinationCountryName = "";
        var departureAirlineName = "";
        var returnAirlineName = "";
        var carrierLogo = "";
        var ticketPrice = "";
        var totalPrice = "";
        var travelType = "";
        var numberOfPassengers = "";
        var numberOfTickets = "";

        var productCode = "";
        if (summaryTrigger.Initialized) {
            var options = summaryTrigger.Options;
            departureDate = options.departure_date;
            departureTime = options.departure_time;
            returnDate = options.return_date;
            returnTime = options.return_time;
            duarationDays = options.travel_duration_days;
            cabinClass = options.cabin_class;
            departureAirport = options.departure_airport;
            departureCityName = options.departure_city_name;
            departureCountryCode = options.departure_country_code;
            destinationAirport = options.destination_aiport;
            destinationCityName = options.destination_city_name;
            destinationCountryCode = options.destination_country_code;
            departureCountryName = options.departure_country_name;
            destinationCountryName = options.destination_country_name;
            departureAirlineName = options.departure_airline_name;
            returnAirlineName = options.return_airline_name;
            carrierLogo = options.product_photo;
            ticketPrice = options.product_price;
            travelType = options.travel_type;
            numberOfPassengers = options.number_of_passengers;
            numberOfTickets = options.number_of_tickets;
            totalPrice = options.basket_total;
            
            productCode = options.product_code;
        }
        this.Options = {
            page_name: 'mob payment',
            departure_date: departureDate,
            departure_time: departureTime,
            return_date: returnDate,
            return_time: returnTime,
            travel_duration_days: duarationDays,
            cabin_class: cabinClass,
            travel_type: travelType,
            departure_airport: departureAirport,
            destination_aiport: destinationAirport,
            departure_city_name: departureCityName,
            destination_city_name: destinationCityName,
            departure_country_code: departureCountryCode,
            destination_country_code: destinationCountryCode,
            departure_country_name: departureCountryName,
            destination_country_name: destinationCountryName,
            departure_airline_name: departureAirlineName,
            return_airline_name: returnAirlineName,
            product_code: productCode,
            product_price: ticketPrice,
            product_url: '',
            product_photo: "",
            basket_total: totalPrice,
            number_of_passengers: numberOfPassengers,
            number_of_tickets: numberOfTickets
        };
        this.Initialized = true;
    };
    //#endregion

    //#region conditionsTrigger
    var conditionsTrigger = triggers.conditionsTrigger = new Trigger(pages.conditions);
    conditionsTrigger.initalize = function (data) {
        var departureDate = "";
        var departureTime = "";
        var returnDate = "";
        var returnTime = "";
        var duarationDays = "";
        var cabinClass = "";
        var departureAirport = "";
        var departureCityName = "";
        var departureCountryCode = "";
        var destinationAirport = "";
        var destinationCityName = "";
        var destinationCountryCode = "";
        var departureCountryName = "";
        var destinationCountryName = "";
        var departureAirlineName = "";
        var returnAirlineName = "";
        var carrierLogo = "";
        var ticketPrice = "";
        var totalPrice = "";
        var travelType = "";
        var numberOfPassengers = "";
        var numberOfTickets = "";

        var productCode = "";
        if (paymentOptionsTrigger.Initialized) {
            var options = paymentOptionsTrigger.Options;
            departureDate = options.departure_date;
            departureTime = options.departure_time;
            returnDate = options.return_date;
            returnTime = options.return_time;
            duarationDays = options.travel_duration_days;
            cabinClass = options.cabin_class;
            departureAirport = options.departure_airport;
            departureCityName = options.departure_city_name;
            departureCountryCode = options.departure_country_code;
            destinationAirport = options.destination_aiport;
            destinationCityName = options.destination_city_name;
            destinationCountryCode = options.destination_country_code;
            departureCountryName = options.departure_country_name;
            destinationCountryName = options.destination_country_name;
            departureAirlineName = options.departure_airline_name;
            returnAirlineName = options.return_airline_name;
            carrierLogo = options.product_photo;
            ticketPrice = options.product_price;
            travelType = options.travel_type;
            totalPrice = options.basket_total;
            numberOfPassengers = options.number_of_passengers;
            numberOfTickets = options.number_of_tickets;

            productCode = options.product_code;
        }

        this.Options = {
            page_name: 'mob company conditions',
            departure_date: departureDate,
            departure_time: departureTime,
            return_date: returnDate,
            return_time: returnTime,
            travel_duration_days: duarationDays,
            cabin_class: cabinClass,
            travel_type: travelType,
            departure_airport: departureAirport,
            destination_aiport: destinationAirport,
            departure_city_name: departureCityName,
            destination_city_name: destinationCityName,
            departure_country_code: departureCountryCode,
            destination_country_code: destinationCountryCode,
            departure_country_name: departureCountryName,
            destination_country_name: destinationCountryName,
            departure_airline_name: departureAirlineName,
            return_airline_name: returnAirlineName,
            product_code: productCode,
            product_price: ticketPrice,
            product_url: '',
            product_photo: "",
            basket_total: totalPrice,
            number_of_passengers: numberOfPassengers,
            number_of_tickets: numberOfTickets,
        };
        this.Initialized = true;
    };
    //#endregion

    //#region paymentDetailsTrigger
    var paymentDetailsTrigger = triggers.paymentDetailsTrigger = new Trigger(pages.paymentDetails);
    paymentDetailsTrigger.initalize = function(data,piu) {
        var departureDate = "";
        var departureTime = "";
        var returnDate = "";
        var returnTime = "";
        var duarationDays = "";
        var cabinClass = "";
        var departureAirport = "";
        var departureCityName = "";
        var departureCountryCode = "";
        var destinationAirport = "";
        var destinationCityName = "";
        var destinationCountryCode = "";
        var departureCountryName = "";
        var destinationCountryName = "";
        var departureAirlineName = "";
        var returnAirlineName = "";
        var carrierLogo = "";
        var ticketPrice = "";
        var totalPrice = "";
        var travelType = "";
        var numberOfPassengers = "";
        var numberOfTickets = "";
        var levrev = "";

        var productCode = "";
        if (conditionsTrigger.Initialized) {
            var options = conditionsTrigger.Options;
            departureDate = options.departure_date;
            departureTime = options.departure_time;
            returnDate = options.return_date;
            returnTime = options.return_time;
            duarationDays = options.travel_duration_days;
            cabinClass = options.cabin_class;
            departureAirport = options.departure_airport;
            departureCityName = options.departure_city_name;
            departureCountryCode = options.departure_country_code;
            destinationAirport = options.destination_aiport;
            destinationCityName = options.destination_city_name;
            destinationCountryCode = options.destination_country_code;
            departureCountryName = options.departure_country_name;
            destinationCountryName = options.destination_country_name;
            departureAirlineName = options.departure_airline_name;
            returnAirlineName = options.return_airline_name;
            carrierLogo = options.product_photo;
            ticketPrice = options.product_price;
            travelType = options.travel_type;
            totalPrice = options.basket_total;
            levrev = options.basket_total;
            numberOfPassengers = options.number_of_passengers;
            numberOfTickets = options.number_of_tickets;

            productCode = options.product_code;
        }
        
        var customerId = ctx.api.currentCustomerId;
        var paymentCardInfo = ctx.getQuery(piu, 'optioncode');
        this.Options = {
            levrev: levrev, // order value 
            page_name: 'mob payment detail',
            departure_date: departureDate,
            departure_time: departureTime,
            return_date: returnDate,
            return_time: returnTime,
            travel_duration_days: duarationDays,
            cabin_class: cabinClass,
            travel_type: travelType,
            departure_airport: departureAirport,
            destination_aiport: destinationAirport,
            departure_city_name: departureCityName,
            destination_city_name: destinationCityName,
            departure_country_code: departureCountryCode,
            destination_country_code: destinationCountryCode,
            departure_country_name: departureCountryName,
            destination_country_name: destinationCountryName,
            departure_airline_name: departureAirlineName,
            return_airline_name: returnAirlineName,
            product_code: productCode,
            product_price: ticketPrice,
            product_url: '',
            product_photo: "",
            basket_total: totalPrice,
            number_of_passengers: numberOfPassengers,
            number_of_tickets: numberOfTickets,
            payment_card_info: paymentCardInfo,
            customer_id: customerId
        };
        this.Initialized = true;
    };
    //#endregion

    //#region confirmationTrigger
    var confirmationTrigger = triggers.confirmationTrigger = new Trigger(pages.confirmation);
    confirmationTrigger.initalize = function (data, rawData) {
        var levordref = data.mOrderNumber();
        var departureDateTime = ctx.parseDateStr(data.mOutbound.DepartureDateTime());
        var departureDate = getDateString(departureDateTime);
        var departureTime = getTimeString(departureDateTime);
        var returnDate = "";
        var returnTime = "";
        var duarationDays = "";
        if (data.mIsReturnTrip()) {
            var returnDateTime = ctx.parseDateStr(data.mInbound.DepartureDateTime());
            returnDate = getDateString(returnDateTime);
            returnTime = getTimeString(returnDateTime);
            duarationDays = getDaysBetween(new Date(departureDateTime), new Date(returnDateTime));
        }
        var cabinClass = "";
        var travelType = data.mIsReturnTrip() ? "return trip" : "one way";
        
        var departureAirport = data.mOutbound.DepartureAirport.DisplayName();
        var departureAirportName = "";
        var departureCityName = "";
        var departureCountryCode = "";
        var departureCountryName = "";
        var departureAirlineName = "";

        var destinationAirport = data.mOutbound.ArrivalAirport.DisplayName();
        var destinationAirportName = "";
        var destinationCityName = "";
        var destinationCountryCode = "";
        var destinationCountryName = "";
        var returnAirlineName = "";
        
        if (!!departureAirport) {
            departureAirport = departureAirport.split(',');
            if (departureAirport.length >= 3) {
                departureCountryName = ctx.trim(departureAirport[2]);
            }
        }
        if (!!destinationAirport) {
            destinationAirport = destinationAirport.split(',');
            if (destinationAirport.length >= 3) {
                destinationCountryName = ctx.trim(destinationAirport[2]);
            }
        }
       
        var stops = rawData.Products[0].Outbound.Segments;
        var firstStop = stops[0];
        var lastStop = stops[stops.length - 1];
        
        departureCityName = firstStop.Departure.City;
        departureAirportName = firstStop.Departure.Name;
        if (!departureAirportName) {
            departureAirportName = departureCityName;
        }
        departureCountryCode = firstStop.Departure.CountryCode;


        destinationCityName = lastStop.Arrival.City;
        destinationAirportName = lastStop.Arrival.Name;
        if (!destinationAirportName) {
            destinationAirportName = destinationCityName;
        }
        destinationCountryCode = lastStop.Arrival.CountryCode;


        var customerId = ctx.api.currentCustomerId;
        var paymentCardInfo = rawData._embedded.SelectedPayment.DisplayName;

        var bascketTotal = 0;
        $.each(rawData._embedded.Financials.Costs,function(index, option) {
            bascketTotal += option.Total;
        });

        var productCode = "";
        $.each(rawData.Products[0].Outbound.Segments, function (index, option) {
            var carrierCode = option.Carrier.Code;
            var number = option.FlightNumber;
            productCode += (carrierCode + number) + "|";
        });
        productCode = productCode.substring(0, productCode.length - 1);
        var numberOfPassengers = rawData.Products[0].NumberOfAdults + rawData.Products[0].NumberOfChildren + rawData.Products[0].NumberOfInfants;
        var numberOfTickets = numberOfPassengers - rawData.Products[0].NumberOfInfants;

        var levrev = bascketTotal;

        this.Options = {
            levrev: levrev, // order value
            levordref: levordref, // order id
            page_name: 'mob confirmation',
            departure_date: departureDate,
            departure_time: departureTime,
            return_date: returnDate,
            return_time: returnTime,
            travel_duration_days: duarationDays,
            cabin_class: cabinClass,
            travel_type: travelType,
            departure_airport: departureAirportName,
            destination_aiport: destinationAirportName,
            departure_city_name: departureCityName,
            destination_city_name: destinationCityName,
            departure_country_code: departureCountryCode,
            destination_country_code: destinationCountryCode,
            departure_country_name: departureCountryName,
            destination_country_name: destinationCountryName,
            departure_airline_name: departureAirlineName,
            return_airline_name: returnAirlineName,
            product_code: productCode,
            product_price: '',
            product_url: '',
            product_photo: '',
            basket_total: bascketTotal,
            number_of_passengers: numberOfPassengers,
            number_of_tickets: numberOfTickets,
            payment_card_info: paymentCardInfo,
            customer_id: customerId
        };
        this.Initialized = true;
    };
    //#endregion

}(jQuery, travixmob));
