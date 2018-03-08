import React, {Component} from 'react';

export default class GameSetup extends Component {

	constructor(props) {
		super(props);

		this.state = {
			moveTicks: 10,
			cooldownTicks: 10,
		};

		this.setMoveTicks = this.setMoveTicks.bind(this);
		this.setCooldownTicks = this.setCooldownTicks.bind(this);
	}

	setMoveTicks(event) {
		this.setState({
			moveTicks: parseInt(event.target.value),
		})
	}

	setCooldownTicks(event) {
		this.setState({
			cooldownTicks: parseInt(event.target.value),
		})
	}

	render () {
		const { moveTicks, cooldownTicks } = this.state;

        return (
        	<div>
        		Move ticks: <input type="number" value={moveTicks} onChange={this.setMoveTicks} />
        		Cooldown ticks: <input type="number" value={cooldownTicks} onChange={this.setCooldownTicks} />
        		<input type="submit" value="Create new game" onClick={() => this.props.createNewGame(moveTicks, cooldownTicks)} />
        	</div>
        );
    }
};
