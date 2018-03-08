import React, {Component} from 'react';

import GameBoard from './GameBoard.js';
import GameJoin from './GameJoin.js';
import GameSetup from './GameSetup.js';
import GameState from '../util/GameState.js';

export default class App extends Component {

    constructor(props) {
        super(props);

        this.state = {
            gameState: null,
            playerKeys: null,
        };

        this.createNewGame = this.createNewGame.bind(this);
        this.joinGame = this.joinGame.bind(this);
    }

    createNewGame(moveTicks, cooldownTicks, isBot, difficulty) {
        fetch('/game/new', {
            body: JSON.stringify({ moveTicks, cooldownTicks, bots: isBot ? {1: difficulty, 2: difficulty} : {} }),
            credentials: 'same-origin',
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
        }).then(response => {
            response.json().then(data => {
                if (this.state.gameState) {
                    this.state.gameState.destroy();
                }

                this.setState({
                    gameState: new GameState(data.id, data.playerKeys['1']),
                    playerKeys: data.playerKeys,
                });
            });
        });
    }

    joinGame(gameId, playerKey) {
        this.setState({
            gameState: new GameState(gameId, playerKey),
        });
    }

    render () {
        const { gameState, playerKeys } = this.state;

        return (
            <div>
                <GameSetup createNewGame={this.createNewGame} />
                <GameJoin joinGame={this.joinGame} />
                {playerKeys && <div>Player 1: {playerKeys['1']}</div>}
                {playerKeys && <div>Player 2: {playerKeys['2']}</div>}
                {gameState && <GameBoard gameState={gameState} />}
            </div>
        );
    }
};
