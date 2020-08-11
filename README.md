# EventTrackr

A Chrome extension for logging and viewing event tracking messages sent in the background.

### Popup UI
<img width="406" alt="event-listener" src="https://user-images.githubusercontent.com/11826434/73614571-9a3f3780-4600-11ea-940d-7c6bd55bafad.png">

### Options UI
<img width="406" alt="event-listener" src="https://user-images.githubusercontent.com/11826434/73614583-c3f85e80-4600-11ea-9152-7647314ff828.png">


## Overview

EventListener only listens for http requests sent to specific, whitelisted, URLs. It picks from these only POST requests and extracts the event message from *details.requestBody.raw*.

The event message object is stored in Chrome sync storage. If the extension's popup is closed, the message remains in storage until the popup is opened.

Upon opening the popup, two things occur:
1. A message is sent from the *popup.js* file to the *background.js* file to let it know that the popup is now open
2. Any event messages stored in the Chrome sync storage are retrieved in the *popup.js* file and further parsed.

Any messages received while the popup is open are stored in the Chrome sync storage. A message is then sent from *background.js* to *popup.js* to alert it to the newly received events. They are then retrieved in *popup.js* and parsed in preparation for display.

Parsing event messages will be dependent on how they are formatted. My example works with event messages that may be batched (an array of messages) where each message can contain a number of nest objects, some of which may be an array of objects or contain a nested array of objects.

After parsing, the desired fields of the event message are displayed in a jQuery table using a mixture of HTML and CSS.

A "Clear Log" button is available via the popup UI allowing a user to clear the previously stored messages. The *popup.js* file listens for the click and clears local objects of the event messages and also sends a message to *background.js* telling it to do the same, as well as clearing the Chrome sync storage.
