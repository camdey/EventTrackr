// var eventList = [];
var eventStorage = [];

const listEvents = eventArray => {

	$('#eventsTable > tbody:last-child').append('<tr>...</tr><tr>...</tr>');
	// empty on each refresh of events
	$('#eventsTable tr:gt(0)').remove();

	Object.keys(eventArray).forEach(function(message) {
		var amplitudeIcon = "";

		// if not a legacy event, display Amplitude icon
		if (eventArray[message].legacyEvent == false) {
			amplitudeIcon = "<img src='../images/amplitude_16.png'/>"
		} else if (eventArray[message].legacyEvent == true) {
			amplitudeIcon = "<img src='../images/spacer_16.png'/>";
		}

		$('#eventsTable tr:first').after(
			'<tr><td>' + amplitudeIcon + '</td>' +
			'<td class="localTime"><font size="2">' + eventArray[message].localTime + '</font></td>' +
			'<td class="subject"><font size="2">' + "\u00A0" + eventArray[message].subject + '</font></td></tr>'
		);

		// if payload is not empty, enumerate through payload object
		if (jQuery.isEmptyObject(eventArray[message].payload) == false) {
			for (let [key, value] of Object.entries(eventArray[message].payload)) {
				$('#eventsTable td.subject').first().append('<code><font size="2"><br/>' + "\u00A0 \u00A0" +
					key + ': ' + value + '</font></code>');
			}
		}

	});

	if (eventArray.length == 0) {
		// clear event log in popup
		$('#eventsTable tr:gt(0)').remove();
	}
};

function processEvents(eventStorage, eventList) {
	eventStorage = Object.values(eventStorage)[0];

	for (let [obj, event] of Object.entries(eventStorage)) {
		parseEvent(event, eventList);
	}

	// sort events by timestamp, newest first
	eventList.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

	// populate popup html
	listEvents(eventList);
}

// check for payload, if exists send to payload parsing function
// send event for subject parsing
// convert timestamp to local time
function parseEvent(eventMessage, eventList) {

	// check message for payload object
	for (let [eventField, eventValue] of Object.entries(eventMessage)) {
		// if field is payload and payload is not empty...
	    if (eventField == 'payload' & jQuery.isEmptyObject(eventValue) == false) {
	    	parsePayload(eventMessage, eventValue);
	    }
	}

	// convert to subject for new events
	parseSubject(eventMessage)

	// convert event timestamp to local time
	let localTime = new Date(eventMessage.timestamp).toLocaleTimeString();;
	eventMessage.localTime = localTime;

	// push parsed events to array
	eventList.push(eventMessage);
};

function parsePayload(eventMessage, payloadObject) {

    // if errors not empty, only take first error and move to payload
    if (jQuery.isEmptyObject(payloadObject.errors) == false) {
    	Object.assign(payloadObject, payloadObject.errors[0]);
    	delete payloadObject['errors'];
    }
  	// if filter empty, ignore filter
  	if (jQuery.isEmptyObject(payloadObject.filter) == true) {
  		delete payloadObject['filter'];
	}
	// if filter is not empty, move filter to payload
  	else if (jQuery.isEmptyObject(payloadObject.filter) == false) {
  		// eventMessage.payload = payloadObject.filter;
  		Object.assign(payloadObject, payloadObject.filter);
  		delete payloadObject['filter'];
  	}
}

// for new events, concatenate event name fields into one
function parseSubject(eventMessage) {

	var eventKeys = Object.keys(eventMessage);
	var isLegacyEvent = eventKeys.includes("subject");
	var newSubject = "";

	if (isLegacyEvent == false) {
		newSubject = eventMessage.domain + ".";
		newSubject += eventMessage.subdomain + ".";
		newSubject += eventMessage.action;

		delete eventMessage['domain'], delete eventMessage['subdomain'], delete eventMessage['action']
		eventMessage.subject = newSubject;
		eventMessage.legacyEvent = false;
	}
	else {
		eventMessage.legacyEvent = true;
	}
}

function getEvents(key, callback) {
    if(key != null) {
        chrome.storage.sync.get('messageArray', function(data) {
            callback(data);
        });
    }
};

// receive message from background.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.message == "eventsReceived") {
		var eventList = [];
		// get events from storage
		getEvents("readFromStorage", function(data) {
			eventStorage = data;
			processEvents(eventStorage, eventList);
		})
	}

	if (request.message == "clearLogOnTimeout") {
		eventList = [];
		listEvents(eventList);
	}

	return true;
});


// only listen for button clicks after page finished loading
document.addEventListener('DOMContentLoaded', function () {
	document.getElementById("clearLogOnButtonClick").addEventListener("click", function() {
		eventList = [];
		listEvents(eventList);
		// send message to background.js to clear data
		chrome.runtime.sendMessage({message: "clearLogOnButtonClick"}, function(response) {});
	});
});

// open port with background.js to detect when popup is closed
var bgPort = chrome.runtime.connect({name: "EventPopup"});


// fired when popup opened
window.onload = function() {
	// let background.js know popup has opened
	chrome.runtime.sendMessage({message: "popupOpen"}, function(response) {});
	var eventList = [];
  // get events from storage
	getEvents("readFromStorage", function(data) {
		eventStorage = data;
		processEvents(eventStorage, eventList);
	})
};
