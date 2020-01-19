// Saves options to chrome.storage
function save_url() {
  var url = document.getElementById('endpointInput').value;
  console.log(url);

  if (url.length > 0) {
		addToArray(url);
		addToTable(url);
    notifyBackground();
  }
  else {console.log("please enter a URL at least 1 character long")}
}

function addToArray(url) {
  chrome.storage.sync.get({
    endpointList:[]
  },
  function(data) {
    console.log(data.endpointList);
    // storing the storage value in a variable and passing to update function
    update(data.endpointList);
  }
  );

  function update(array) {
    array.push(url);
    // then call the set to update with modified value
    chrome.storage.sync.set({
      endpointList:array
    }, function() {
      console.log("added to list with new values");
    });
  }
}

function addToTable(url) {
  $('#endpointsTable > tbody > tr:last').after('<tr><td>' + url + '</td>');
	$('#endpointsTable').scrollTop($('#endpointsTable')[0].scrollHeight);
}

// Fetch saved URLs
function fetch_from_storage () {
  chrome.storage.sync.get({
    endpointList: [],
  }, function(endpoints) {
    // console.log(endpoints.endpointList);
    for (let url of Object.values(endpoints.endpointList)) {
      console.log(url);
      addToTable(url)
    }
  });

  notifyBackground();
}

function delete_urls() {
  // clear existing storage
  chrome.storage.sync.set({endpointList: []}, function() {
    console.log("URLs deleted");
  });
  // clear table
  $('#endpointsTable tr:gt(0)').remove();

  notifyBackground();
}

// clear form after URL saved
function clear_form() {
	document.getElementById("urlForm").reset
}


// notify background.js of changes to endpoint list
function notifyBackground() {
  // send message to background to retrieve urls from storage
  chrome.runtime.sendMessage({message: "fetchEndpoints"}, function(response) {
    console.log("sending message to background.js to fetch endpoint urls");
  });
}

document.addEventListener('DOMContentLoaded', fetch_from_storage);
document.getElementById('addButton').addEventListener('click', save_url);
document.getElementById('addButton').addEventListener("click", clear_form);
document.getElementById('deleteButton').addEventListener('click', delete_urls);
