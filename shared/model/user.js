const ProgressState = require('./progressState');
const Constants = require('../constants');
const hri = require('human-readable-ids').hri;

module.exports = class User {
    constructor(
        urlParams = '',
        progressState = new ProgressState(),
        lobbyId = null,
        id = null,
        alias = null,
        controller = true,
        controllerState = Constants.ControllerState.INACTIVE,
        syncState = Constants.SyncState.INACTIVE
    ) {
        this.username = hri.random();
        this.lobbyId = lobbyId;
        this.id = id;
        this.alias = alias;
        this.controllerState = controllerState;
        this.urlParams = urlParams;
        this.progressState = progressState;
        this.controller = controller;
        this.syncState = syncState;
    }

    static fromJson(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            return new User(
                data['urlParams'],
                ProgressState.fromJson(JSON.stringify(data['progressState'])),
                data['lobbyId'],
                data['id'],
                data['alias'],
                data['controller'],
                data['controllerState'],
                data['syncState']
            );
        } catch (err) {
            throw new Error(err);
        }
    }
};
