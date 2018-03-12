import qs from 'query-string';
import React, { Component } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import Modal from 'react-modal';
import { withRouter } from 'react-router';
import { Link } from 'react-router-dom';
import { Tooltip } from 'react-tippy';

import GameBoard from './GameBoard.js';
import GameState from '../util/GameState.js';

class Game extends Component {

    constructor(props) {
        super(props);

        const gameId = props.match.params.gameId;

        const { key } = qs.parse(props.location.search);
        const playerKey = props.playerKey || key;

        const gameState = new GameState(gameId, playerKey);

        this.state = {
            gameState,
            playerKeys: props.playerKeys,
            modalType: null,
            game: null,
            player: null,
            isReady: false,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
        };

        this.resize = this.resize.bind(this);
        this.update = this.update.bind(this);
        this.closeModal = this.closeModal.bind(this);
    }

    componentWillMount() {
        const { gameState } = this.state;

        // listen for updates
        gameState.registerListener(this.update);

        // listen for resizes
        window.addEventListener('resize', this.resize);
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.resize);

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
        let modalType = this.state.modalType;
        if (gameState.game) {
            // various modal triggers
            if (modalType === null && gameState.game.finished) {
                modalType = 'game-finished';
            } else if (modalType === 'game-finished' && !gameState.game.finished) {
                modalType = null;
            } else if (modalType === 'ready' && gameState.game.started) {
                modalType = null;
            }

            if (!gameState.game.started && gameState.player !== 0) {
                modalType = 'ready';
            }
        }

        this.setState({
            modalType,
            game: gameState.game,
            player: gameState.player,
            isReady: gameState.isReady(),
        });
    }

    closeModal() {
        this.setState({
            modalType: null,
        });
    }

    render () {
        const {
            gameState,
            playerKeys,
            modalType,
            game,
            player,
            isReady,
            windowWidth,
            windowHeight,
        } = this.state;
        const baseUrl = `${window.location.origin}${window.location.pathname}`;

        let started = false;
        if (game) {
            started = game.started;
        }

        let friendLink = null;
        if (playerKeys && '2' in playerKeys) {
            friendLink = `${baseUrl}?key=${playerKeys['2']}`;
        }

        let endGameText = null;
        if (game && game.finished) {
            if (gameState.player === 0) {
                if (game.finished === 1) {
                    endGameText = 'White wins!';
                } else {
                    endGameText = 'Black wins!';
                }
            } else if (game.finished === gameState.player) {
                endGameText = 'You win!';
            } else {
                endGameText = 'You lost!';
            }
        }

        let readyText = 'Waiting for friend...';
        let readyAction = null;
        if (player === 0) {
            readyText = 'Waiting for players...';
        } else if (!isReady) {
            readyText = 'I\'m ready!';
            readyAction = 'ready';
        }

        if (game && game.started) {
            readyText = 'Game started!';
        }
        if (game && game.finished) {
            if (player == 0) {
                readyText = endGameText;
            } else {
                readyText = 'Play Again';
                readyAction = 'play-again';
            }
        }

        const isPortrait = windowHeight > 1.5 * windowWidth;

        return game ?
            <div className='game'>
                <Modal
                    isOpen={Boolean(modalType)}
                    onRequestClose={this.closeModal}
                    shouldCloseOnOverlayClick={true}
                    shouldCloseOnEsc={true}
                    className='game-modal'
                    closeTimeoutMS={500}
                >
                    {modalType === 'ready' &&
                        <div className='game-ready'>
                            {friendLink &&
                                <Tooltip
                                    title='Copied to clipboard!'
                                    distance={5}
                                    trigger='click'
                                >
                                    <CopyToClipboard text={friendLink}>
                                        <div className='game-friend-link'>
                                            <div className='game-friend-link-text'>
                                                Click to copy link and send to friend!
                                            </div>
                                            <div className='game-friend-link-icon'>
                                                <i className='fas fa-link' />
                                            </div>
                                        </div>
                                    </CopyToClipboard>
                                </Tooltip>
                            }
                            <div
                                className={`game-ready-button ${readyAction ? 'clickable' : ''}`}
                                onClick={() => {
                                    if (readyAction === 'ready') {
                                        gameState.onReady();
                                    } else if (readyAction === 'play-again') {
                                        gameState.newGame();
                                    }
                                }}
                            >
                                {readyText}
                            </div>
                        </div>
                    }
                    {modalType === 'game-finished' &&
                        <div className='game-finished'>
                            <div className='game-finished-text'>{endGameText}</div>
                            {player !== 0 &&
                                <div
                                    className='game-finished-button-again'
                                    onClick={() => gameState.newGame()}
                                >
                                    Play Again
                                </div>
                            }
                        </div>
                    }
                </Modal>
                <div className='game-content'>
                    <div className='game-board'>
                        <GameBoard gameState={gameState} />
                    </div>
                    <div className='game-meta'>
                        <div>
                            <div className='game-meta-section'>
                                <div
                                    className={`game-ready-button ${readyAction ? 'clickable' : ''}`}
                                    onClick={() => {
                                        if (readyAction === 'ready') {
                                            gameState.onReady();
                                        } else if (readyAction === 'play-again') {
                                            gameState.newGame();
                                        }
                                    }}
                                >
                                    {readyText}
                                </div>
                            </div>
                            <div className='game-meta-section'>
                                <div className='game-id'>
                                    Game ID: {gameState.gameId}
                                </div>
                            </div>
                            <div className='game-meta-section'>
                                <Tooltip
                                    title='Copied to clipboard!'
                                    distance={5}
                                    trigger='click'
                                >
                                    <CopyToClipboard text={baseUrl}>
                                        <div className='game-friend-link'>
                                            <div className='game-friend-link-text'>
                                                Copy spectator link
                                            </div>
                                            <div className='game-friend-link-icon'>
                                                <i className='fas fa-link' />
                                            </div>
                                        </div>
                                    </CopyToClipboard>
                                </Tooltip>
                            </div>
                            {friendLink &&
                                <div className='game-meta-section'>
                                    <Tooltip
                                        title='Copied to clipboard!'
                                        distance={5}
                                        trigger='click'
                                    >
                                        <CopyToClipboard text={friendLink}>
                                            <div className='game-friend-link'>
                                                <div className='game-friend-link-text'>
                                                    Copy friend link
                                                </div>
                                                <div className='game-friend-link-icon'>
                                                    <i className='fas fa-link' />
                                                </div>
                                            </div>
                                        </CopyToClipboard>
                                    </Tooltip>
                                </div>
                            }
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

export default withRouter(Game);
