import amplitude from 'amplitude-js';
import React, { Component } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Tooltip } from 'react-tippy';

import ProfilePic from './ProfilePic.js';

const inIFrame = () => {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
};

export default class Header extends Component {

    render() {
        const { user, router } = this.props;

        const currentUri = `${router.history.location.pathname}${router.history.location.search}`;

        return (
            <div className='header'>
                <Link to='/' className='header-logo'>
                    <div className='header-logo-img'>
                        <img src='/static/logo.png' />
                    </div>
                    <div className='header-logo-text'>
                        Kung Fu Chess <sup>Beta</sup>
                    </div>
                </Link>
                <div className='header-menu'>
                    <div className='header-menu-item'>
                        <NavLink exact={true} activeClassName='header-link-active' to='/'>Home</NavLink>
                    </div>
                    <div className='header-menu-item'>
                        <NavLink activeClassName='header-link-active' to='/live'>Watch</NavLink>
                    </div>
                    <div className='header-menu-item'>
                        <a
                            href='https://www.reddit.com/r/kfchess/'
                            target='_blank'
                            onClick={() => amplitude.getInstance().logEvent('Click Reddit Link')}
                        >
                            Reddit
                        </a>
                    </div>
                    <div className='header-menu-item'>
                        <NavLink activeClassName='header-link-active' to='/about'>About</NavLink>
                    </div>
                    <div className='header-menu-item'>
                        <NavLink activeClassName='header-link-active' to='/privacy-policy'>Privacy</NavLink>
                    </div>
                    <div className='header-menu-item'>
                        {user ?
                            this.renderProfileDropdown()
                            :
                            (inIFrame() ?
                                <a
                                    href={`/login?next=${currentUri}`}
                                    onClick={() => amplitude.getInstance().logEvent('Click Login')}
                                    target='_blank'
                                >
                                    Login
                                </a>
                                :
                                <a
                                    href={`/login?next=${currentUri}`}
                                    onClick={() => amplitude.getInstance().logEvent('Click Login')}
                                >
                                    Login
                                </a>
                            )
                        }
                    </div>
                </div>
            </div>
        );
    }

    renderProfileDropdown() {
        const { user, router } = this.props;

        return (
            <Tooltip
                position='bottom-end'
                arrow={true}
                distance={15}
                trigger='click'
                interactive={false}
                theme='light'
                className='header-profile-dropdown-tooltip'
                onShow={() => {
                    amplitude.getInstance().logEvent('Click Profile Pic');
                    this.props.loadMyInfo();
                }}
                html={
                    <div className='header-profile-dropdown'>
                        {user.currentGame &&
                            <div className='header-profile-dropdown-option'>
                                <a
                                    onClick={() => {
                                        const { gameId, playerKey } = user.currentGame;
                                        router.history.push(`/game/${gameId}?key=${playerKey}`);
                                    }}
                                >
                                    In Game!
                                </a>
                            </div>
                        }
                        <div className='header-profile-dropdown-option'>
                            <a
                                onClick={() => {
                                    router.history.push(`/profile/${user.userId}`);
                                }}
                            >
                                Profile
                            </a>
                        </div>
                        <div className='header-profile-dropdown-option'>
                            <a
                                onClick={() => {
                                    amplitude.getInstance().logEvent('Logout');

                                    this.props.logout();
                                }}
                            >
                                Logout
                            </a>
                        </div>
                    </div>
                }
            >
                <ProfilePic className='header-profile-pic' user={user} />
            </Tooltip>
        );
    }
};
