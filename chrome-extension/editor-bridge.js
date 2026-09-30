// editor-bridge.js
// Runs on the ImgLy editor page (http://localhost:3000) to bridge postMessage
// communication between the Next.js web application and the Chrome Extension background worker.

(function() {
  // Notify web app that extension is active
  window.postMessage({ type: 'IMGLY_EXTENSION_READY' }, '*');

  // Listen for messages from the web application
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || typeof event.data !== 'object') return;

    if (event.data.type === 'IMGLY_PING_EXTENSION') {
      window.postMessage({ type: 'IMGLY_EXTENSION_PONG' }, '*');
      return;
    }

    if (event.data.type === 'IMGLY_REQUEST_PREVIEW') {
      try {
        chrome.runtime.sendMessage(
          {
            type: 'IMGLY_PREVIEW_ON_WEBSITE',
            payload: event.data.payload,
          },
          (response) => {
            const err = chrome.runtime.lastError;
            window.postMessage(
              {
                type: 'IMGLY_PREVIEW_RESPONSE',
                payload: {
                  success: !err && response?.success,
                  error: err ? err.message : response?.error,
                },
              },
              '*'
            );
          }
        );
      } catch (err) {
        window.postMessage(
          {
            type: 'IMGLY_PREVIEW_RESPONSE',
            payload: {
              success: false,
              error: 'Failed to communicate with extension background worker: ' + err.message,
            },
          },
          '*'
        );
      }
    }
  });

  // Listen for background worker messages directed to the editor tab
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'IMGLY_RESTORE_EDITOR_STATE') {
      window.postMessage({ type: 'IMGLY_EXTRACT', payload: message.payload }, '*');
      sendResponse({ received: true });
    }
  });
})();
