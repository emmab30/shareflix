import Constants from '../shared/constants';

// NOT PERSISTENT
class Popup {
    constructor() {
        this.views = {};
        $(() => {
            this.views[Constants.ViewState.IN_LOBBY] = $('#in-lobby-container');
            this.views[Constants.ViewState.OUT_LOBBY] = $('#out-lobby-container');
            this.views[Constants.ViewState.CONNECT_LOBBY] = $(
                '#connect-lobby-container'
            );

            $('#toggle-shareflix').on('click', event => this.toggleShareflix(event));
            $("#disconnect-shareflix").on('click', event => this.disconnect(event));

            // Detect changes text on #username
            $('#username').val(localStorage.getItem('shareflix_username'));
            $('#username').on('input', event => {
                localStorage.setItem('shareflix_username', $('#username').val());
            });

            // Check if extension is enabled
            if (localStorage.getItem('extensionEnabled') === 'true') {
                this.getClient().extensionEnabled = true;
                this.enableEdition();

                document.querySelector('.extension-enabled-subtitle').textContent = 'Shareflix is enabled';
                document.getElementById('toggle-shareflix').classList.remove('disabled');
            } else {
                this.getClient().extensionEnabled = false;
                this.disableEdition();

                document.querySelector('.extension-enabled-subtitle').textContent = 'Shareflix is disabled';
                document.getElementById('toggle-shareflix').classList.add('disabled');
            }

            this.updateWatchingState(this.isWatching());
        });
    }

    // ===============
    // Private Methods
    // ===============

    // Popup script is not persistent, or run in the same context
    // So we cannot use LDNClient.getInstance()
    getClient() {
        return chrome.extension.getBackgroundPage().ldn;
    }

    _getLobbyIdText() {
        return $('#lobby-id-text')[0];
    }

    toggleShareflix(event) {
        console.log('Toggling Shareflix');
        const toggleBtn = document.getElementById('toggle-shareflix');
        this.getClient().extensionEnabled = !this.getClient().extensionEnabled;

        localStorage.setItem('extensionEnabled', this.getClient().extensionEnabled);

        // document.querySelector('.extension-enabled-status').textContent = this.getClient().extensionEnabled ? 'Disable Shareflix' : 'Enable Shareflix';
        document.querySelector('.extension-enabled-subtitle').textContent = this.getClient().extensionEnabled ? 'Shareflix is enabled' : 'Shareflix is disabled';
        // Add class disabled if disabled

        if (this.getClient().extensionEnabled) {
            toggleBtn.classList.remove('disabled');
            this.enableEdition();
        } else {
            toggleBtn.classList.add('disabled');
            this.disableEdition();
        }
    }

    enableEdition() {
        $('#container-enabled').animate({
            opacity: 1
        }).css({
            pointerEvents: 'auto'
        });
    }

    disableEdition() {
        $('#container-enabled').animate({
            opacity: .2
        }).css({
            pointerEvents: 'none'
        });
    }

    _updateViewState(newState) {
        console.log('<Popup> Updating view state: ' + newState);
        for (const state in this.views) {
            if (state == newState) this.views[state].appendTo('body');
            else this.views[state].detach();
        }

        if (newState == Constants.ViewState.IN_LOBBY) {
            if (this._getLobbyIdText())
                this._getLobbyIdText().innerHTML = this.getClient().user.lobbyId;
        } else {
            if (this._getLobbyIdText()) this._getLobbyIdText().innerHTML = '';
        }
    }

    // =================
    // UI Button Handlers
    // =================
    disconnect(event) {
        if (this.isWatching()) {
            console.log(`[Event] Disconnected from session..`);
            this.getClient().disconnect();
            this.updateWatchingState(false);
        }
    }

    updateWatchingState(isWatching) {
        if (isWatching) {
            $('#disconnect-shareflix').animate({
                opacity: 1
            });
        } else {
            $('#disconnect-shareflix').animate({
                opacity: .3
            });
        }
    }

    isWatching() {
        const isOpenedWSConnection = this.getClient().ws && this.getClient().ws.readyState === 1;
        const userURL = this.getClient().user ? this.getClient().user.urlParams : null;
        return isOpenedWSConnection && userURL && userURL.includes('watch');
    }
}

const popup = new Popup();
