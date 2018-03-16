import React, { Component } from 'react';
import { BrowserRouter, Route } from 'react-router-dom';
import 'react-tippy/dist/tippy.css';

import About from './About.js';
import Game from './Game.js';
import Header from './Header.js';
import Home from './Home.js';
import Profile from './Profile.js';

export default class App extends Component {

    constructor(props) {
        super(props);

        this.state = {
            user: null,
            knownUsers: {},
            playerKeys: null,
            error: null,  // TODO: show error in butter bar
        };

        this.fetchUserInfo = this.fetchUserInfo.bind(this);
        this.setPlayerKeys = this.setPlayerKeys.bind(this);
        this.updateUser = this.updateUser.bind(this);
        this.uploadProfilePic = this.uploadProfilePic.bind(this);
    }

    componentDidMount() {
        fetch('/api/user/info', {
            credentials: 'same-origin',
            method: 'GET',
        }).then(response => {
            response.json().then(data => {
                if (data.loggedIn) {
                    let knownUsers = this.state.knownUsers;
                    knownUsers[data.userId] = data;

                    this.setState({
                        user: data,
                        knownUsers,
                    });
                }
            });
        });
    }

    fetchUserInfo(userIds, callback) {
        fetch('/api/user/info?' + userIds.map(userId => 'userId=' + encodeURIComponent(userId)).join('&'), {
            credentials: 'same-origin',
            method: 'GET',
        }).then(response => {
            response.json().then(data => {
                this.setState({
                    knownUsers: {
                        ...this.state.knownUsers,
                        ...data,
                    },
                }, () => {
                    callback(this.state.knownUsers);
                });
            });
        });
    }

    updateUser(username, callback) {
        fetch('/api/user/update', {
            body: JSON.stringify({ username }),
            credentials: 'same-origin',
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
        }).then(response => {
            response.json().then(data => {
                if (data.success) {
                    let knownUsers = this.state.knownUsers;
                    knownUsers[data.user.userId] = data.user;

                    this.setState({
                        user: data.user,
                        knownUsers,
                    });
                } else {
                    this.setState({
                        error: data.message
                    });
                }
                callback();
            });
        }).catch(() => callback());
    }

    uploadProfilePic(data, callback) {
        if (data.length > 1024 * 64) {
            this.setState({
                error: 'File is too large (max size 64KB).',
            });
            callback();

            return;
        }

        fetch('/api/user/uploadPic', {
            body: data,
            credentials: 'same-origin',
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
        }).then(response => {
            response.json().then(data => {
                if (data.success) {
                    let knownUsers = this.state.knownUsers;
                    knownUsers[data.user.userId] = data.user;

                    this.setState({
                        user: data.user,
                        knownUsers,
                    });
                } else {
                    this.setState({
                        error: data.message
                    });
                }
                callback();
            });
        }).catch(() => callback());
    }

    setError(message) {
        this.setState({
            error: message,
        });
    }

    setPlayerKeys(playerKeys) {
        this.setState({ playerKeys });
    }

    render() {
        const { user, knownUsers, playerKeys } = this.state;

        return (
            <BrowserRouter>
                <div>
                    <Header user={user} />
                    <Route exact path='/' render={props => {
                        return <Home setPlayerKeys={this.setPlayerKeys} {...props} />
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
                                {...props}
                            />
                        );
                    }} />
                    <Route path='/game/:gameId' render={props => {
                        return <Game playerKeys={playerKeys} {...props} />
                    }} />
                </div>
            </BrowserRouter>
        );
    }
};
