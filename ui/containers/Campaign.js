import amplitude from 'amplitude-js';
import React, { Component } from 'react';
import { Tooltip } from 'react-tippy';

import Spinner from './Spinner.js';
import CampaignLevels from '../util/CampaignLevels.js';

const BELTS = [
    'White',
    'Yellow',
    'Green',
    'Purple',
    'Orange',
    'Blue',
    'Brown',
    'Red',
    'Black',
];

const MAX_BELT = 1;  // currently only 0 and 1 are implemented

export default class Campaign extends Component {

    constructor(props) {
        super(props);

        this.state = {
            belt: null,
            progress: null,
        };
    }

    componentWillMount() {
        this.fetchCampaignInfo(this.props);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.user != nextProps.user) {
            this.fetchCampaignInfo(nextProps);
        }
    }

    fetchCampaignInfo(props) {
        const { user } = props;

        if (user) {
            amplitude.getInstance().logEvent('Visit Campaign Page');

            this.props.fetchCampaignInfo(data => {
                this.setState({
                    belt: Math.min(MAX_BELT, this.getCurrentBelt(data.progress)),
                    progress: data.progress,
                });
            });
        } else {
            this.setState({
                belt: null,
                progress: null,
            });
        }
    }

    getCurrentBelt(progress) {
        return Object.keys(progress.beltsCompleted).length;
    }

    chooseBelt(belt) {
        const { progress } = this.state;

        amplitude.getInstance().logEvent('Click Campaign Belt', {
            belt,
            isCompleted: progress.beltsCompleted[belt] === true,
        });

        this.setState({ belt });
    }

    startLevel(level) {
        const { progress } = this.state;

        amplitude.getInstance().logEvent('Click Campaign Level', {
            level,
            isCompleted: progress.levelsCompleted[level] === true,
        });

        this.props.startCampaignLevel(level);
    }

    render() {
        const { user } = this.props;
        const { belt, progress } = this.state;

        return (
            <div className='campaign'>
                {!user ?
                    <div className='campaign-no-user'>
                        You must <a href='/login'>log in</a> to track your progress in the campaign!
                    </div>
                    :
                    (!progress ?
                        <Spinner />
                        :
                        <div className='campaign-wrapper'>
                            <div className='campaign-title'>
                                Campaign
                            </div>
                            {this.renderCampaignBeltLevels(belt, progress)}
                            {this.renderCampaignBelts(progress)}
                        </div>
                    )
                }
            </div>
        );
    }

    renderCampaignBelts(progress) {
        const currentBelt = this.getCurrentBelt(progress);

        return (
            <div className='campaign-belts'>
                <div className='campaign-belts-row'>
                    {BELTS.map((_, beltIdx) => this.renderLargeBelt(beltIdx, currentBelt))}
                </div>
            </div>
        );
    }

    renderLargeBelt(beltIdx, currentBelt) {
        const { belt } = this.state;

        const beltName = BELTS[beltIdx];
        if (beltIdx < currentBelt) {
            // complete belt
            return (
                <div
                    className='campaign-belt campaign-belt-completed'
                    key={beltIdx}
                    onClick={() => this.chooseBelt(beltIdx)}
                >
                    <img src={`/static/belt-${beltName.toLowerCase()}.png`} />
                </div>
            );
        } else if (beltIdx > MAX_BELT) {
            // unavailable belt
            return (
                <div
                    className='campaign-belt campaign-belt-unavailable'
                    key={beltIdx}
                >
                    <img src={`/static/belt-${beltName.toLowerCase()}.png`} />
                </div>
            );
        } else if (beltIdx === currentBelt) {
            // next belt
            return (
                <div
                    className='campaign-belt campaign-belt-next'
                    key={beltIdx}
                    onClick={() => this.chooseBelt(beltIdx)}
                >
                    <img src={`/static/belt-${beltName.toLowerCase()}.png`} />
                </div>
            );
        } else {
            // locked belt
            return (
                <div
                    className='campaign-belt campaign-belt-locked'
                    key={beltIdx}
                >
                    <img src={`/static/belt-${beltName.toLowerCase()}.png`} />
                </div>
            );
        }
    }

    renderCampaignBeltLevels(belt, progress) {
        const beltName = BELTS[belt];
        const levelOffset = 8 * belt;
        const levelClasses = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(idx => {
            let className = ''
            if (levelOffset + idx === 0 || progress.levelsCompleted[levelOffset + idx - 1]) {
                className += 'level-selectable hvr-pulse '
            }
            if (progress.levelsCompleted[levelOffset + idx]) {
                className += 'level-complete ';
            }
            return className;
        });
        const pathClasses = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(idx => {
            return progress.levelsCompleted[levelOffset + idx] ? 'path-complete' : '';
        });

        return (
            <div className='campaign-levels'>
                <div className='campaign-levels-row'>
                    <div className='campaign-head' />
                    {this.renderLevel(levelOffset + 0, levelClasses[0])}
                    <div className={`campaign-path ${pathClasses[0]}`} />
                    {this.renderLevel(levelOffset + 1, levelClasses[1])}
                    <div className={`campaign-path ${pathClasses[1]}`} />
                    {this.renderLevel(levelOffset + 2, levelClasses[2])}
                    <div className='campaign-tail' />
                </div>
                <div className='campaign-levels-row'>
                    <div className='campaign-head' />
                    {this.renderLevel(levelOffset + 3, levelClasses[3])}
                    <div className={`campaign-path ${pathClasses[3]}`} />
                    {this.renderLevel(levelOffset + 4, levelClasses[4])}
                    <div className={`campaign-path ${pathClasses[4]}`} />
                    {this.renderLevel(levelOffset + 5, levelClasses[5])}
                    <div className={`campaign-tail campaign-tail-path ${pathClasses[2]}`} />
                </div>
                <div className='campaign-levels-row'>
                    <div className={`campaign-head campaign-head-path ${pathClasses[5]}`} />
                    {this.renderLevel(levelOffset + 6, levelClasses[6])}
                    <div className={`campaign-path ${pathClasses[6]}`} />
                    {this.renderLevel(levelOffset + 7, levelClasses[7])}
                    <div className={`campaign-path path-end ${pathClasses[7]}`} />
                    <div className='campaign-end'>
                        <img src={`/static/belt-${beltName.toLowerCase()}.png`} />
                    </div>
                </div>
            </div>
        );
    }

    renderLevel(level, levelClass) {
        const { progress } = this.state;

        return (
            <Tooltip
                title={CampaignLevels[level].title}
                trigger='mouseenter'
            >
                <div
                    className={`campaign-level ${levelClass}`}
                    onClick={() => {
                        amplitude.getInstance().logEvent('Click Level', {
                            level,
                            isCompleted: progress.levelsCompleted[level] === true,
                        });

                        this.props.startCampaignLevel(level);
                    }}
                />
            </Tooltip>
        );
    }
};
