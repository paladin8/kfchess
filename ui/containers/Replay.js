import amplitude from 'amplitude-js';
import React, { Component } from 'react';

import GameBoard from './GameBoard.js';
import SpeedIcon from './SpeedIcon.js';
import UserDisplay from './UserDisplay.js';
import GameState from '../util/GameState.js';
import * as Time from '../util/Time.js';

export default class Replay extends Component {

    constructor(props) {
        super(props);

        const gameId = props.match.params.gameId;

        const gameState = new GameState(gameId, undefined, props.fetchUserInfo, () => {});

        this.state = {
            gameState,
            currentTick: 0,
            game: null,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
        };

        this.resize = this.resize.bind(this);
        this.update = this.update.bind(this);
    }

    componentWillMount() {
        const { gameState } = this.state;

        // listen for updates
        gameState.registerListener(this.update);

        // listen for resizes
        window.addEventListener('resize', this.resize);
    }

    componentDidMount() {
        this.interval = setInterval(() => {
            const { gameState } = this.state;

            this.setState({
                currentTick: gameState.getCurrentTick(),
            })
        }, 1000);
    }

    componentWillUnmount() {
        clearInterval(this.interval);

        window.removeEventListener('resize', this.resize);
        this.state.gameState.unregisterListener(this.update);

        if (this.state.gameState) {
            this.state.gameState.destroy();
        }
    }

    resize() {
        this.setState({
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
        });
    }

    update(gameState) {
        this.setState({
            currentTick: gameState.getCurrentTick(),
            game: gameState.game,
        });
    }

    render() {
        const { gameState, currentTick, game, windowWidth, windowHeight } = this.state;
        const { knownUsers } = this.props;

        const totalTicks = gameState.ticks;

        const isPortrait = windowHeight > 1.5 * windowWidth;

        return game ?
            <div className='game'>
                <div className='game-content'>
                    <div className='game-board'>
                        <GameBoard gameState={gameState} />
                    </div>
                    <div className='game-meta'>
                        <div>
                            <div className='game-meta-section game-time'>
                                {Time.renderGameTime(currentTick) + ' / ' + Time.renderGameTime(totalTicks)}
                            </div>
                            <div className='game-meta-section game-meta-players'>
                                <table>
                                    <tbody>
                                        <tr className='game-meta-player'>
                                            <td className='game-meta-player-color'>White:</td>
                                            <td><UserDisplay value={game.players[1]} knownUsers={knownUsers} /></td>
                                        </tr>
                                        <tr className='game-meta-player'>
                                            <td className='game-meta-player-color'>Black:</td>
                                            <td><UserDisplay value={game.players[2]} knownUsers={knownUsers} /></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                {isPortrait &&
                    <div className='game-portrait-warning'>
                        Your browser appears to be in portrait mode.<br/>
                        Rotate for a better experience!
                    </div>
                }
            </div>
            :
            null;
    }
};
