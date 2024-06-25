// Script

var s = document.createElement('script');
s.id = 'controller.js';
s.src = chrome.extension.getURL('controller.bundle.js');

s.onload = () => {
    s.remove();
};

console.log(`<loader.js> Adding global listeners for window.postMessage and chrome.tabs.sendMessage`);

// Messages from controller.js and any window.postMessage in this context
window.addEventListener('message', event => {
    chrome.runtime.sendMessage(event.data);
});

// Messages from ldn.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    window.postMessage(msg);
});

(document.head || document.documentElement).appendChild(s);
console.log('<Loader> Injecting controller script...');
