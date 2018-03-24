import openSocket from 'socket.io-client';

export default class Listener {

    constructor(userId, inviteCallback) {
        this.userId = userId;
        this.inviteCallback = inviteCallback;

        this.destroyed = false;

        this.connect();
    }

    connect() {
        this.socket = openSocket();
        this.socket.on('disconnect', () => {
            if (!this.destroyed) {
                this.socket.close();
                this.connect();
            }
        });

        this.socket.on('invite', this.inviteCallback);

        this.socket.emit('listen', JSON.stringify({ userId: this.userId }));
    }

    destroy() {
        this.destroyed = true;
        this.socket.close();
    }
};
