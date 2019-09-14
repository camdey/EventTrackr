// var eventList = [];

const listEvents = eventArray => {

	// clear table in case update occurs while popup open
	// $("#events_table tr").remove();

	// always have a tbody to add data .after to (needed for update while popup open if popup currently empty)
	$('#events_table > tbody:last-child').append('<tr>...</tr><tr>...</tr>');

	for (let [index, obj] in Object.entries(eventArray)) {

		$('#events_table tr:last').after('<tr><td><b>' + eventArray[index].timestamp + '</b></td></tr>');
		$('#events_table tr:last').after('<tr><td>' + eventArray[index].subject + '</td></tr>');
		$('#events_table tr:last').after('<tr><td>' + eventArray[index].payload + '</td></tr>');
	}

	if (eventArray.length == 0) {
		// clear event log
		$("#events_table tr").remove();
	}
	
};

function parsePayload(eventMessage, eventField, eventValue) {

	var payloadString = "";

  	// if filter empty, ignore filter
  	if (jQuery.isEmptyObject(eventValue.filter) == true) {
  		// delete empty filter
  		delete eventValue['filter']

      	for (let [payloadKey, payloadValue] of Object.entries(eventValue)) {

      		// for first filter property, don't add delimeter
			if (payloadString.length == 0) {
		    	payloadString += payloadKey + ": " + payloadValue;
			}
			// for all subsequent properties, add newline delimeter
			else {
				payloadString = payloadString + "\n" + payloadKey + ": " + payloadValue;
			}
		}
		// console.log("payload values: " + payloadString);
	}
	// if filter is not empty
  	else if (jQuery.isEmptyObject(eventValue.filter) == false) {
      	for (let [filterKey, filterValue] of Object.entries(eventValue.filter)) {

      		// for first filter property, don't add delimeter
			if (payloadString.length == 0) {
		    	payloadString += "filter." + filterKey + ": " + filterValue;
			}
			// for all subsequent properties, add newline delimeter
			else {
				payloadString = payloadString + "\n" + "filter." + filterKey + ": " + filterValue;
			}
		}
		// console.log("filter values: " + payloadString);
	}
	// delete old payload object, add new key:value pair
	delete eventMessage['payload'];
	eventMessage.payload = payloadString;
	// console.log("new payload field: " + eventMessage.payload);
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
	}
}

function parseEvent(eventMessage, eventList) {

	// check message for payload object
	for (let [eventField, eventValue] of Object.entries(eventMessage)) {

		// if field is payload and payload is not empty...
	    if (eventField == 'payload' & jQuery.isEmptyObject(eventValue) == false) {

	    	parsePayload(eventMessage, eventField, eventValue);
	    }
	}

	// convert to subject for new events
	parseSubject(eventMessage)

	// convert event timestamp to local time
	var localTime = new Date(eventMessage.timestamp).toLocaleTimeString();;
	eventMessage.timestamp = localTime;

	eventList.push(eventMessage);
}

// send handsake message to background.js so data is only sent when popup.js is ready
chrome.runtime.sendMessage({message: "handshake"}, function(response) {});

// receive message from background.js
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	var eventList = [];
	eventArray = message.data;

	// sort events by timestamp, newest first
	eventArray.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

	console.log("received data");
	for (let [obj, event] of Object.entries(eventArray)) {
		parseEvent(event, eventList);
	}

	// popualte popup html
	listEvents(eventList);
});


// only listen for button clicks after page finished loading
document.addEventListener('DOMContentLoaded', function () {

	document.getElementById("clearLog").addEventListener("click", function() {

		eventList = [];
		listEvents(eventList);

		chrome.runtime.sendMessage({message: "clearData"}, function(response) {});

	});
});

var bgPort = chrome.runtime.connect({name: "EventPopup"});