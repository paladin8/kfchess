import amplitude from 'amplitude-js';
import React, { Component } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Tooltip } from 'react-tippy';

import ProfilePic from './ProfilePic.js';

export default class Header extends Component {

    render() {
        const { user } = this.props;

        return (
            <div className='header'>
                <div className='header-logo'>
                    <div className='header-logo-img'>
                        <img src='/static/logo.png' />
                    </div>
                    <div className='header-logo-text'>
                        Kung Fu Chess <sup>Beta</sup>
                    </div>
                </div>
                <div className='header-menu'>
                    <div className='header-menu-item'>
                        <NavLink exact={true} activeClassName='header-link-active' to='/'>Home</NavLink>
                    </div>
                    <div className='header-menu-item'>
                        <NavLink activeClassName='header-link-active' to='/live'>Live!</NavLink>
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
                        {user ?
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
                                                        this.props.router.history.push(`/game/${gameId}?key=${playerKey}`);
                                                    }}
                                                >
                                                    In Game!
                                                </a>
                                            </div>
                                        }
                                        <div className='header-profile-dropdown-option'>
                                            <a
                                                onClick={() => {
                                                    this.props.router.history.push(`/profile/${user.userId}`);
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
                            :
                            <a href='/login' onClick={() => amplitude.getInstance().logEvent('Click Login')}>Login</a>
                        }
                    </div>
                </div>
            </div>
        );
    }
};
