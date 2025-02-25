chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && (tab.url.includes('twitter.com') || tab.url.includes('x.com'))) {
    try {
      chrome.tabs.sendMessage(tabId, {
        action: "pageLoaded",
        url: tab.url
      }).catch(error => console.error('Error sending message:', error));
    } catch (error) {
      console.error('Error in onUpdated listener:', error);
    }
  }
}); 