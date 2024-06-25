module.exports.ViewState = Object.freeze({
    IN_LOBBY: 1,
    OUT_LOBBY: 0,
    CONNECT_LOBBY: 2,
});
module.exports.ControllerState = Object.freeze({
    INACTIVE: -1,
    PENDING: 0,
    PAUSE: 1,
    PLAY: 2,
});
module.exports.SyncState = Object.freeze({
    INACTIVE: -1,
    PENDING: 0,
    SYNCED: 1,
});
module.exports.VideoState = Object.freeze({
    PAUSED: 0,
    PLAYING: 1,
    MUTED: 2,
    UNMUTED: 3,
});
module.exports.Protocol = Object.freeze({
    SUCCESS: 1,
    FAIL: 0,
    Events: {
        LOBBY_UPDATED: 'lobby_updated',
    },
    Messages: {
        // Requesting code and connecting to a code
        SET_USER: 'set_user',
        SET_USER_ACK: 'set_user_ack',
        REQUEST_CODE: 'request_code',
        REQUEST_CODE_ACK: 'request_code_ack',
        CONNECT_CODE: 'connect_code',
        CONNECT_CODE_ACK: 'connect_code_ack',
        START_SESSION: 'start_session',
        START_SESSION_ACK: 'start_session_ack',
        DISCONNECT: 'disconnect',
        DISCONNECT_ACK: 'disconnect_ack',

        CONNECT: 'connect',
        CONNECT_ACK: 'connect_ack',
        DISCONNECT_LOBBY: 'disconnect_lobby',
        DISCONNECT_LOBBY_ACK: 'disconnect_lobby_ack',
        SYNC_INIT: 'sync_init',
        SYNC_INIT_ACK: 'sync_init_ack',
        SYNC_TIME: 'sync_time',
        SYNC_TIME_ACK: 'sync_time_ack',
        SYNC_END: 'sync_end',
        SYNC_END_ACK: 'sync_end_ack',
        UPDATE_URL: 'update_url',
        UPDATE_URL_ACK: 'update_url_ack',
        UPDATE_CONTROL: 'update_control',
        UPDATE_CONTROL_ACK: 'update_control_ack',
        UPDATE_TIME: 'update_time',
        UPDATE_TIME_ACK: 'update_time_ack',
        UPDATE_SEEK: 'update_seek',
        UPDATE_SEEK_ACK: 'update_seek_ack',
        UPDATE_STATE: 'update_state',
        UPDATE_STATE_ACK: 'update_state_ack',
        UPDATE_CONTROL_SCRIPT: 'update_control_script',
        UPDATE_CONTROL_SCRIPT_ACK: 'update_control_script_ack',
        POPUP_LOADED: 'popup_loaded',
        POPUP_LOADED_ACK: 'popup_loaded_ack',
        SEND_MESSAGE: 'send_message',
    },
    Stream: {
        OFFER: 'offer',
        ANSWER: 'answer',
        ICE_CANDIDATE: 'ice-candidate'
    },
    Video: {
        PLAY: 'play',
        PAUSE: 'pause'
    },
    Audio: {
        MUTE: 'mute',
        UNMUTE: 'unmute',
    },
});

const DEVELOPMENT_MODE = false;
module.exports.DEVELOPMENT_MODE = DEVELOPMENT_MODE;
module.exports.WS_URL = Object.freeze('ws://127.0.0.1:3011/');