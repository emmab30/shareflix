/**
 * @author Jonathan Lin
 * @description Background script for LDN Chrome extension
 */

import TabListener from './listeners/tabListener';
import Constants from '../shared/constants';
import User from '../shared/model/user';

// Should separate runtime message protocol from websocket protocol
// Create universal logger

export default class LDNClient {
    static getInstance() {
        if (!this._instance) this._instance = new LDNClient();
        return this._instance;
    }

    constructor() {
        this.extensionEnabled = false;
        this.user = new User();
        this.user.controller = true;
        this.user.alias = localStorage.getItem('shareflix_username') || null;
        this._connect().then(() => {
            this.tabListener = new TabListener(this.ws, this.user);
            chrome.runtime.onMessage.addListener(this._onRuntimeMessage.bind(this));
            console.log('<LDN> LDN has been started!');
        });
    }

    // ===============
    // Private Methods
    // ===============

    _connect() {
        return new Promise((resolve, reject) => {
            if (!this.isSocketConnected() && this.isExtensionEnabled()) {
                try {
                    this.ws = new WebSocket(Constants.WS_URL);
                    console.log(`Connecting to ${Constants.WS_URL}`)
                    this.ws.onopen = () => {
                        console.log('<LDN> Connected to WebSocket server');
                        this.ws.onclose = this._onClose.bind(this);
                        this.ws.onerror = this._onError.bind(this);
                        this.ws.onmessage = (event) => this._onMessage(event);
                        resolve(null);
                    };

                    this.ws.onerror = (err) => {
                        console.log(err);
                    }
                } catch (err) {
                    reject(err);
                }
            } else {
                resolve(null);
            }
        });
    }

    disconnect() {
        if (this.isSocketConnected()) {
            this.ws.send(JSON.stringify({
                type: Constants.Protocol.Messages.DISCONNECT,
                user: JSON.stringify(this.user),
            }));
        }
    }

    _onClose(event) {
        console.log('<LDN> Server close');
        return;

        // Try reconnecting to the server every 3 seconds if the connection is closed. Retries: 3
        let retries = 3;
        const interval = setInterval(() => {
            if (retries === 0) {
                clearInterval(interval);
            } else {
                console.log(`<LDN> Reconnecting to the server..`)

                this._connect()
                    .then(() => {
                        this.ws.send(JSON.stringify({
                            type: Constants.Protocol.Messages.SET_USER,
                            tabId: this.tabListener.tabId,
                            alias: localStorage.getItem('shareflix_username'),
                        }));

                        clearInterval(interval);
                    })
                    .catch((err) => {
                        console.log(err);
                    });
            }
            retries--;
        }, 1000);
    }

    _onError(event) {
        console.log('<LDN> Server error');
        console.log(event);
    }

    // ==============
    // Public Methods
    // ==============

    disconnectLobby(msg) {
        this._connect()
            .then(() => {
                msg.user = JSON.stringify(this.user);
                this.ws.send(JSON.stringify(msg));
            })
            .catch((err) => {
                console.log(err);
            });
    }

    setUrlParams(urlParams) {
        this.user.urlParams = urlParams;
        // If the user is a controller && user is watching new content, then send url update request to server
        if (this.user.controller) {
            if (urlParams.includes('watch/')) {
                this._connect().then(() => {
                    const msg = {
                        type: Constants.Protocol.Messages.UPDATE_URL,
                        urlParams: this.user.urlParams,
                        user: JSON.stringify(this.user),
                    };
                    this.ws.send(JSON.stringify(msg));
                });
            }
        }
    }

    isConnected() {
        return this.user.currentLobby && this.user.id;
    }

    isSocketConnected() {
        return this.ws && this.ws.readyState === this.ws.OPEN;
    }

    isExtensionEnabled() {
        return localStorage.getItem("extensionEnabled") == 'true';
        // return this.extensionEnabled;
    }

    /*
    *   These are messages from websocket
    */
    _onMessage(event) {
        if (!this.isExtensionEnabled()) {
            console.log(`<LDN> Extension is disabled. Omitting websocket communication`);
            return;
        }

        try {
            const data = JSON.parse(event.data);
            let user;
            if (data.user && data.user.length > 0) {
                user = JSON.parse(data.user);
            }
            data.user = user;
            data.me = this.user;

            console.log('<LDN> Received a message with type <' + data.type + '>');
            switch (data.type) {
                case Constants.Protocol.Messages.SET_USER_ACK:
                    if (data.code === Constants.Protocol.SUCCESS) {
                        this.user.controller = true;
                        if (data.controller) {
                            const controller = JSON.parse(data.controller);
                            this._onMessage({
                                data: JSON.stringify({
                                    type: Constants.Protocol.Messages.UPDATE_URL,
                                    urlParams: controller.urlParams,
                                }),
                            });
                        }
                    }
                    break;
                case Constants.Protocol.Messages.REQUEST_CODE_ACK:
                case Constants.Protocol.Messages.CONNECT_CODE_ACK:
                    this.user.alias = localStorage.getItem('shareflix_username') || null;
                    this.user.lobbyId = data.lobbyId;
                    this.user.controller = data.controller;

                    chrome.tabs.sendMessage(this.tabListener.tabId, data);
                    break;
                case Constants.Protocol.Messages.DISCONNECT_ACK:
                    if (data.code === Constants.Protocol.SUCCESS) {
                        this.user.lobbyId = null;
                        this.user.controller = false;
                        this.ws.close();

                        // Go to netflix webpage
                        chrome.tabs.update(this.tabListener.tabId, {
                            url: 'https://netflix.com/',
                        });
                    } else {
                        // Todo?
                    }
                    break;
                case Constants.Protocol.Messages.UPDATE_URL:
                    if (this.user.urlParams !== data.urlParams) {
                        chrome.tabs.update(this.tabListener.tabId, {
                            url: 'https://netflix.com/' + data.urlParams,
                        });
                    }
                    break;
                case Constants.Protocol.Messages.UPDATE_CONTROL:
                    this.user.controller = data.code;
                    break;
                case Constants.Protocol.Messages.SYNC_TIME:
                    // TODO: Handle sync time...
                    chrome.tabs.sendMessage(this.tabListener.tabId, data);
                    break;
                case Constants.Protocol.Messages.SYNC_INIT_ACK:
                    this.user.syncState = data.syncState;
                    chrome.tabs.sendMessage(this.tabListener.tabId, data);
                    break;
                case Constants.Protocol.Messages.SYNC_END:
                    this.user.syncState = data.syncState;
                    chrome.tabs.sendMessage(this.tabListener.tabId, data);
                    break;
                case Constants.Protocol.Messages.UPDATE_SEEK:
                    chrome.tabs.sendMessage(this.tabListener.tabId, data);
                    break;
                case Constants.Protocol.Messages.UPDATE_STATE:
                    chrome.tabs.sendMessage(this.tabListener.tabId, data);
                    break;
                case Constants.Protocol.Messages.SEND_MESSAGE:
                    chrome.tabs.sendMessage(this.tabListener.tabId, data);
                    break;
                // WebRTC
                case Constants.Protocol.Stream.OFFER:
                    chrome.tabs.sendMessage(this.tabListener.tabId, data);
                    break;
                case Constants.Protocol.Stream.ANSWER:
                    chrome.tabs.sendMessage(this.tabListener.tabId, data);
                    break;
                case Constants.Protocol.Stream.ICE_CANDIDATE:
                    chrome.tabs.sendMessage(this.tabListener.tabId, data);
                    break;
                // Video
                default:
                    chrome.tabs.sendMessage(this.tabListener.tabId, data);
                    console.log(`<LDN> Unhandled msg:${data.type}`);
            }
        } catch (err) {
            console.log(err);
        }
    }

    /*
    *   These are messages received when using "chrome.tabs.sendMessage() method"
    *   This is called when the user executes a local action (like press play or pause on the local navigator)
    */
    _onRuntimeMessage(msg, sender, sendResponse) {
        if (typeof msg !== 'object') return;

        // We avoid to send the message if it already comes from the websocket
        if (msg.source == 'websocket') {
            return;
        }

        this.user.alias = localStorage.getItem('shareflix_username') || null;

        try {
            msg.user = JSON.stringify(this.user);

            // Reconnect if the websocket is closed
            if (!this.isSocketConnected()) {
                this._connect().then(() => {
                    this.ws.send(JSON.stringify(msg));
                });
                return;
            }

            switch (msg.type) {
                case Constants.Protocol.Messages.UPDATE_TIME:
                    this.user.progressState = msg.progressState;
                    break;
                case Constants.Protocol.Messages.REQUEST_CODE:
                    console.log("Sending here?");
                    this.ws.send(JSON.stringify(msg));
                    break;
                case Constants.Protocol.Messages.UPDATE_STATE:
                    this.user.controllerState = msg.controllerState;
                    this.ws.send(JSON.stringify(msg));
                    break;
                case Constants.Protocol.Messages.UPDATE_SEEK:
                    this.user.progressState = msg.progressState;
                    this.ws.send(JSON.stringify(msg));
                    break;
                case Constants.Protocol.Messages.SYNC_INIT:
                case Constants.Protocol.Messages.SYNC_TIME_ACK:
                    this.ws.send(JSON.stringify(msg));
                    break;
                case Constants.Protocol.Messages.SEND_MESSAGE:
                    this.ws.send(JSON.stringify(msg));
                    break;
                case Constants.Protocol.Stream.OFFER:
                    this.ws.send(JSON.stringify(msg));
                    break;
                case Constants.Protocol.Stream.ANSWER:
                    this.ws.send(JSON.stringify(msg));
                    break;
                case Constants.Protocol.Stream.ICE_CANDIDATE:
                    this.ws.send(JSON.stringify(msg));
                    break;
                // Video related
                case Constants.Protocol.Video.PAUSE:
                    this.ws.send(JSON.stringify(msg));
                    break;
                default:
                    console.log(`<LDN> Unhandled msg:${msg.type}`);
                    this.ws.send(JSON.stringify(msg));
            }
        } catch (err) {
            console.log(err);
        }
    }
}

window.ldn = LDNClient.getInstance();
