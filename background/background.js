var messageArray = [];
var popupOpen = false;
var popupPort;
var endpointWhitelist = [];

// add listener for web requests
chrome.webRequest.onBeforeRequest.addListener(
	function(details) {
		validateUrl(details, eventSniffer)
	},
	{urls: ["<all_urls>"]},
	["requestBody"]
);


function eventSniffer(details) {
	if(details.method == "POST") {
		var requestPayload = decodeURIComponent(String.fromCharCode.apply(null, new Uint8Array(details.requestBody.raw[0].bytes)));
		var eventMessage = JSON.parse(requestPayload);
		var eventsArray = [];
		console.log(eventMessage);
		for (var obj in eventMessage) {
			if (obj == 'events') {
				eventsArray = eventMessage[obj];
			}
		}
		cleanEvents(eventsArray);
		storeEvents();
	}
}


function validateUrl(details, callback) {
	var url = details.url;
	for (let endpoint of Object.values(endpointWhitelist)) {
		if (url == endpoint) {
			callback(details);
		}
	}
}

// run on start
getEndpointsFromOptions();

// fetch endpoints from storage
function getEndpointsFromOptions() {
	// empty existing array first
	endpointWhitelist.length = 0;

  chrome.storage.sync.get({
    endpointList: [],
  },
	function(endpoints) {
    for (let url of Object.values(endpoints.endpointList)) {
			endpointWhitelist.push(url);
    }

		console.log("getEndpointsFromOptions()");
		console.log(JSON.stringify(endpointWhitelist));
  });
}


function cleanEvents(eventsArray) {
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
}


function storeEvents() {
		// remove excess events from array
		for (var i = 30; messageArray.length > i; i++) {
			messageArray.pop();
		}

		// clear existing storage
		chrome.storage.sync.set({'messageArray': []}, function() {
			console.log("storage cleared");
		});
		chrome.storage.sync.set({'messageArray': messageArray}, function() {
		  console.log("saved new object in storage");
		});

		if (popupOpen == true) {
			chrome.runtime.sendMessage({message: "eventsReceived"}, function(response) {
				console.log("sending events received while popup open");
			});
		}
}


function clearStorage() {
	messageArray = [];
	chrome.storage.sync.set({'messageArray': []}, function() {
		console.log("storage cleared");
	});
};


function clearLogOnTimeout(oldestReceived) {
	var currentTime = new Date();
	var elapsedMinutes = (currentTime - oldestReceived) / 60000;

	if (elapsedMinutes >= 30) {
		console.log("cleared log after 30min inactivity")
		clearStorage();

		// send message to popup to clear UI
		chrome.runtime.sendMessage({message: "clearLogOnTimeout"}, function(response) {
			console.log("sending message to popup to clear UI");
		});
	}
}


// listen for new endpoint being added from options.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.message == "fetchEndpoints") {
		console.log("fetching endpoints from storage");
		getEndpointsFromOptions();
	}
	return true;
});


// find oldest event and send to clearLogOnTimeout
function getOldestEvent(callback) {
	if (messageArray[messageArray.length-1].timestamp) {
		var oldestReceived = new Date(messageArray[messageArray.length-1].timestamp);
		callback(oldestReceived);
	}
}


// send event messages to popup.js when handshake message received
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.message == "popupOpen") {
		popupOpen = true;
		console.log("popup opened");
		getOldestEvent(clearLogOnTimeout);
	}
	if (request.message == "clearLogOnButtonClick") {
		// clear existing storage
		clearStorage();
	}

	return true;
});


// listen for popup being closed
chrome.runtime.onConnect.addListener(function(port) {
	// check port name
	if (port.name == "EventPopup") {
    	popupPort = port;

    	// if port closes, popup window has closed
    	popupPort.onDisconnect.addListener(function() {
			popupOpen = false;
			console.log("popup closed");

			// set last closed time for popup
			lastClosed = new Date();
    	});
	}
});


// change icon from grayscale to colour if on correct page
chrome.runtime.onInstalled.addListener(function() {
	chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
		chrome.declarativeContent.onPageChanged.addRules([{
			conditions: [
				new chrome.declarativeContent.PageStateMatcher({
			  	pageUrl: {hostEquals: 'my.izettle.com'},
				}),
				new chrome.declarativeContent.PageStateMatcher({
			  	pageUrl: {hostEquals: 'my.izettletest.com'},
				})
			],
		    actions: [new chrome.declarativeContent.ShowPageAction()]
		}]);
	});
});
