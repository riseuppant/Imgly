document.getElementById('pick-btn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab.id) {
    // Inject the content script into the active tab
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    // Close the popup so the user can interact with the page
    window.close();
  }
});
