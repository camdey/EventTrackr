var messageArray = [];
var popupOpen = false;

chrome.webRequest.onBeforeRequest.addListener(function(details) {
	if(details.method == "POST") {

		var requestPayload = decodeURIComponent(String.fromCharCode.apply(null, new Uint8Array(details.requestBody.raw[0].bytes)));
		var eventMessage = JSON.parse(requestPayload);

		var eventsArray = [];

		for (var obj in eventMessage) {
			if (obj == 'events') {
				eventsArray = eventMessage[obj];
			}
		}

		for (let [obj, body] of Object.entries(eventsArray)) {

			// if event has subject property, legacyEvent = true
			var eventKeys = Object.keys(body);
			var legacyEvent = eventKeys.includes("subject");

			// if new web tracking event...
			if (legacyEvent == false) {
				delete body['userUuid'], delete body['organizationUuid'],
				delete body['device'], delete body['platform'],
				delete body['page'], delete body['session'],
				delete body['userAgent']


				// move latest event to front of array
				messageArray.unshift(body);
			}
			else if (legacyEvent == true) {
				// move latest event to front of array
				messageArray.unshift(body);
			}

			if (popupOpen == true) {
				arrayOfOne = [];
				arrayOfOne.push(body);
				chrome.runtime.sendMessage({data: arrayOfOne}, function(response) {
				console.log("sent message while open");
				});
			}
		}

		// remove excess events from array
		for (var i = 30; messageArray.length > i; i++) {
			messageArray.pop();
		}

	}
},
{
	// track events from both old and new tracking services
	urls: ["*://my.izettle.com/dachshund", "*://bo-tracking.izettle.com/track"]
},
	["requestBody"]
);

// change icon from grayscale to colour if on iZettle page
chrome.runtime.onInstalled.addListener(function() {
	chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
		chrome.declarativeContent.onPageChanged.addRules([{
			conditions: [new chrome.declarativeContent.PageStateMatcher({
			  pageUrl: {hostEquals: 'my.izettle.com'},
			})
			],
		    actions: [new chrome.declarativeContent.ShowPageAction()]
		}]);
	});
});


// send event messages to popup.js when handshake message received
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {

	// if handshake message received, send back data
	if (request.message == "handshake") {
		popupOpen = true;

		chrome.runtime.sendMessage({data: messageArray}, function(response) {
			console.log("sent message on open");
		});
	}

	if (request.message == "clearData") {
		console.log("background data cleared");
		messageArray = [];
	}

	return true;
});

var popupPort;
chrome.runtime.onConnect.addListener(function(port) {
	// check port name
	if (port.name == "EventPopup") {
    	popupPort = port;

    	// if port closes, popup window has closed
    	popupPort.onDisconnect.addListener(function() {
			popupOpen = true;
			console.log("Popup Closed");
    	});
	}
});