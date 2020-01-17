var messageArray = [];
var endpointWhitelist = [];
var popupOpen = false;
var popupPort;
var lastClosed = new Date(); // give starting value

chrome.webRequest.onBeforeRequest.addListener(function(details) {
	console.log("fetch endpoints");
	getEndpointsFromOptions();
	}, {
	// track events from both old and new tracking services
	urls: ["*://my.izettle.com/"]
	// urls: []
}
);

chrome.webRequest.onBeforeRequest.addListener(function(details) {
	console.log("fetch events");
	if(details.method == "POST") {

		var requestPayload = decodeURIComponent(String.fromCharCode.apply(null, new Uint8Array(details.requestBody.raw[0].bytes)));
		var eventMessage = JSON.parse(requestPayload);

		var eventsArray = [];

		for (var obj in eventMessage) {
			if (obj == 'events') {
				eventsArray = eventMessage[obj];
			}
		}

		cleanEvents(eventsArray);
		storeEvents();

	}
}, {
	// track events from both old and new tracking services
	urls: ["*://my.izettle.com/dachshund", "*://bo-tracking.izettle.com/track"]
	// urls: endpointWhitelist
},
	["requestBody"]
);


function getEndpointsFromOptions() {
	// reset object
	endpointWhitelist = [];

  chrome.storage.sync.get({
    endpointList: [],
  }, function(endpoints) {
    // console.log(endpoints.endpointList);
    for (let url of Object.values(endpoints.endpointList)) {
    	// add wildcard to front of endpoint url
			var urlString = "*://".concat(url);
			endpointWhitelist.push(urlString);
    }
  });
	console.log(endpointWhitelist);
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
		  console.log("save new object in storage");
		});

		if (popupOpen == true) {
			chrome.runtime.sendMessage({message: "eventsReceived"}, function(response) {
				console.log("sending events received while open");
			});
		}
}


function clearStorage() {
	// empty array
	messageArray = [];

	chrome.storage.sync.set({'messageArray': []}, function() {
		console.log("storage cleared");
	});
};


function clearLogOnTimeout() {
	var currentTime = new Date();
	var elapsedMinutes = (currentTime - lastClosed) / 60000;

	if (elapsedMinutes >= 1) {
		console.log("cleared log after 30min inactivity")
		console.log(elapsedMinutes);

		clearStorage();

		// send message to popup to clear UI
		chrome.runtime.sendMessage({message: "clearLogOnTimeout"}, function(response) {
			console.log("sending message to popup to clear UI");
		});
	}
}


// send event messages to popup.js when handshake message received
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.message == "popupOpen") {
		popupOpen = true;
		console.log("popup opened");

		clearLogOnTimeout();
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
			conditions: [new chrome.declarativeContent.PageStateMatcher({
			  pageUrl: {hostEquals: 'my.izettle.com'},
			})
			],
		    actions: [new chrome.declarativeContent.ShowPageAction()]
		}]);
	});
});
