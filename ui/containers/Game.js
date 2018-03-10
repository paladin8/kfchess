import React, { Component } from 'react';
import { withRouter } from 'react-router';
import qs from 'query-string';

import GameBoard from './GameBoard.js';
import GameState from '../util/GameState.js';

class Game extends Component {

    constructor(props) {
        super(props);

        const gameId = props.match.params.gameId;

        const { key } = qs.parse(props.location.search);
        const playerKey = props.playerKey || key;

        this.state = {
            gameState: new GameState(gameId, playerKey),
            playerKeys: props.playerKeys,
        };
    }

    componentWillUnmount() {
        if (this.state.gameState) {
            this.state.gameState.destroy();
        }
    }

    render () {
        const { gameState, playerKeys } = this.state;
        const baseUrl = `${window.location.origin}${window.location.pathname}`

        return (
            <div>
                {playerKeys && <div>Player 1: {`${baseUrl}?key=${playerKeys['1']}`}</div>}
                {playerKeys && <div>Player 2: {`${baseUrl}?key=${playerKeys['2']}`}</div>}
                {gameState && <GameBoard gameState={gameState} />}
            </div>
        );
    }
};

export default withRouter(Game);
