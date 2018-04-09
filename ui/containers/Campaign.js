import amplitude from 'amplitude-js';
import React, { Component } from 'react';
import { Tooltip } from 'react-tippy';

import Spinner from './Spinner.js';

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
                            {belt === null ?
                                this.renderCampaignBelts(progress)
                                :
                                this.renderCampaignBeltLevels(belt, progress)
                            }
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
                <div className='campaign-belts-title'>
                    Campaign
                </div>
                <div className='campaign-belts-row'>
                    {[0, 1, 2].map(beltIdx => this.renderLargeBelt(beltIdx, currentBelt))}
                </div>
                <div className='campaign-belts-row'>
                    {[3, 4, 5].map(beltIdx => this.renderLargeBelt(beltIdx, currentBelt))}
                </div>
                <div className='campaign-belts-row'>
                    {[6, 7, 8].map(beltIdx => this.renderLargeBelt(beltIdx, currentBelt))}
                </div>
            </div>
        );
    }

    renderLargeBelt(beltIdx, currentBelt) {
        const beltName = BELTS[beltIdx];
        if (beltIdx < currentBelt) {
            // complete belt
            return (
                <div
                    className='campaign-belt campaign-belt-completed'
                    key={beltIdx}
                    onClick={() => this.chooseBelt(beltIdx)}
                >
                    {beltName + ' Belt'}
                </div>
            );
        } else if (beltIdx > MAX_BELT) {
            // unavailable belt
            return (
                <div
                    className='campaign-belt campaign-belt-unavailable'
                    key={beltIdx}
                >
                    {beltName + ' Belt'}
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
                    {beltName + ' Belt'}
                </div>
            );
        } else {
            // locked belt
            return (
                <div
                    className='campaign-belt campaign-belt-locked'
                    key={beltIdx}
                >
                    {beltName + ' Belt'}
                </div>
            );
        }
    }

    renderCampaignBeltLevels(belt, progress) {
        const beltName = BELTS[belt];
        const levelOffset = 8 * belt;

        return (
            <div className='campaign-levels'>
                <div className='campaign-levels-title'>
                    {beltName + ' Belt'}
                </div>
                <div className='campaign-levels-row'>
                    {[0, 1, 2, 3].map(idx => this.renderLevel(levelOffset + idx, progress))}
                </div>
                <div className='campaign-levels-row'>
                    {[4, 5, 6, 7].map(idx => this.renderLevel(levelOffset + idx, progress))}
                </div>
            </div>
        );
    }

    renderLevel(level, progress) {
        if (progress[level]) {
            return (
                <div
                    className='campaign-level-completed'
                    key={level}
                    onClick={() => this.startLevel(level)}
                >
                    {'Level ' + (level + 1)}
                </div>
            );
        } else {
            return (
                <div
                    className='campaign-level'
                    key={level}
                    onClick={() => this.startLevel(level)}
                >
                    {'Level ' + (level + 1)}
                </div>
            );
        }
    }
};
