import openSocket from 'socket.io-client';

export default class GameState {

    constructor(gameId, playerKey) {
        this.gameId = gameId;
        this.playerKey = playerKey;

        this.player = null;
        this.game = null;
        this.lastUpdate = new Date();
        this.updateListeners = [];

        this.handleMessage = this.handleMessage.bind(this);
        this.onMove = this.onMove.bind(this);

        this.socket = openSocket();
        this.socket.on('joinack', this.handleMessage);
        this.socket.on('readyack', this.handleMessage);
        this.socket.on('update', this.handleMessage);
        this.socket.on('moveack', this.handleMessage);
        this.socket.on('resetack', this.handleMessage);

        this.socket.emit('join', JSON.stringify({ gameId, playerKey }));
    }

    handleMessage(data) {
        if (data.player !== undefined) {
            this.player = data.player;
        }

        this.update(data.game);
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

        const currentTime = new Date();
        return this.game.currentTick + (currentTime - this.lastUpdate + 1000 * this.game.timeSinceLastTick) / 100;
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
