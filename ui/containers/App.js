import amplitude from 'amplitude-js';
import React, { Component } from 'react';
import { BrowserRouter, Route } from 'react-router-dom';

import About from './About.js';
import Alert from './Alert.js';
import Game from './Game.js';
import Header from './Header.js';
import Home from './Home.js';
import Profile from './Profile.js';

export default class App extends Component {

    constructor(props) {
        super(props);

        this.state = {
            csrfToken: null,
            user: null,
            knownUsers: {},
            playerKeys: null,
            error: null,
        };

        this.loadMyInfo = this.loadMyInfo.bind(this);
        this.fetchUserInfo = this.fetchUserInfo.bind(this);
        this.updateUser = this.updateUser.bind(this);
        this.uploadProfilePic = this.uploadProfilePic.bind(this);
        this.createNewGame = this.createNewGame.bind(this);
        this.checkGame = this.checkGame.bind(this);
        this.inviteUser = this.inviteUser.bind(this);
        this.getUserGameHistory = this.getUserGameHistory.bind(this);
        this.logout = this.logout.bind(this);

        this.router = null;
    }

    componentDidMount() {
        this.loadMyInfo();
    }

    getRequest(path, callback, errorCallback) {
        fetch(path, {
            credentials: 'same-origin',
            method: 'GET',
        }).then(callback).catch(errorCallback);
    }

    postRequest(path, data, callback, errorCallback) {
        fetch(path, {
            'body': data,
            credentials: 'same-origin',
            headers: {
                'content-type': 'application/json',
                'X-CSRF-Token': this.state.csrfToken,
            },
            method: 'POST',
        }).then(callback).catch(errorCallback);
    }

    loadMyInfo() {
        this.getRequest(
            '/api/user/info',
            response => {
                response.json().then(data => {
                    if (data.loggedIn) {
                        let knownUsers = this.state.knownUsers;
                        knownUsers[data.user.userId] = data.user;

                        this.setState({
                            user: data.user,
                            knownUsers,
                        });

                        amplitude.getInstance().setUserId(data.user.userId);
                        amplitude.getInstance().setUserProperties({
                            username: data.user.username,
                            pictureUrl: data.user.pictureUrl,
                        });

                        if (data.user.currentGame) {
                            const { gameId, playerKey } = data.user.currentGame;
                            this.router.history.push(`/game/${gameId}?key=${playerKey}`);
                        }
                    }

                    this.setState({
                        csrfToken: data.csrfToken,
                    });
                });
            },
            () => this.setError('Error logging in.')
        );
    }

    fetchUserInfo(userIds, callback) {
        const { knownUsers } = this.state;

        userIds = userIds.filter(userId => !(userId in knownUsers));
        if (userIds.length === 0) {
            callback();
            return;
        }

        const path = '/api/user/info?' + userIds.map(userId => 'userId=' + encodeURIComponent(userId)).join('&');
        this.getRequest(
            path,
            response => {
                response.json().then(data => {
                    this.setState({
                        knownUsers: {
                            ...this.state.knownUsers,
                            ...data.users,
                        },
                    }, () => {
                        callback();
                    });
                });
            },
            () => {
                this.setError('Error fetching user information.');
                callback();
            }
        );
    }

    updateUser(username, callback) {
        amplitude.getInstance().logEvent('Update User', {
            username,
        });

        this.postRequest(
            '/api/user/update',
            JSON.stringify({ username }),
            response => {
                response.json().then(data => {
                    if (data.success) {
                        let knownUsers = this.state.knownUsers;
                        knownUsers[data.user.userId] = data.user;

                        this.setState({
                            user: data.user,
                            knownUsers,
                        });
                    } else {
                        this.setError(data.message);
                    }
                    callback();
                });
            },
            () => {
                this.setError('Error updating user information.');
                callback()
            }
        );
    }

    uploadProfilePic(data, callback) {
        amplitude.getInstance().logEvent('Upload Profile Pic');

        if (data.length > 1024 * 64) {
            this.setError('File is too large (max size 64KB).');
            callback();

            return;
        }

        this.postRequest(
            '/api/user/uploadPic',
            data,
            response => {
                response.json().then(data => {
                    if (data.success) {
                        let knownUsers = this.state.knownUsers;
                        knownUsers[data.user.userId] = data.user;

                        this.setState({
                            user: data.user,
                            knownUsers,
                        });
                    } else {
                        this.setError(data.message);
                    }
                    callback();
                });
            },
            () => callback()
        );
    }

    createNewGame(speed, isBot, difficulty) {
        amplitude.getInstance().logEvent('Create New Game', {
            speed,
            isBot,
            difficulty,
        });

        this.postRequest(
            '/api/game/new',
            JSON.stringify({
                speed,
                bots: isBot ? { 2: difficulty } : {}
            }),
            response => {
                response.json().then(data => {
                    this.setState({ playerKeys: data.playerKeys });
                    this.router.history.push(`/game/${data.gameId}?key=${data.playerKeys['1']}`);
                });
            },
            () => this.setError('Error creating new game.')
        );
    }

    checkGame(gameId) {
        this.getRequest(
            `/api/game/check?gameId=${gameId}`,
            response => {
                response.json().then(data => {
                    if (!data.success) {
                        // game did not exist, update user and go to home page
                        this.setState({
                            user: data.user,
                        });

                        this.router.history.push('/');
                    }
                });
            },
            () => this.setError('Error checking game.')
        );
    }

    inviteUser(gameId, username, callback) {
        amplitude.getInstance().logEvent('Invite User', {
            gameId,
            username,
        });

        this.postRequest(
            '/api/game/invite',
            JSON.stringify({ gameId, player: 2, username }),
            response => {
                response.json().then(data => {
                    if (data.success) {
                        callback();
                    } else {
                        this.setError(data.message);
                    }
                });
            },
            () => this.setError('Error inviting user.')
        );
    }

    getUserGameHistory(userId, offset, count, callback) {
        this.getRequest(
            `/api/user/history?userId=${userId}&offset=${offset}&count=${count}`,
            response => {
                response.json().then(data => {
                    this.setState({
                        knownUsers: {
                            ...this.state.knownUsers,
                            ...data.users,
                        },
                    }, () => {
                        callback(data.history);
                    });
                });
            },
            () => this.setError('Error fetching user game history.')
        );
    }

    logout() {
        this.postRequest(
            '/logout',
            '',
            response => {
                response.json().then(() => {
                    window.location.reload();
                });
            },
            () => this.setError('Error logging out.')
        );
    }

    setError(message) {
        // add a random id to the error so alert knows when it updated
        this.setState({
            error: { message, id: Math.random() },
        });
    }

    render() {
        const { csrfToken, user, knownUsers, playerKeys, error } = this.state;

        return (
            <BrowserRouter ref={router => this.router = router}>
                <div>
                    <Header
                        user={user}
                        router={this.router}
                        loadMyInfo={this.loadMyInfo}
                        logout={this.logout}
                    />
                    <Alert error={error} />
                    <Route exact path='/' render={props => {
                        return (
                            <Home
                                createNewGame={this.createNewGame}
                                {...props}
                            />
                        );
                    }} />
                    <Route path='/about' component={About} />
                    <Route path='/profile/:userId' render={props => {
                        return (
                            <Profile
                                user={user}
                                knownUsers={knownUsers}
                                fetchUserInfo={this.fetchUserInfo}
                                updateUser={this.updateUser}
                                uploadProfilePic={this.uploadProfilePic}
                                getUserGameHistory={this.getUserGameHistory}
                                {...props}
                            />
                        );
                    }} />
                    <Route path='/game/:gameId' render={props => {
                        return (
                            <Game
                                user={user}
                                checkGame={this.checkGame}
                                knownUsers={knownUsers}
                                fetchUserInfo={this.fetchUserInfo}
                                inviteUser={this.inviteUser}
                                playerKeys={playerKeys}
                                {...props}
                            />
                        )
                    }} />
                </div>
            </BrowserRouter>
        );
    }
};
