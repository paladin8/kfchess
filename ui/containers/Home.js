import React, { Component } from 'react';
import { withRouter } from 'react-router'

import GameJoin from './GameJoin.js';
import GameSetup from './GameSetup.js';

class Home extends Component {

    constructor(props) {
        super(props);

        this.createNewGame = this.createNewGame.bind(this);
        this.joinGame = this.joinGame.bind(this);
    }

    createNewGame(moveTicks, cooldownTicks, isBot, difficulty) {
        fetch('/api/game/new', {
            body: JSON.stringify({ moveTicks, cooldownTicks, bots: isBot ? {1: difficulty, 2: difficulty} : {} }),
            credentials: 'same-origin',
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
        }).then(response => {
            response.json().then(data => {
                this.props.setPlayerKeys(data.playerKeys);
                this.props.history.push(`/game/${data.id}?key=${data.playerKeys['1']}`);
            });
        });
    }

    joinGame(gameId, playerKey) {
        this.props.history.push(`/game/${gameId}?key=${playerKey}`);
    }

    render () {
        return (
            <div>
                <GameSetup createNewGame={this.createNewGame} />
                <GameJoin joinGame={this.joinGame} />
            </div>
        );
    }
};

export default withRouter(Home);
