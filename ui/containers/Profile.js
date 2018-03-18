import amplitude from 'amplitude-js';
import React, { Component } from 'react';

import ProfilePic from './ProfilePic.js';
import Spinner from './Spinner.js';

const RATING_TYPES = ['standard', 'lightning'];

export default class Profile extends Component {

    constructor(props) {
        super(props);

        this.state = {
            fetching: true,
            username: null,
            showEditUsername: false,
            editingUsername: false,
            showEditProfilePic: false,
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
        const { match, user } = this.props;
        const isSelf = Boolean(user && match.params.userId === user.userId);

        amplitude.getInstance().logEvent('Visit Profile Page', {
            userId: match.params.userId,
            isSelf,
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
            username,
            showEditUsername,
            editingUsername,
            showEditProfilePic,
        } = this.state;

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
                <div className='profile-history'>
                    <div className='profile-history-title'>Game History</div>
                    <div className='profile-history-table'>
                        <div className='profile-history-no-games'>No games played yet!</div>
                    </div>
                </div>
            </div>
        );
    }
};
