class Lobby {
    constructor(id, controller, users = {}) {
        this.id = id;
        this.started = false;
        this.controllerId = controller.id;
        this.initiatorId = null;
        this.users = users;
        this.streams = [];
        this.add(controller);
        console.log('<Lobby> New lobby created: ' + this.id);
    }

    getStreams() {
        return this.streams;
    }

    getUserStream(userId) {
        const stream = this.streams.find((stream) => stream.userId == userId);
        if (stream) {
            return stream;
        }

        return null;
    }

    removeStreamByUserId(userId) {
        const index = this.streams.findIndex((stream) => stream.userId == userId);
        if (index > -1) {
            this.streams.splice(index, 1);
            return true;
        }
    }

    setUserStream(userId, {
        video,
        audio
    }) {
        const streamIndex = this.streams.findIndex((stream) => stream.userId == userId);
        console.log(`<lobby> Looking for stream for ${userId}. Index = ${streamIndex}`);
        if (streamIndex > -1) {
            this.streams[streamIndex].video = video;
            this.streams[streamIndex].audio = audio;
        } else {
            this.streams.push({
                userId,
                video,
                audio
            });
        }

        return true;
    }

    createStreamForUser(userId, streamId) {
        console.log(`<lobby> Creating stream for user`, userId, streamId);
        const index = this.streams.findIndex((stream) => stream.userId == userId);
        if (index == -1) {
            this.streams.push({
                streamId,
                userId,
                video: true,
                audio: true
            });
        } else {
            this.streams[index].streamId = streamId;
        }
    }

    isSynced() {
        if (this.users.length < 1) return false;
        /* To be synced, all users must have the same sync state */

        /* console.log(`Checking sync..`, this.users, this.getController().syncState)
        let syncState = this.getController().syncState;
        for (let userId in this.users) {
            if (this.users[userId].syncState !== syncState) return false;
        } */
        return true;
    }

    isController(user) {
        return true;
        /* return this.isControllerId(user.id); */
    }

    isControllerId(userId) {
        return true;
        /* return userId === this.controllerId; */
    }

    getController() {
        return this.users[this.controllerId];
    }

    updateUser(user) {
        this.users[user.id] = user;
    }

    contains(user) {
        return user.id in this.users;
    }

    add(user) {
        if (!this.contains(user)) this.users[user.id] = user;
    }

    remove(user) {
        if (this.contains(user)) {
            delete this.users[user.id];
            console.log('<Lobby: ' + this.id + '> Removed user: ' + user.id);
        }

        // Remove streams from the user
        this.removeStreamByUserId(user.id);

        if (this.isController(user)) {
            // Choose a different controller - this might be too complex
            if (this.size() > 0) {
                this.controllerId = this.users[Object.keys(this.users)[0]].id;
                console.log(
                    '<Lobby: ' +
                    this.id +
                    '> Re-assigned controller to user: ' +
                    this.controllerId
                );
            } else this.controllerId = null;
        }
    }

    size() {
        return Object.keys(this.users).length;
    }

    static fromJson(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            return new Lobby(data['id'], data['controller'], data['users']);
        } catch (err) {
            console.log('<Error> Tried to instantiate lobby with corrupt data!');
            return null;
        }
    }
};

module.exports = Lobby;