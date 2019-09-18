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
		}

		// remove excess events from array
		for (var i = 30; messageArray.length > i; i++) {
			messageArray.pop();
		}


		// clear existing storage
		chrome.storage.sync.set({'messageArray': []}, function() {
		  console.log("storage cleared");
		});

		chrome.storage.sync.set({'messageArray': messageArray}, function() {
		  console.log("save to storage");
		});


		if (popupOpen == true) {
			chrome.runtime.sendMessage({message: "eventsReceived"}, function(response) {
				console.log("sending events received while open");
			});
		}
	}
},
{
	// track events from both old and new tracking services
	urls: ["*://my.izettle.com/dachshund", "*://bo-tracking.izettle.com/track"]
},
	["requestBody"]
);

// change icon from grayscale to colour if on correct page
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

	// if handshake message received, send back signal to fetch data from storage
	if (request.message == "handshake") {
		popupOpen = true;

		chrome.runtime.sendMessage({message: "eventsReceived"}, function(response) {
			console.log("sending events received before open");
			// console.log(messageArray);
		});
	}

	if (request.message == "clearData") {

		// clear existing storage
		messageArray = [];
		chrome.storage.sync.set({'messageArray': []}, function() {
		  console.log("storage cleared");
		});
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
			popupOpen = false;
			console.log("popup closed");
    	});
	}
});
