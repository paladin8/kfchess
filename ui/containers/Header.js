import amplitude from 'amplitude-js';
import React, { Component } from 'react';
import { Link } from 'react-router-dom';

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
                        Kung Fu Chess <sup>Alpha</sup>
                    </div>
                </div>
                <div className='header-menu'>
                    <div className='header-menu-item'>
                        <Link to='/'>Home</Link>
                    </div>
                    <div className='header-menu-item'>
                        <a
                            href='https://www.reddit.com/r/kfchess/'
                            onClick={() => amplitude.getInstance().logEvent('Click Reddit Link')}
                        >
                            Reddit
                        </a>
                    </div>
                    <div className='header-menu-item'>
                        <Link to='/about'>About</Link>
                    </div>
                    <div className='header-menu-item'>
                        {user ?
                            <Link to={`/profile/${user.userId}`}>
                                <ProfilePic className='header-profile-pic' user={user} />
                            </Link>
                            :
                            <a href='/login'>Login</a>
                        }
                    </div>
                </div>
            </div>
        );
    }
};
