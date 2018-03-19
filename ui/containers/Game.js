import amplitude from 'amplitude-js';
import qs from 'query-string';
import React, { Component } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import Modal from 'react-modal';
import { withRouter } from 'react-router';
import { Link } from 'react-router-dom';
import { Tooltip } from 'react-tippy';

import GameBoard from './GameBoard.js';
import SpeedIcon from './SpeedIcon.js';
import UserDisplay from './UserDisplay.js';
import GameState from '../util/GameState.js';

class Game extends Component {

    constructor(props) {
        super(props);

        const gameId = props.match.params.gameId;

        const { key } = qs.parse(props.location.search);
        const playerKey = props.playerKey || key;

        const gameState = new GameState(gameId, playerKey, props.fetchUserInfo, () => {
            this.props.history.push('/');
        });

        this.state = {
            gameState,

            modalType: null,
            showReady: true,
            inviteUsername: '',

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

    componentDidMount() {
        const { gameState } = this.state;
        const { user } = this.props;

        if (user) {
            this.props.checkGame(gameState.gameId);
        }
    }

    componentWillUnmount() {
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
        const { playerKeys } = this.props;

        let modalType = this.state.modalType;
        let showReady = this.state.showReady;
        if (gameState.game) {
            // various modal triggers
            if (modalType === null && gameState.game.finished) {
                amplitude.getInstance().logEvent('Finish Game', {
                    gameId: gameState.gameId,
                    player: gameState.player,
                });

                modalType = 'game-finished';
            } else if (modalType === 'game-finished' && !gameState.game.finished) {
                modalType = null;
            } else if (modalType === 'ready' && gameState.game.started) {
                amplitude.getInstance().logEvent('Start Game', {
                    gameId: gameState.gameId,
                    player: gameState.player,
                });

                modalType = null;
            }

            if (!gameState.game.started && gameState.player !== 0) {
                modalType = 'ready';
                showReady = (
                    playerKeys === null || !('2' in playerKeys) ||
                    !(Object.values(gameState.game.players).includes('o')) ||
                    gameState.game.playersReady['2']
                );
            }
        }

        this.setState({
            modalType,
            showReady,
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

    inviteUser() {
        const { gameState, inviteUsername } = this.state;

        this.props.inviteUser(gameState.gameId, inviteUsername, () => {
            this.setState({ showReady: true });
        });
    }

    render () {
        const {
            gameState,
            modalType,
            showReady,
            inviteUsername,
            game,
            player,
            isReady,
            windowWidth,
            windowHeight,
        } = this.state;
        const { knownUsers, playerKeys } = this.props;

        const baseUrl = `${window.location.origin}${window.location.pathname}`;

        let started = false;
        if (game) {
            started = game.started;
        }

        let friendLink = null;
        if (playerKeys && '2' in playerKeys) {
            friendLink = `${baseUrl}?key=${playerKeys['2']}`;
        }

        let invited = false;
        if (player === 1 && game.players['2'] && game.players['2'].startsWith('u:')) {
            invited = true;
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

        let readyText = 'Waiting for opponent...';
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
                {this.renderModal(
                    gameState,
                    player,
                    modalType,
                    showReady,
                    inviteUsername,
                    friendLink,
                    invited,
                    readyText,
                    readyAction,
                    endGameText,
                )}
                <div className='game-content'>
                    <div className='game-board'>
                        <GameBoard gameState={gameState} />
                    </div>
                    <div className='game-meta'>
                        <div>
                            <div className='game-meta-section game-ready-section'>
                                <div
                                    className={`game-ready-button ${readyAction ? 'clickable' : ''}`}
                                    onClick={() => {
                                        if (readyAction === 'ready') {
                                            amplitude.getInstance().logEvent('Click Ready', {
                                                source: 'sidebar',
                                                player,
                                                gameId: gameState.gameId,
                                            });

                                            gameState.ready();
                                        } else if (readyAction === 'play-again') {
                                            amplitude.getInstance().logEvent('Click Play Again', {
                                                source: 'sidebar',
                                                player,
                                                gameId: gameState.gameId,
                                            });

                                            gameState.reset();
                                        }
                                    }}
                                >
                                    {readyText}
                                </div>
                                {(player !== 0 && (!game.started || game.finished !== 0)) &&
                                    <div
                                        className='game-cancel-button'
                                        onClick={() => {
                                            amplitude.getInstance().logEvent('Cancel Game', {
                                                source: 'sidebar',
                                                player,
                                                gameId: gameState.gameId,
                                            });

                                            gameState.cancel();
                                        }}
                                    >
                                        Cancel Game
                                    </div>
                                }
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
                                    <CopyToClipboard
                                        text={baseUrl}
                                        onCopy={() => {
                                            amplitude.getInstance().logEvent('Copy Spectator Link', {
                                                source: 'sidebar',
                                                gameId: gameState.gameId,
                                                player,
                                            });
                                        }}
                                    >
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

    renderModal(
        gameState,
        player,
        modalType,
        showReady,
        inviteUsername,
        friendLink,
        invited,
        readyText,
        readyAction,
        endGameText
    ) {
        const { user, knownUsers } = this.props;

        return (
            <Modal
                isOpen={Boolean(modalType)}
                onRequestClose={this.closeModal}
                shouldCloseOnOverlayClick={modalType !== 'ready'}
                shouldCloseOnEsc={modalType !== 'ready'}
                className='game-modal'
                closeTimeoutMS={200}
            >
                {modalType === 'ready' &&
                    <div className='game-ready'>
                        {this.renderReadyTitle(gameState.game)}
                        {friendLink && !invited &&
                            <Tooltip
                                title='Copied to clipboard!'
                                distance={5}
                                trigger='click'
                            >
                                <CopyToClipboard
                                    text={friendLink}
                                    onCopy={() => {
                                        amplitude.getInstance().logEvent('Copy Friend Link', {
                                            source: 'modal',
                                            player,
                                            gameId: gameState.gameId,
                                        });

                                        this.setState({
                                            showReady: true,
                                        });
                                    }}
                                >
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
                        {friendLink && !invited && user &&
                            <div className='game-invite'>
                                <input
                                    placeholder='... or invite by username'
                                    value={inviteUsername}
                                    maxLength={24}
                                    onChange={(e) => this.setState({ inviteUsername: e.target.value })}
                                    onKeyPress={(e) => e.key === 'Enter' && this.inviteUser()}
                                />
                                <div
                                    className='game-invite-submit'
                                    onClick={() => this.inviteUser()}
                                >
                                    <i className='far fa-paper-plane' />
                                </div>
                            </div>
                        }
                        {showReady &&
                            <div
                                className={`game-ready-button ${readyAction ? 'clickable' : ''}`}
                                onClick={() => {
                                    if (readyAction === 'ready') {
                                        amplitude.getInstance().logEvent('Click Ready', {
                                            source: 'modal',
                                            player,
                                            gameId: gameState.gameId,
                                        });

                                        gameState.ready();
                                    }
                                }}
                            >
                                {readyText}
                            </div>
                        }
                        <div
                            className='game-cancel-button'
                            onClick={() => {
                                amplitude.getInstance().logEvent('Cancel Game', {
                                    source: 'modal',
                                    player,
                                    gameId: gameState.gameId,
                                });

                                gameState.cancel();
                            }}
                        >
                            Cancel
                        </div>
                    </div>
                }
                {modalType === 'game-finished' &&
                    <div className='game-finished'>
                        <div className='game-finished-text'>{endGameText}</div>
                        {player !== 0 &&
                            <div
                                className='game-finished-button-again'
                                onClick={() => {
                                    amplitude.getInstance().logEvent('Click Play Again', {
                                        source: 'modal',
                                        player,
                                        gameId: gameState.gameId,
                                    });

                                    gameState.reset();
                                }}
                            >
                                Play Again
                            </div>
                        }
                        {player !== 0 &&
                            <div
                                className='game-cancel-button'
                                onClick={() => {
                                    amplitude.getInstance().logEvent('Cancel Game', {
                                        source: 'modal',
                                        player,
                                        gameId: gameState.gameId,
                                    });

                                    gameState.cancel();
                                }}
                            >
                                Cancel
                            </div>
                        }
                    </div>
                }
            </Modal>
        );
    }

    renderReadyTitle(game) {
        const { knownUsers } = this.props;

        const players = Object.keys(game.players).sort();

        return (
            <div className='game-ready-text'>
                <div className='game-ready-text-speed'>
                    <SpeedIcon speed={game.speed} iconOnly={false} />
                </div>
                <div className='game-ready-text-players'>
                    {players.map((player, index) => {
                        const value = game.players[player];
                        if (index === 0) {
                            return (
                                <div className='game-ready-text-vs-player' key={index}>
                                    <UserDisplay value={value} knownUsers={knownUsers} />
                                </div>
                            );
                        }

                        return (
                            <div className='game-ready-text-vs-player' key={index}>
                                <div className='game-ready-text-vs'>vs</div>
                                <UserDisplay value={value} knownUsers={knownUsers} />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
};

export default withRouter(Game);
