import React, { Component } from 'react';
import { withRouter } from 'react-router'

class Home extends Component {

    constructor(props) {
        super(props);

        this.state = {
            difficulty: 'novice',
            speed: 'standard',
        };

        this.createNewGame = this.createNewGame.bind(this);
        this.joinGame = this.joinGame.bind(this);
    }

    createNewGame(moveTicks, cooldownTicks, isBot, difficulty) {
        fetch('/api/game/new', {
            body: JSON.stringify({ moveTicks, cooldownTicks, bots: isBot ? {2: difficulty} : {} }),
            credentials: 'same-origin',
            headers: {
                'content-type': 'application/json',
            },
            method: 'POST',
        }).then(response => {
            response.json().then(data => {
                this.props.setPlayerKeys(data.playerKeys);
                this.props.history.push(`/game/${data.id}?key=${data.playerKeys['1']}`);
            });
        });
    }

    joinGame(gameId, playerKey) {
        this.props.history.push(`/game/${gameId}?key=${playerKey}`);
    }

    render () {
        const { difficulty, speed } = this.state;

        return (
            <div className='home'>
                <div className='home-banner'>
                    <div className='home-banner-video'>
                        <video autoPlay loop muted>
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
                            onClick={() => {
                                this.createNewGame(10, 100, true, difficulty);
                            }}
                        >
                            Play vs AI
                        </div>
                        <div className='home-play-option-wrapper'>
                            <div
                                className={`home-play-option ${difficulty === 'novice' ? 'selected' : ''}`}
                                onClick={() => this.setState({ difficulty: 'novice' })}
                            >
                                Novice
                            </div>
                            <div
                                className={`home-play-option ${difficulty === 'intermediate' ? 'selected' : ''}`}
                                onClick={() => this.setState({ difficulty: 'intermediate' })}
                            >
                                Intermediate
                            </div>
                            <div
                                className={`home-play-option ${difficulty === 'advanced' ? 'selected' : ''}`}
                                onClick={() => this.setState({ difficulty: 'advanced' })}
                            >
                                Advanced
                            </div>
                        </div>
                    </div>
                    <div className='home-play-button-wrapper'>
                        <div
                            className='home-play-button home-create-game-button'
                            onClick={(() => {
                                let moveTicks = 10, cooldownTicks = 100;
                                if (speed === 'lightning') {
                                    moveTicks = 1;
                                    cooldownTicks = 1;
                                }
                                this.createNewGame(moveTicks, cooldownTicks, false);
                            }).bind(this)}
                        >
                            Play vs Friend
                        </div>
                        <div className='home-play-option-wrapper'>
                            <div
                                className={`home-play-option ${speed === 'standard' ? 'selected' : ''}`}
                                onClick={() => this.setState({ speed: 'standard' })}
                            >
                                Standard
                            </div>
                            <div
                                className={`home-play-option ${speed === 'lightning' ? 'selected' : ''}`}
                                onClick={() => this.setState({ speed: 'lightning' })}
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

export default withRouter(Home);
