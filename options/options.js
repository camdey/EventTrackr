// Saves options to chrome.storage
function save_url() {
  var url = document.getElementById('endpoint').value;
  console.log(url);

  addToArray(url);
  addToTable(url);

  // Update status to let user know options were saved.
  var status = document.getElementById('status');
  status.textContent = 'Options saved.';
  setTimeout(function() {
    status.textContent = '';
  }, 750);
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
  $('#endpointsTable tr:last').after(
    '<tr><td>' + url + '</td>'
  );
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
}

function clear_urls() {
  // clear existing storage
  chrome.storage.sync.set({endpointList: []}, function() {
    console.log("URLs cleared");
  });
  // clear table
  $('#endpointsTable tr:gt(0)').remove();
}

document.addEventListener('DOMContentLoaded', fetch_from_storage);
document.getElementById('save').addEventListener('click', save_url);
document.getElementById('clear').addEventListener('click', clear_urls);
