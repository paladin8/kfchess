import amplitude from 'amplitude-js';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import ProfilePic from './ProfilePic.js';
import Spinner from './Spinner.js';
import * as Speed from '../util/Speed.js';

const RATING_TYPES = ['standard', 'lightning'];

export default class Profile extends Component {

    constructor(props) {
        super(props);

        this.state = {
            fetching: true,
            historyFetching: true,
            username: null,
            showEditUsername: false,
            editingUsername: false,
            showEditProfilePic: false,
            history: null,
        };

        this.usernameInput = null;
        this.profilePicInput = null;

        this.saveUsername = this.saveUsername.bind(this);
        this.saveProfilePic = this.saveProfilePic.bind(this);
    }

    componentWillMount() {
        const { match, knownUsers, fetchUserInfo } = this.props;
        const userId = match.params.userId;

        fetchUserInfo([userId], () => {
            this.setState({ fetching: false });
        });
    }

    componentDidMount() {
        const { match, user, getUserGameHistory } = this.props;
        const isSelf = Boolean(user && match.params.userId === user.userId);

        amplitude.getInstance().logEvent('Visit Profile Page', {
            userId: match.params.userId,
            isSelf,
        });

        getUserGameHistory(match.params.userId, 0, 100, history => {
            this.setState({
                history,
                historyFetching: false,
            });
        });
    }

    saveUsername() {
        const { username } = this.state;
        const { user } = this.props;

        if (username !== user.username) {
            this.props.updateUser(username, () => {
                this.setState({
                    username: null,
                    editingUsername: false,
                });
            });
        } else {
            this.setState({
                username: null,
                editingUsername: false,
            });
        }
    }

    saveProfilePic() {
        const reader = new FileReader();

        reader.onload = (e) => {
            const data = e.currentTarget.result;

            if (data) {
                this.props.uploadProfilePic(data, () => {});
            }
        };

        const file = this.profilePicInput.files[0];
        reader.readAsArrayBuffer(file);
    }

    render() {
        const { fetching } = this.state;
        const { match, user, knownUsers } = this.props;
        const userId = match.params.userId;
        const currUser = knownUsers[userId];
        const isMe = user && user.userId === userId;

        return (
            <div className='profile'>
                {fetching ?
                    <Spinner />
                    :
                    <div className='profile-wrapper'>
                        {currUser ?
                            this.renderProfile(currUser, isMe)
                            :
                            `User ${userId} not found.`
                        }
                    </div>
                }
            </div>
        );
    }

    renderProfile(currUser, isMe) {
        const {
            fetching,
            historyFetching,
            username,
            showEditUsername,
            editingUsername,
            showEditProfilePic,
            history,
        } = this.state;
        const { knownUsers } = this.props;

        return (
            <div className='profile-content'>
                <div className='profile-header'>
                    <div
                        className='profile-pic-wrapper'
                        onMouseEnter={() => isMe && this.setState({ showEditProfilePic: true })}
                        onMouseLeave={() => isMe && this.setState({ showEditProfilePic: false })}
                    >
                        <ProfilePic className='profile-profile-pic' user={currUser} />
                        {showEditProfilePic &&
                            <div
                                className='profile-pic-edit'
                                onClick={() => {
                                    amplitude.getInstance().logEvent('Click Edit Profile Pic');

                                    this.profilePicInput.click()
                                }}
                            >
                                <i className='fas fa-camera' />
                            </div>
                        }
                        <input
                            ref={input => this.profilePicInput = input}
                            type='file'
                            accept='image/*'
                            onChange={this.saveProfilePic}
                            style={{ display: 'none' }}
                        />
                    </div>
                    <div className='profile-user-info'>
                        <div
                            className='profile-username'
                            onMouseEnter={() => isMe && this.setState({ showEditUsername: true })}
                            onMouseLeave={() => isMe && this.setState({ showEditUsername: false })}
                            onClick={() => {
                                if (isMe && !editingUsername) {
                                    amplitude.getInstance().logEvent('Click Edit Username');

                                    this.setState({
                                        editingUsername: true,
                                        username: currUser.username,
                                    }, () => {
                                        this.usernameInput.focus();
                                    });
                                }
                            }}
                        >
                            {!editingUsername && <div className='profile-username-text'>{currUser.username}</div>}
                            {editingUsername &&
                                <input
                                    ref={input => this.usernameInput = input}
                                    value={username}
                                    maxLength={24}
                                    onChange={(e) => this.setState({ username: e.target.value })}
                                    onKeyPress={(e) => e.key === 'Enter' && this.saveUsername()}
                                />
                            }
                            {showEditUsername && !editingUsername &&
                                <div className='profile-edit-username'><i className='far fa-edit' /></div>
                            }
                            {editingUsername &&
                                <div
                                    className='profile-edit-username'
                                    onClick={this.saveUsername}
                                >
                                    <i className='far fa-save' />
                                </div>
                            }
                        </div>
                        <div className='profile-ratings'>
                            {RATING_TYPES.map(type => {
                                return (
                                    <div className='profile-rating' key={type}>
                                        <div className='profile-rating-type'>{type}</div>
                                        <div className='profile-rating-value'>
                                            {currUser.ratings[type] || 'Unrated'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                {!fetching &&
                    <div className='profile-history'>
                        <div className='profile-history-title'>Game History</div>
                        {historyFetching ?
                            <Spinner />
                            :
                            <div className='profile-history-table-wrapper'>
                                {history.length === 0 &&
                                    <div className='profile-history-no-games'>No games played yet!</div>
                                }
                                {history.length > 0 &&
                                    <table className='profile-history-table'>
                                        <tbody>
                                            {history.map(h => {
                                                const gameInfo = h.gameInfo;
                                                const minutes = Math.floor(gameInfo.ticks / 600);
                                                const seconds = Math.floor((gameInfo.ticks % 600) / 10);
                                                return (
                                                    <tr className='profile-history-row' key={h.historyId}>
                                                        <td className='profile-history-speed'>
                                                            {Speed.getDisplayName(gameInfo.speed)}
                                                        </td>
                                                        <td className='profile-history-player'>
                                                            {gameInfo.player === 1 ? 'White' : 'Black'}
                                                        </td>
                                                        <td className='profile-history-opponent'>
                                                            {'vs ' + gameInfo.opponents.map(o => {
                                                                if (o === 'b') {
                                                                    return 'AI';
                                                                }
                                                                return knownUsers[o.substring(2)].username;
                                                            }).join(', ')}
                                                        </td>
                                                        <td className='profile-history-result'>
                                                            {gameInfo.winner === 0 ? 'Draw' : (
                                                                gameInfo.player === gameInfo.winner ? 'Won' : 'Lost'
                                                            )}
                                                        </td>
                                                        <td className='profile-history-length'>
                                                            {minutes.toString() + ':' + seconds.toString()}
                                                        </td>
                                                        <td className='profile-history-replay'>
                                                            <Link to={`/replay/${gameInfo.historyId}`}>
                                                                <i className='fas fa-eye' />
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                }
                            </div>
                        }
                    </div>
                }
            </div>
        );
    }
};
