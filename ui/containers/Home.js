import amplitude from 'amplitude-js';
import React, { Component } from 'react';

export default class Home extends Component {

    constructor(props) {
        super(props);

        this.state = {
            difficulty: 'novice',
            friendlySpeed: 'standard',
        };
    }

    componentDidMount() {
        amplitude.getInstance().logEvent('Visit Home Page');
    }

    changeDifficulty(difficulty) {
        amplitude.getInstance().logEvent('Change AI Difficulty', { difficulty });
        this.setState({ difficulty });
    }

    changeFriendlySpeed(friendlySpeed) {
        amplitude.getInstance().logEvent('Change Friendly Speed', { friendlySpeed });
        this.setState({ friendlySpeed })
    }

    render () {
        const { difficulty, friendlySpeed } = this.state;

        return (
            <div className='home'>
                <div className='home-banner'>
                    <div className='home-banner-video'>
                        <video autoPlay loop muted playsInline>
                            <source src='/static/banner-video.mp4' type='video/mp4' />
                        </video>
                    </div>
                    <div className='home-banner-text'>
                        <div className='home-banner-text-main'>
                            Chess Without Turns
                        </div>
                        <div className='home-banner-text-sub'>
                            The world's most popular strategy game goes real-time.
                        </div>
                    </div>
                </div>
                <div className='home-play-buttons'>
                    <div className='home-play-button-wrapper'>
                        <div
                            className='home-play-button home-play-vs-ai-button'
                            onClick={() => this.props.createNewGame('standard', true, difficulty)}
                        >
                            Play vs AI
                        </div>
                        <div className='home-play-option-wrapper'>
                            <div
                                className={`home-play-option ${difficulty === 'novice' ? 'selected' : ''}`}
                                onClick={() => this.changeDifficulty('novice')}
                            >
                                Novice
                            </div>
                            <div
                                className={`home-play-option ${difficulty === 'intermediate' ? 'selected' : ''}`}
                                onClick={() => this.changeDifficulty('intermediate')}
                            >
                                Intermediate
                            </div>
                            <div
                                className={`home-play-option ${difficulty === 'advanced' ? 'selected' : ''}`}
                                onClick={() => this.changeDifficulty('advanced')}
                            >
                                Advanced
                            </div>
                        </div>
                    </div>
                    <div className='home-play-button-wrapper'>
                        <div
                            className='home-play-button home-create-game-button'
                            onClick={() => this.props.createNewGame(friendlySpeed, false)}
                        >
                            Play vs Friend
                        </div>
                        <div className='home-play-option-wrapper'>
                            <div
                                className={`home-play-option ${friendlySpeed === 'standard' ? 'selected' : ''}`}
                                onClick={() => this.changeFriendlySpeed('standard')}
                            >
                                Standard
                            </div>
                            <div
                                className={`home-play-option ${friendlySpeed === 'lightning' ? 'selected' : ''}`}
                                onClick={() => this.changeFriendlySpeed('lightning')}
                            >
                                Lightning
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
};
