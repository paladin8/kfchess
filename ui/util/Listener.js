import openSocket from 'socket.io-client';

const PING_INTERVAL = 1000 * 60 * 5;  // 5 min

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

        if (this.interval) {
            cancelInterval(this.interval);
        }

        this.interval = setInterval(() => {
            this.socket.emit('uping', JSON.stringify({ userId: this.userId }));
        }, PING_INTERVAL);
    }

    destroy() {
        clearInterval(this.interval);

        this.destroyed = true;
        this.socket.close();
    }
};
