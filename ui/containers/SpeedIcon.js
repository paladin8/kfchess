import React, { Component } from 'react';
import { Tooltip } from 'react-tippy';

import * as Speed from '../util/Speed.js';

export default class SpeedIcon extends Component {

    render() {
        const { speed, iconOnly } = this.props;
        const displayName = Speed.getDisplayName(speed);

        return (
            <div className='speed-icon'>
                {!iconOnly ? displayName + ' Speed' : ''}
                {speed === 'standard' &&
                    <Tooltip
                        title={displayName}
                    >
                        <i className='fas fa-clock' />
                    </Tooltip>
                }
                {speed === 'lightning' &&
                    <Tooltip
                        title={displayName}
                    >
                        <i className='fas fa-bolt' />
                    </Tooltip>
                }
            </div>
        );
    }
};
