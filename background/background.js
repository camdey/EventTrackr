var messageArray = [];
var popupOpen = false;
var popupPort;
var lastClosed = new Date(); // give starting value
// var arrayTest = ["*://my.izettle.com/dachshund", "*://bo-tracking.izettle.com/track"];
// var endpointWhitelist = ["*://my.izettle.com/dachshund"];
var endpointWhitelist = [];


function eventSniffer(details) {
	console.log("eventSniffer");
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

		// chrome.extension.onBeforeRequest.removeListener(eventSniffer);
	}
}

// fetch endpoints from storage
function getEndpointsFromOptions() {
	// empty existing array first
	endpointWhitelist.length = 0;

  chrome.storage.sync.get({
    endpointList: [],
  },
	function(endpoints) {
    for (let url of Object.values(endpoints.endpointList)) {
    	// add wildcard to front of endpoint url
			var urlString = String("*://".concat(url));
			endpointWhitelist.push(urlString);
    }

		console.log("getEndpointsFromOptions()");
		console.log(endpointWhitelist);
		console.log(JSON.stringify(endpointWhitelist));

		// return callback(endpointWhitelist);
		// return endpointWhitelist;
		eventListener(endpointWhitelist);
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
		  console.log("save new object in storage");
		});

		if (popupOpen == true) {
			chrome.runtime.sendMessage({message: "eventsReceived"}, function(response) {
				console.log("sending events received while open");
			});
		}
}


function clearStorage() {
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


// function updateWhitelist(urlList) {
// 	return urlList;
// }
//
// chrome.webRequest.onBeforeRequest.addListener(eventSniffer, {urls: getEndpointsFromOptions(updateWhitelist)}, ["requestBody"]);

// if (chrome.webRequest.onBeforeRequest.hasListener(eventSniffer)) {
//     chrome.webRequest.onBeforeRequest.removeListener(eventSniffer);
// 	}
// chrome.webRequest.onBeforeRequest.addListener(eventSniffer, {urls: endpointWhitelist}, ["requestBody"]);


// getEndpointsFromOptions(function() {
// 	if (chrome.webRequest.onBeforeRequest.hasListener(eventSniffer)) {
//     chrome.webRequest.onBeforeRequest.removeListener(eventSniffer);
// 	}
// 	chrome.webRequest.onBeforeRequest.addListener(eventSniffer, {urls: endpointWhitelist}, ["requestBody"]);
// });

// function updateListener(getEndpointsFromOptions(function() {
// 	  if (chrome.webRequest.onBeforeRequest.hasListener(eventSniffer)) {
// 	    chrome.webRequest.onBeforeRequest.removeListener(eventSniffer);
// 		}
// 	  chrome.webRequest.onBeforeRequest.addListener(eventSniffer, {urls: endpointWhitelist}, ['requestBody']);
// 	}){}
// )

function eventListener(whitelist) {
	// listen for requests from the whitelisted urls
	chrome.webRequest.onBeforeRequest.addListener(
		eventSniffer,
		{urls: whitelist},
		["requestBody"]
	);
}

chrome.webRequest.onBeforeRequest.addListener(
	getEndpointsFromOptions,
	{urls: ["*://my.izettle.com/"],	types: ["main_frame"]},
	["requestBody"]
);


// listen for new endpoint being added from options.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.message == "fetchEndpoints") {
		console.log("option.js message received");
		console.log("fetching endpoints from storage");
		getEndpointsFromOptions();
		// getEndpointsFromOptions(function() {
			// var newArray = endpointWhitelist;
			// console.log("inside callback");
			// console.log("flushing cache");
			// chrome.webRequest.handlerBehaviorChanged();
		// });
		// flush cache of listeners
		// chrome.extension.onBeforeRequest.removeListener(eventSniffer);

	}

	return true;
});


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
