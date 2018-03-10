import React, { Component } from 'react';
import { BrowserRouter, Route, Link } from 'react-router-dom';

import Game from './Game.js';
import Header from './Header.js';
import Home from './Home.js';

export default class App extends Component {

    constructor(props) {
        super(props);

        this.state = {
            playerKeys: null,
        };

        this.setPlayerKeys = this.setPlayerKeys.bind(this);
    }

    setPlayerKeys(playerKeys) {
        this.setState({ playerKeys });
    }

    render() {
        const { playerKeys } = this.state;

        return (
            <BrowserRouter>
                <div>
                    <Header />
                    <Route exact path='/' render={(props) => {
                        return <Home setPlayerKeys={this.setPlayerKeys} {...props} />
                    }} />
                    <Route path='/game/:gameId' render={(props) => {
                        return <Game playerKeys={playerKeys} {...props} />
                    }} />
                </div>
            </BrowserRouter>
        );
    }
};
