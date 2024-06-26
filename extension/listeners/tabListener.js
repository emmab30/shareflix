import LDNClient from '../ldn';
import Constants from '../../shared/constants';

export default class TabListener {
    // TODO: Should we execute the script when popup.js is instantiated?
    constructor(ws, user) {
        // TODO: Check implementation
        this.ws = ws;
        this.user = user;
        this.loaded = false;
        this.setTabId(-1);

        this._queryNetflixTab();
        chrome.tabs.onCreated.addListener(tab => {
            this.onCreate(tab);
        });
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.onUpdate(tabId, changeInfo, tab);
        });
        chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
            this.onRemove(tabId, removeInfo);
        });
        chrome.webNavigation.onCompleted.addListener(details => {
            if (TabListener.isNetflix(details) && details.url.includes('watch/')) {
                // Reload the controller script
                this.loaded = false;
                this._startControllerScript();
            }
        });

        // Detect when is refreshing tab or moving out from /watch
        chrome.webNavigation.onBeforeNavigate.addListener(details => {
            if (!details.url.includes('watch/')) {
                /* const isOpenedWSConnection = this.ws && this.ws.readyState === 1;
                const userURL = LDNClient.getInstance().user ? LDNClient.getInstance().user.urlParams : null;
                const isWatching = isOpenedWSConnection && userURL && userURL.includes('watch');
                if(isWatching) {
                    alert("Desconectar!");
                    LDNClient.getInstance().disconnect();
                } */
            }
        });

        console.log('<TabListener> Tab listener started!');
    }

    // ===============
    // Private Methods
    // ===============
    _queryNetflixTab() {
        // This is unsafe but works for now
        chrome.tabs.query(
            {
                title: 'Netflix'
            },
            tabs => {
                if (tabs.length === 0) this.setTabId(-1);
                else {
                    this._update(tabs[0]);
                    return tabs[0];
                }
            }
        );
    }

    _startControllerScript() {
        LDNClient.getInstance().user.controllerState =
            Constants.ControllerState.PENDING;
        if (this.loaded) {
            chrome.tabs.sendMessage(this.tabId, {
                type: Constants.Protocol.Messages.UPDATE_CONTROL_SCRIPT,
                code: true
            });
            return;
        }

        this.loaded = true;
        chrome.tabs.executeScript(
            this.tabId,
            {
                file: 'loader.js',
                runAt: 'document_start'
            },
            results => {
                this.loaded = true;
                console.log('<TabListener> Attempted to run loader script!');
                // throw new Error('Failed to start loader script.');
            }
        );
    }

    _disableControllerScript() {
        chrome.tabs.sendMessage(this.tabId, {
            type: Constants.Protocol.Messages.UPDATE_CONTROL_SCRIPT,
            code: false
        });
    }

    _uncacheTab() {
        console.log('<TabListener> Removing tab id: ' + this.tabId);
        this.loaded = false;
        this.setTabId(-1);
    }

    _cacheTab(tabId) {
        console.log('<TabListener> Setting tab id: ' + tabId);
        this.setTabId(tabId);
    }

    setTabId(tabId) {
        this.tabId = tabId;
        this.user.id = tabId;

        if (this.tabId === -1) return;

        if (this.ws) {
            console.log(this.ws);
            console.log(`Sending tab ID for connecting: ${this.tabId}`, localStorage.getItem('shareflix_username'));
            this.ws.send(JSON.stringify({
                type: Constants.Protocol.Messages.SET_USER,
                tabId: this.tabId,
                alias: localStorage.getItem('shareflix_username') || null,
            }));
        }
    }

    _update(tab) {
        if (TabListener.isNetflix(tab)) {
            chrome.pageAction.show(tab.id, undefined);
            console.log('<TabListener> Updated: ', tab.url);
            if (!this.isTabCached()) this._cacheTab(tab.id);
            if (tab.url.includes('watch')) {
                if (LDNClient.getInstance().user.urlParams.includes('watch')) {
                    // Before the URL params get updated,
                    // If the previous URL params included 'watch'
                    // Then we'll restart the controller script
                    this._disableControllerScript();
                }
                this._startControllerScript();
            } else if (tab.url.includes('browse')) {
                LDNClient.getInstance().user.controllerState =
                    Constants.ControllerState.INACTIVE;
                this._disableControllerScript();
            }

            const urlParams = TabListener.getUrlParams(tab);
            if (LDNClient.getInstance().user.urlParams !== urlParams) {
                console.log('<TabListener> Updated user url parameters: ' + urlParams);
                LDNClient.getInstance().setUrlParams(urlParams);
            }
        } else {
            this._uncacheTab();
        }
    }

    // ==============
    // Public Methods
    // ==============

    isTabCached() {
        return this.tabId !== -1;
    }

    // ===============
    // Handler Methods
    // ===============

    onCreate(tab) {
        console.log('<TabListener> Created: ', tab.url);
        this._update(tab);
    }

    onUpdate(tabId, changeInfo, tab) {
        // TODO: Reimplement
        if (tab.url === LDNClient.getInstance().user.urlParams) return;
        if (!changeInfo.status || changeInfo.status !== 'complete') return;
        this._update(tab);
    }

    onRemove(tabId, removeInfo) {
        if (tabId === this.tabId) this._uncacheTab();
    }

    static isNetflix(tab) {
        if (!tab) return false;
        return tab.url.includes('https://www.netflix.com/');
    }

    static getUrlParams(tab) {
        if (!tab) return '';
        // TODO: Reimplement
        return tab.url.split('netflix.com/')[1].split('?')[0];
    }
}
