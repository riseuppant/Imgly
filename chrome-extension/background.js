// background.js - Service Worker for ImgLy Extension

// Map to track editor sessions: editorTabId -> { sourceTabId, originalContext }
const activeSessions = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // ── 1. Element picked on webpage -> open editor ───────────────────────────
  if (message.type === 'IMGLY_EXTRACTED') {
    const data = message.payload;
    const sourceTabId = sender.tab ? sender.tab.id : null;

    if (sourceTabId && data.originalContext) {
      data.originalContext.tabId = sourceTabId;
    }

    const encodedData = btoa(encodeURIComponent(JSON.stringify(data)));
    const editorUrl = `http://localhost:3000/?ext=${encodedData}`;

    chrome.tabs.create({ url: editorUrl }, (editorTab) => {
      if (sourceTabId && editorTab?.id) {
        activeSessions.set(editorTab.id, {
          sourceTabId,
          editorTabId: editorTab.id,
          originalContext: data.originalContext,
        });
      }
    });

    sendResponse({ success: true });
    return true;
  }

  // ── 2. Preview on Website requested by Editor ─────────────────────────────
  if (message.type === 'IMGLY_PREVIEW_ON_WEBSITE') {
    const { originalContext, previewState, css } = message.payload;
    const targetTabId = originalContext?.tabId;
    const editorTabId = sender.tab ? sender.tab.id : null;

    if (!targetTabId) {
      sendResponse({
        success: false,
        error: 'No original webpage tab reference found. This image may not have been imported from a live browser tab.',
      });
      return true;
    }

    // Check if the original tab still exists
    chrome.tabs.get(targetTabId, (tab) => {
      if (chrome.runtime.lastError || !tab) {
        sendResponse({
          success: false,
          error: 'Original webpage tab has been closed or could not be found.',
        });
        return;
      }

      // Switch to the original tab and focus its window
      chrome.tabs.update(targetTabId, { active: true }, () => {
        if (tab.windowId) {
          chrome.windows.update(tab.windowId, { focused: true });
        }

        const previewPayload = {
          originalContext,
          previewState,
          css,
          editorTabId: editorTabId || activeSessions.get(targetTabId)?.editorTabId,
        };

        // Send preview payload to content script on the original tab
        chrome.tabs.sendMessage(
          targetTabId,
          {
            type: 'IMGLY_APPLY_PREVIEW',
            payload: previewPayload,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              // Content script might need to be reinjected if page was reloaded
              chrome.scripting
                .executeScript({
                  target: { tabId: targetTabId },
                  files: ['content.js'],
                })
                .then(() => {
                  chrome.tabs.sendMessage(
                    targetTabId,
                    {
                      type: 'IMGLY_APPLY_PREVIEW',
                      payload: previewPayload,
                    },
                    (retryRes) => {
                      sendResponse(retryRes || { success: true });
                    }
                  );
                })
                .catch((err) => {
                  sendResponse({
                    success: false,
                    error: 'Could not connect to target page: ' + err.message,
                  });
                });
            } else {
              sendResponse(response || { success: true });
            }
          }
        );
      });
    });

    return true; // Keep message channel open for async response
  }

  // ── 3. Edit Again clicked from the website preview ────────────────────────
  if (message.type === 'IMGLY_EDIT_AGAIN') {
    const { editorTabId } = message.payload;

    if (editorTabId) {
      chrome.tabs.get(editorTabId, (tab) => {
        if (!chrome.runtime.lastError && tab) {
          chrome.tabs.update(editorTabId, { active: true }, () => {
            if (tab.windowId) {
              chrome.windows.update(tab.windowId, { focused: true });
            }
          });
          sendResponse({ success: true });
        } else {
          // If editor tab was closed, find any open localhost:3000 tab or open a new one
          chrome.tabs.query({ url: '*://localhost:3000/*' }, (tabs) => {
            if (tabs && tabs.length > 0) {
              chrome.tabs.update(tabs[0].id, { active: true });
            } else {
              chrome.tabs.create({ url: 'http://localhost:3000/' });
            }
            sendResponse({ success: true });
          });
        }
      });
    } else {
      chrome.tabs.query({ url: '*://localhost:3000/*' }, (tabs) => {
        if (tabs && tabs.length > 0) {
          chrome.tabs.update(tabs[0].id, { active: true });
        } else {
          chrome.tabs.create({ url: 'http://localhost:3000/' });
        }
        sendResponse({ success: true });
      });
    }

    return true;
  }
});
