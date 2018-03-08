import React, {Component} from 'react';

export default class GameSetup extends Component {

    constructor(props) {
        super(props);

        this.state = {
            moveTicks: 10,
            cooldownTicks: 10,
            isBot: false,
            difficulty: 'novice',
        };

        this.setMoveTicks = this.setMoveTicks.bind(this);
        this.setCooldownTicks = this.setCooldownTicks.bind(this);
        this.setIsBot = this.setIsBot.bind(this);
        this.setDifficulty = this.setDifficulty.bind(this);
    }

    setMoveTicks(event) {
        this.setState({
            moveTicks: parseInt(event.target.value),
        });
    }

    setCooldownTicks(event) {
        this.setState({
            cooldownTicks: parseInt(event.target.value),
        });
    }

    setIsBot(event) {
        this.setState({
            isBot: Boolean(event.target.value),
        });
    }

    setDifficulty(event) {
        this.setState({
            difficulty: event.target.value,
        });
    }

    render () {
        const { moveTicks, cooldownTicks, isBot, difficulty } = this.state;

        return (
            <div>
                Move ticks: <input type="number" value={moveTicks} onChange={this.setMoveTicks} />
                Cooldown ticks: <input type="number" value={cooldownTicks} onChange={this.setCooldownTicks} />
                Bot? <input type="checkbox" value={isBot} onChange={this.setIsBot} />
                Difficulty: <select value={difficulty} onChange={this.setDifficulty}>
                    <option value='novice'>Novice</option>
                </select>
                <input
                    type="submit"
                    value="Create new game"
                    onClick={() => this.props.createNewGame(moveTicks, cooldownTicks, isBot, difficulty)}
                />
            </div>
        );
    }
};
