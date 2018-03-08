import React, {Component} from 'react';

export default class GameSetup extends Component {

	constructor(props) {
		super(props);

		this.state = {
			gameId: '',
			playerKey: '',
		};

		this.setGameId = this.setGameId.bind(this);
		this.setPlayerKey = this.setPlayerKey.bind(this);
	}

	setGameId(event) {
		this.setState({
			gameId: event.target.value,
		})
	}

	setPlayerKey(event) {
		this.setState({
			playerKey: event.target.value,
		})
	}

	render () {
		const { gameId, playerKey } = this.state;

        return (
        	<div>
        		Game ID: <input type="text" value={gameId} onChange={this.setGameId} />
        		Player Key: <input type="text" value={playerKey} onChange={this.setPlayerKey} />
        		<input type="submit" value="Join game" onClick={() => this.props.joinGame(gameId, playerKey)} />
        	</div>
        );
    }
};
