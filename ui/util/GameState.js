import openSocket from 'socket.io-client';

const SIMULATED_DELAY = 0;

export default class GameState {

    constructor(gameId, playerKey) {
        this.gameId = gameId;
        this.playerKey = playerKey;

        this.player = null;
        this.game = null;
        this.lastUpdate = new Date();
        this.lastCurrentTick = 0;
        this.lastCurrentTime = new Date();
        this.updateListeners = [];

        this.handleMessage = this.handleMessage.bind(this);
        this.onMove = this.onMove.bind(this);

        this.connect();
    }

    connect() {
        this.socket = openSocket();
        this.socket.on('disconnect', () => {
            this.socket.close();
            this.connect();
        });

        this.socket.on('joinack', this.handleMessage);
        this.socket.on('readyack', this.handleMessage);
        this.socket.on('update', this.handleMessage);
        this.socket.on('moveack', this.handleMessage);
        this.socket.on('resetack', this.handleMessage);

        this.socket.emit('join', JSON.stringify({ gameId: this.gameId, playerKey: this.playerKey }));
    }

    handleMessage(data) {
        if (data.player !== undefined) {
            this.player = data.player;
        }

        if (SIMULATED_DELAY > 0) {
            setTimeout(() => this.update(data.game), Math.random() * SIMULATED_DELAY);
        } else {
            this.update(data.game);
        }
    }

    update(game) {
        this.game = game;
        this.lastUpdate = new Date();
        for (let i = 0; i < this.updateListeners.length; i++) {
            this.updateListeners[i](this);
        }
    }

    registerListener(listener) {
        this.updateListeners.push(listener);
        listener(this);
    }

    getCurrentTick() {
        if (this.game.finished) {
            return this.game.currentTick;
        }

        // compute the tick based on the game as last received from the server
        const currentTime = new Date();
        const newTick = this.game.currentTick + (currentTime - this.lastUpdate + 1000 * this.game.timeSinceLastTick) / 100;

        // compute the tick based on the the last tick computation and how much time has passed
        const expectedTick = this.lastCurrentTick + (currentTime - this.lastCurrentTime) / 100;

        // differ by too much, jump to current
        if (Math.abs(newTick - expectedTick) > 10) {
            this.lastCurrentTick = newTick;
            this.lastCurrentTime = currentTime;
            return newTick;
        }

        // compute speed based on difference between expected and server tick:
        //   - expected ahead by 10 ticks => e times slower ticks
        //   - expected behind by 10 ticks => e times faster ticks
        const speed = Math.exp((newTick - expectedTick) / 10);
        const currentTick = this.lastCurrentTick + speed * (currentTime - this.lastCurrentTime) / 100;

        this.lastCurrentTick = currentTick;
        this.lastCurrentTime = currentTime;

        return currentTick;
    }

    isReady() {
        if (this.game && this.player === 0) {
            return true;
        }
        return this.game && this.player && this.game.playersReady[this.player];
    }

    onReady() {
        this.socket.emit('ready', JSON.stringify({ gameId: this.gameId, playerKey: this.playerKey }));
    }

    onMove(pieceId, player, toRow, toCol) {
        this.socket.emit('move', JSON.stringify({
            gameId: this.gameId, playerKey: this.playerKey, pieceId, toRow, toCol
        }));
    }

    newGame() {
        this.socket.emit('reset', JSON.stringify({ gameId: this.gameId, playerKey: this.playerKey }));
    }

    destroy() {
        this.socket.emit('leave', JSON.stringify({ gameId: this.gameId }));
        this.socket.close();
    }
};
