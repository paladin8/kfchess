import amplitude from 'amplitude-js';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Tooltip } from 'react-tippy';

import SpeedIcon from './SpeedIcon.js';
import Spinner from './Spinner.js';
import UserDisplay from './UserDisplay.js';

export default class Live extends Component {

    constructor(props) {
        super(props);

        this.state = {
            fetching: true,
            activeGames: null,
            onlineUsers: null,
        };
    }

    componentWillMount() {
        this.setState({ fetching: true });
        this.props.getLiveInfo(data => {
            const activeGames = data && data.games;
            const onlineUsers = data && data.users;

            this.setState({
                fetching: false,
                activeGames,
                onlineUsers,
            });
        });
    }

    render() {
        const { fetching, activeGames, onlineUsers } = this.state;

        return (
            <div className='live'>
                {fetching ?
                    <Spinner />
                    :
                    <div className='live-content'>
                        {this.renderLiveGames(activeGames)}
                        {this.renderOnlineUsers(onlineUsers)}
                    </div>
                }
            </div>
        );
    }

    renderLiveGames(activeGames) {
        return (
            <div className='live-games'>
                <div className='live-games-title'>Live Games</div>
                {activeGames && activeGames.length > 0 ?
                    <table className='live-games-table'>
                        <tbody>
                            {activeGames.map((g, index) => {
                                const gameInfo = g.gameInfo;
                                return (
                                    <tr className='live-games-row' key={index}>
                                        <td className='live-games-speed'>
                                            <SpeedIcon speed={gameInfo.speed} iconOnly={true} />
                                        </td>
                                        <td className='live-games-players'>
                                            {this.renderGamePlayers(gameInfo.players)}
                                        </td>
                                        <td className='live-games-watch'>
                                            <Tooltip
                                                title='Spectate'
                                            >
                                                <Link to={`/game/${g.gameId}`}>
                                                    <i className='fas fa-eye' />
                                                </Link>
                                            </Tooltip>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    :
                    <div className='live-games-empty'>
                        No games are currently live.
                    </div>
                }
            </div>
        );
    }

    renderGamePlayers(players) {
        const { knownUsers } = this.props;

        const playerList = Object.keys(players).sort();

        return (
            <div className='live-games-players-inner'>
                {playerList.map((player, index) => {
                    const value = players[player];
                    if (index === 0) {
                        return (
                            <div className='live-games-players-vs-player' key={index}>
                                <UserDisplay value={value} knownUsers={knownUsers} />
                            </div>
                        );
                    }

                    return (
                        <div className='live-games-players-vs-player' key={index}>
                            <div className='live-games-players-vs'>vs</div>
                            <UserDisplay value={value} knownUsers={knownUsers} />
                        </div>
                    );
                })}
            </div>
        );
    }

    renderOnlineUsers(onlineUsers) {
        const { user, knownUsers } = this.props;

        let userList = null;
        if (onlineUsers) {
            userList = Object.keys(onlineUsers).filter(userId => !user || user.userId !== userId).sort();
        }

        return (
            <div className='live-users'>
                <div className='live-users-title'>Online Users</div>
                {userList && userList.length > 0 ?
                    <table className='live-users-table'>
                        <tbody>
                            {userList.map((userId, index) => {
                                const otherUser = knownUsers[userId];

                                return (
                                    <tr className='live-users-row' key={index}>
                                        <td className='live-users-username'>
                                            <UserDisplay value={`u:${userId}`} knownUsers={knownUsers} />
                                        </td>
                                        {user && user.userId !== otherUser.userId && !otherUser.currentGame &&
                                            <td className='live-users-challenge'>
                                                {this.renderChallenge(otherUser)}
                                            </td>
                                        }
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    :
                    <div className='live-users-empty'>
                        No users online.
                    </div>
                }
            </div>
        );
    }

    renderChallenge(otherUser) {
        return (
            <Tooltip
                arrow={true}
                distance={15}
                trigger='click'
                interactive={false}
                onShow={() => {
                    amplitude.getInstance().logEvent('Click Challenge', {
                        userId: otherUser.userId,
                    });
                }}
                html={
                    <div className='live-users-challenge-menu'>
                        <div className='live-users-challenge-menu-title'>
                            Challenge
                        </div>
                        <div
                            className='live-users-challenge-menu-item'
                            onClick={() => {
                                amplitude.getInstance().logEvent('Click Challenge Speed', {
                                    userId: otherUser.userId,
                                    speed: 'standard',
                                });

                                this.props.createNewGame('standard', false, null, otherUser.username);
                            }}
                        >
                            Standard
                        </div>
                        <div
                            className='live-users-challenge-menu-item'
                            onClick={() => {
                                amplitude.getInstance().logEvent('Click Challenge Speed', {
                                    userId: otherUser.userId,
                                    speed: 'lightning',
                                });

                                this.props.createNewGame('lightning', false, null, otherUser.username);
                            }}
                        >
                            Lightning
                        </div>
                    </div>
                }
            >
                <i className='fas fa-crosshairs' />
            </Tooltip>
        );
    }
};
