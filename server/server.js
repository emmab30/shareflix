const Lobby = require('./model/lobby');
const User = require('../shared/model/user');
const _ = require('lodash');
const WebSocket = require('ws');
const Constants = require('../shared/constants');
// We use hri here because shared cannot import npm modules
const hri = require('human-readable-ids').hri;
const Util = require('../shared/util');
require('../shared/fills');

const PORT = 3011;
const LOBBY_TEST = 'test-lobby';

class LDNServer {
    constructor(start = true) {
        this.lobbies = {};
        this.users = {};
        this.sockets = {};
        process.on('exit', () => {
            this._exitHandler();
        });
        process.on('SIGINT', () => {
            this._exitHandler();
        });
        if (start) this.start();
    }

    // ===============
    // Handler Methods
    // ===============

    _exitHandler() {
        if (this.server) this.server.close();
    }

    _onConnection(socket, req) {
        console.log(
            '<Info> Connection received from: ',
            req.connection.remoteAddress
        );
        socket.on('message', (msg) => {
            this._onMessage(socket, msg);
        });
    }

    _onMessage(socket, msg) {
        const data = JSON.parse(msg);
        if (!data) {
            console.log('<Error> Server received janky JSON data!');
            return;
        }

        let user;
        if (data?.user) {
            user = JSON.parse(data.user);
        }
        console.log('<Info> Received message with type: ', data.type);
        switch (data.type) {
            case Constants.Protocol.Messages.SET_USER:
                this.setUserConnected(socket, data);
                break;
            case Constants.Protocol.Messages.REQUEST_CODE:
                this.requestCode(socket, data);
                break;
            case Constants.Protocol.Messages.CONNECT_CODE:
                this.connectCode(socket, data);
                break;
            case Constants.Protocol.Messages.START_SESSION:
                this.startSession(socket, data);
                break;
            case Constants.Protocol.Messages.SYNC_INIT:
                this.sync(socket, data);
                break;
            case Constants.Protocol.Messages.SYNC_TIME_ACK:
                this._syncTimeAck(socket, data);
                break;
            case Constants.Protocol.Messages.UPDATE_URL:
                this._updateUrl(socket, data);
                break;
            case Constants.Protocol.Messages.SYNC_INIT:
                this.sync(socket, data);
                break;
            case Constants.Protocol.Messages.SYNC_TIME_ACK:
                this._syncTimeAck(socket, data);
                break;
            case Constants.Protocol.Messages.UPDATE_STATE:
            case Constants.Protocol.Messages.UPDATE_SEEK:
                this.updateStateOrSeek(socket, data);
                break;
            case Constants.Protocol.Messages.DISCONNECT:
                this.disconnect(socket, data);
                break;
            /* case Constants.Protocol.Messages.SEND_MESSAGE:
                this.sendMessage(socket, data);
                break; */
            // WebRTC
            case Constants.Protocol.Stream.OFFER:
                // Save the streamId for the user
                this.sendOfferRTC(socket, data);
                break;
            case Constants.Protocol.Stream.ANSWER:
                this.sendAnswerRTC(socket, data);
                break;
            case Constants.Protocol.Stream.ICE_CANDIDATE:
                this.sendCandidateRTC(socket, data);
                break;
            // Video
            case Constants.Protocol.Video.PLAY:
                this.changeStreamStatus(socket, data, {
                    video: true
                });
                break;
            case Constants.Protocol.Video.PAUSE:
                this.changeStreamStatus(socket, data, {
                    video: false
                });
                break;
            case Constants.Protocol.Audio.MUTE:
                this.changeStreamStatus(socket, data, {
                    audio: false
                });
                break;
            case Constants.Protocol.Audio.UNMUTE:
                this.changeStreamStatus(socket, data, {
                    audio: true
                });
                break;
        }
    }

    setUserConnected(socket, data) {
        let response = {
            type: Constants.Protocol.Messages.SET_USER_ACK,
            code: Constants.Protocol.SUCCESS,
        };

        if (!this.sockets[data.tabId]) {
            const user = new User();
            user.id = data.tabId;
            user.alias = data.alias;
            user.controller = true;

            this.sockets[user.id] = socket;
            this.users[user.id] = user;
        }

        socket.send(JSON.stringify(response));
    }

    requestCode(socket, data) {
        const response = {
            type: Constants.Protocol.Messages.REQUEST_CODE_ACK,
        };
        try {
            const user = User.fromJson(data.user);
            /* const code = Math.floor(100000 + Math.random() * 900000); */
            const code = 111111;

            // Create lobby for the code
            const lobby = new Lobby(code, user);
            lobby.initiatorId = user.id; // This is the initiator of the lobby
            lobby.add(user);

            this.addLobby(lobby);
            response.code = code;
            response.lobbyId = lobby.id;
            response.userId = user.id;
            response.user = user;
            this.sockets[user.id] = socket;

            // Send updates for lobby!
            this.sendLobbyUpdated(socket, code);
        } catch (err) {
            response.code = Constants.Protocol.FAIL;
            console.log(err);
        }
        socket.send(JSON.stringify(response));
    }

    connectCode(socket, data) {
        const response = {
            type: Constants.Protocol.Messages.CONNECT_CODE_ACK,
        };
        try {
            const user = User.fromJson(data.user);

            // Check if all the users are in the same movie
            const userUrlParams = user.urlParams;
            const lobbyUsers = this.getLobby(data.code).users;
            const lobbyUsersUrlParams = Object.values(lobbyUsers).map((user) => user.urlParams);
            const allUsersInSameMovie = lobbyUsersUrlParams.every((urlParams) => urlParams === userUrlParams);
            if (allUsersInSameMovie) {
                const lobby = this.getLobby(data.code);
                user.lobbyId = data.code;
                lobby.add(user);

                response.code = data.code;
                response.lobbyId = lobby.id;
                response.userId = user.id;

                // Send updates for lobby!
                this.sendLobbyUpdated(socket, data.code);
            } else {
                response.code = Constants.Protocol.FAIL;
                response.message = "All users must be in the same movie";
                response.lobby_owner = Object.values(lobbyUsers)[0];
            }
        } catch (err) {
            console.log(err);
            response.code = Constants.Protocol.FAIL;
        }

        socket.send(JSON.stringify(response));
    }

    startSession(socket, data) {
        const response = {
            type: Constants.Protocol.Messages.START_SESSION_ACK,
        };

        try {
            const user = User.fromJson(data.user);
            const lobby = this.getLobby(user.lobbyId);
            lobby.started = true;

            response.code = Constants.Protocol.SUCCESS;

            this.sendToLobby(socket, user.lobbyId, response);
            this.sendLobbyUpdated(socket, user.lobbyId);
        } catch (err) {
            response.code = Constants.Protocol.FAIL;
            console.log(err);
        }
    }

    disconnect(socket, data) {
        const response = {
            type: Constants.Protocol.Messages.DISCONNECT_ACK,
        };

        try {
            const user = User.fromJson(data.user);
            const lobby = this.getLobby(user.lobbyId);
            lobby.remove(user);

            if (lobby.size() === 0) {
                delete this.lobbies[lobby.id];
            }

            delete this.sockets[user.id];
            delete this.users[user.id];

            response.code = Constants.Protocol.SUCCESS;
            this.sendLobbyUpdated(socket, user.lobbyId);
        } catch (err) {
            console.log(err);
        }

        socket.send(JSON.stringify(response));
    }

    changeStreamStatus(socket, data, streamStatus) {
        try {
            const user = User.fromJson(data.user);
            const lobby = this.getLobby(user.lobbyId);
            const userStream = lobby.getUserStream(user.id) || { audio: false, video: false };

            if (userStream) {
                if (streamStatus.audio !== undefined) {
                    userStream.audio = streamStatus.audio;
                }
                if (streamStatus.video !== undefined) {
                    userStream.video = streamStatus.video;
                }
            }

            lobby.setUserStream(user.id, userStream);

            data.streams = lobby.getStreams();
            delete data.streamId;

            this._emit(lobby, data);

            this.sendLobbyUpdated(socket, user.lobbyId);
        } catch (err) {
            console.log(err);
        }
    }

    _onClose(event) {
        // Do we do anything here ??
        console.log("Catch the event!", event)
        console.log('<Warning> A WebSocket client disconnected.');
        return;
    }

    _updateUrl(socket, data) {
        const response = {
            type: Constants.Protocol.Messages.UPDATE_URL_ACK,
        };
        try {
            const user = User.fromJson(data.user);
            // const lobby = this.getLobby(user.lobbyId);
            const lobby = this.getLobby(LOBBY_TEST);
            const updateRequest = {
                type: data.type,
                urlParams: data.urlParams,
            };
            lobby.updateUser(user);
            this._emit(lobby, updateRequest);
            response.code = Constants.Protocol.SUCCESS;
        } catch (err) {
            response.code = Constants.Protocol.FAIL;
            console.log(err);
        }
        socket.send(JSON.stringify(response));
    }

    sync(socket, data) {
        const response = {
            type: Constants.Protocol.Messages.SYNC_INIT_ACK,
        };
        try {
            const user = User.fromJson(data.user);
            const lobby = this.getLobby(user.lobbyId);
            user.syncState = Constants.SyncState.PENDING;
            lobby.updateUser(user);

            if (lobby.isSynced()) {
                // Emit sync_time
                const syncTime = {
                    type: Constants.Protocol.Messages.SYNC_TIME,
                    progressState: lobby.getController().progressState,
                    user: user,
                };
                this._emit(lobby, syncTime);

                // Set controller sync state to synced?
                lobby.getController().syncState = Constants.SyncState.SYNCED;
            }
            response.syncState = user.syncState;
            response.code = Constants.Protocol.SUCCESS;
            response.user = user;

            this.sendLobbyUpdated(socket, user.lobbyId);
        } catch (err) {
            response.code = Constants.Protocol.FAIL;
            console.log(err);
        }

        socket.send(JSON.stringify(response));
    }

    _syncTimeAck(socket, data) {
        try {
            const user = User.fromJson(data.user);
            const lobby = this.getLobby(user.lobbyId);

            user.syncState = Constants.SyncState.SYNCED;
            lobby.updateUser(user);
            if (lobby.isSynced()) {
                // Emit sync_end to all
                const syncEnd = {
                    type: Constants.Protocol.Messages.SYNC_END,
                    syncState: user.syncState,
                    user: user,
                };
                this._emit(lobby, syncEnd);
            }

            this.sendLobbyUpdated(socket, user.lobbyId);
        } catch (err) {
            console.log(err);
        }
    }

    sendLobbyUpdated(socket, lobbyId) {
        try {
            const lobby = this.getLobby(lobbyId);
            lobby.streams = lobby.getStreams();
            let lobbyUpdated = {
                type: Constants.Protocol.Events.LOBBY_UPDATED,
                lobby: {
                    ...lobby,
                    users: Object.values(lobby.users),
                }
            };

            // Emit to every user
            for (let userId in lobby.users) {
                if (userId in this.sockets) {
                    // Set my user the flag "me" in true
                    lobbyUpdated.lobby.users = lobbyUpdated.lobby.users.map((user) => {
                        return {
                            ...user,
                            me: user.id == userId
                        };
                    });

                    console.log('<Info> Sending lobby update to ' + userId + '...')
                    this.sockets[userId].send(JSON.stringify(lobbyUpdated));
                }
            }

            /* this._emit(lobby, lobbyUpdated); */
        } catch (err) {
            console.log(err);
        }
    }

    sendToLobby(socket, lobbyId, data) {
        try {
            const lobby = this.getLobby(lobbyId);
            // Emit to every user from the lobby
            for (let userId in lobby.users) {
                if (userId in this.sockets) {
                    console.log('<Info> Sending to lobby user ' + userId + '...')
                    this.sockets[userId].send(JSON.stringify(data));
                }
            }
        } catch (err) {
            console.log(err);
        }
    }


    sendOfferRTC = (socket, data) => {
        try {
            const user = User.fromJson(data.user);
            user.offer = data.offer;

            const lobby = this.getLobby(user.lobbyId);
            lobby.createStreamForUser(user.id, data.streamId);
            this._emit(lobby, data);

            this.sendLobbyUpdated(socket, user.lobbyId);
        } catch (err) {
            console.log(err);
        }
    }

    sendAnswerRTC = (socket, data) => {
        try {
            const user = User.fromJson(data.user);
            const lobby = this.getLobby(user.lobbyId);
            this._emit(lobby, data);

            this.sendLobbyUpdated(socket, user.lobbyId);
        } catch (err) {
            console.log(err);
        }
    }

    sendCandidateRTC = (socket, data) => {
        try {
            const user = User.fromJson(data.user);
            const lobby = this.getLobby(user.lobbyId);
            this._emit(lobby, data);

            this.sendLobbyUpdated(socket, user.lobbyId);
        } catch (err) {
            console.log(err);
        }
    }

    sendMessage(socket, data) {
        try {
            const user = User.fromJson(data.user);
            const lobby = this.getLobby(user.lobbyId);
            this._emit(lobby, data);
        } catch (err) {
            console.log(err);
        }
    }

    updateStateOrSeek(socket, data) {
        try {
            const user = User.fromJson(data.user);
            const lobby = this.getLobby(user.lobbyId);
            lobby.updateUser(user);

            this._emit(lobby, data);
        } catch (err) {
            console.log(err);
        }
    }

    isSyncMessage = (msg) => {
        return [
            Constants.Protocol.Messages.SYNC_TIME,
            Constants.Protocol.Messages.SYNC_TIME,
            Constants.Protocol.Messages.SYNC_INIT,
            Constants.Protocol.Messages.SYNC_INIT_ACK,
            Constants.Protocol.Messages.SYNC_END,
            Constants.Protocol.Messages.SYNC_END_ACK,
            Constants.Protocol.Messages.UPDATE_TIME,
            Constants.Protocol.Messages.UPDATE_TIME_ACK
        ].indexOf(msg.type) > -1;
    };

    _emit(lobby, msg) {
        Object.keys(lobby.users).forEach((userId) => {
            console.log('<Info> Emitting a msg ' + msg.type + ' to ' + lobby.id + `[${userId}]`);
            if (userId in this.sockets) {
                const socket = this.sockets[userId];
                msg.source = 'websocket';
                socket.send(JSON.stringify(msg));
            } else {
                console.log('<Warning> Failed to send ' + msg.type + ' to ' + userId);
            }
        });
    }

    // ==============
    // Public Methods
    // ==============

    start() {
        this.server = new WebSocket.Server({ port: PORT });
        console.log('<Info> Listening on port: ', PORT);
        this.server.on('connection', (socket, req) => {
            this._onConnection(socket, req)
        });
        this.server.on('close', (event) => this._onClose(event));
        this.server.on('disconnect', (event) => this._onClose(event));
    }

    contains(lobbyId) {
        return lobbyId in this.lobbies;
    }

    addLobby(lobby) {
        if (!this.contains(lobby.id)) this.lobbies[lobby.id] = lobby;
    }

    getLobby(lobbyId) {
        if (this.contains(lobbyId)) return this.lobbies[lobbyId];
        else throw new Error(`Could not find lobby [${lobbyId}] in server.`);
    }

    isConnected(user) {
        try {
            return (
                this.getLobby(user.lobbyId).contains(user) && user.id in this.sockets
            );
        } catch (err) {
            return false;
        }
    }
}

module.exports = new LDNServer(true);
