// Saves options to chrome.storage
function saveUrl(event) {
	// prevent reload on submit
	event.preventDefault();

  var url = document.getElementById('endpointInput').value;
  console.log(url);

	if (url.length >= 5) {
		// get stored array, proceed to add new url to this array in storage
  	fetchFromStorage(function(array) {
  		addToStorage(array, url, addToTable);
  		deleteRowOnClick();
  		notifyBackground();
		});
	}
}

// cant delete newly added rows ?????????
// stored array, new url, callback to addToTable
function addToStorage(array, url, callback) {
	// don't add duplicates
	if (array.includes(url) == false) {
		array.push(url);
		// update array with new url
		chrome.storage.sync.set({
			endpointList: array
		}, function() {
			console.log("added url to storage");
		});
		// call addToTable() function
		callback(url);
	}
	else { console.log("ignored duplicate"); }
}


// add row to table
function addToTable(url) {
	rowId = url.replace(/[&\/\\#,+()$~%.'":*?<>{}-]/g, '');
  $("#endpointsTable > tbody > tr:last").after("<tr id=" + rowId + "><td>" + url + "</td>" +
    "<td style='text-align: right;'><button type='button' class='deleteRow' id=" + rowId + ">X</button></td>");
	$("#buttonCol").attr('align', 'right');
	// $("#endpointsTable").scrollTop($("#endpointsTable")[0].scrollHeight);
	// $("#endpointsTable").find("deleteRow").click(deleteRowOnClick);
}


// reload table with existing values
function loadTable(urlList) {
  // var urlList = fetchFromStorage();
  for (let url of Object.values(urlList)) {
    addToTable(url)
  }
}


// listen for row delete button, delete row, delete url from storage
$(document).ready(function() {
	// bind the deleteRow button
	deleteRowOnClick();
});

// delete based on url and not index
// call to bind delete row button
function deleteRowOnClick() {
	$(".deleteRow").off('click').on('click', function() {
		event.preventDefault();
  	// get info about row
    var trRef = $(this).parent().parent()
    // get url from text for this row
    rowUrl = trRef[0].cells[0].innerText;
    console.log(rowUrl);
		// remove special chaarcters to match id
		rowId = rowUrl.replace(/[&\/\\#,+()$~%.'":*?<>{}-]/g, '');
		// delete row
    $("#" + rowId).remove();

    // get current list of urls
    fetchFromStorage(function returnList(urlList){
      // create a new array without deleted url
      var newUrlList = urlList.filter(function(url) {
        return url != rowUrl;
      });
      // set new url list to the storage
      chrome.storage.sync.set({'endpointList': newUrlList });
			console.log(JSON.stringify(newUrlList));
      notifyBackground();
    });
  });
}


// Fetch saved URLs
function fetchFromStorage(callback) {
  urlList = [];

  chrome.storage.sync.get({
    endpointList: [],
  }, function(endpoints) {
    // console.log(endpoints.endpointList);
    for (let url of Object.values(endpoints.endpointList)) {
      urlList.push(url);
    }

    return callback(urlList);
  });
}

function deleteAll() {
  // clear existing storage
  chrome.storage.sync.set({endpointList: []}, function() {
    console.log("URLs deleted");
  });
  // clear table
  $('#endpointsTable tr:gt(0)').remove();

  notifyBackground();
}


// clear text form after URL saved
function clearForm() {
	document.getElementById("urlForm").reset
}


// notify background.js of changes to endpoint list
function notifyBackground() {
  // send message to background to retrieve urls from storage
  chrome.runtime.sendMessage({message: "fetchEndpoints"}, function(response) {
    console.log("sending message to background.js to fetch endpoint urls");
  });
}


document.addEventListener('DOMContentLoaded', fetchFromStorage(loadTable));
document.getElementById('addButton').addEventListener('click', saveUrl);
document.getElementById('addButton').addEventListener("click", clearForm);
document.getElementById('deleteButton').addEventListener('click', deleteAll);
