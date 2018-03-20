import React, { Component } from 'react';
import { Link } from 'react-router-dom';

import ProfilePic from './ProfilePic.js';

export default class UserDisplay extends Component {

    render() {
        const { value, knownUsers } = this.props;

        let user = null;
        let text = 'Anonymous';
        if (value === 'b') {
            text = 'AI player';
        } else if (value.startsWith('u:')) {
            const userId = value.substring(2);
            user = knownUsers[userId];
        }

        return (
            <div className='user-display'>
                {user &&
                    <Link to={`/profile/${user.userId}`} className='user-display-user-wrapper'>
                        <ProfilePic className='user-display-profile-pic' user={user} />
                        <div className='user-display-username'>
                            {user.username.length <= 16 ? user.username : user.username.substring(0, 14) + '...'}
                        </div>
                    </Link>
                }
                {!user && <div className='user-display-text'>{text}</div>}
            </div>
        );
    }
};
