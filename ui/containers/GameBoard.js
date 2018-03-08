import React, {Component} from 'react';
import * as PIXI from 'pixi.js';

import chessboardImg from '../assets/chessboard.png';
import * as gameLogic from '../util/GameLogic.js';
import sprites from '../util/Sprites.js';

const BORDER_FACTOR = 0.0834;
const SHIFT_FACTOR = 0.005;
const SPRITE_FACTOR = 0.90;
const COOLDOWN_COLOR = 0xf0f000;

export default class GameBoard extends Component {

	constructor(props) {
		super(props);

		this.state = {
			gameId: null,
			isReady: false,
		};

		this.updateState = this.updateState.bind(this);
		this.resize = this.resize.bind(this);
		this.update = this.update.bind(this);
		this.handleClick = this.handleClick.bind(this);
		this.handleMove = this.handleMove.bind(this);

		this.pieceSprites = {};
		this.selected = null;
	}

	componentDidMount() {
		// create app
		const windowWidth = window.innerWidth, windowHeight = window.innerHeight;
		this.dim = Math.max(512, Math.min(windowWidth, windowHeight) - 64);
		this.border = this.dim * BORDER_FACTOR;
		this.shift = this.dim * SHIFT_FACTOR;
		this.cellDim = (this.dim - 2 * this.border) / 8;
		this.cellPadding = this.cellDim * (1 - SPRITE_FACTOR) / 2;

		this.app = new PIXI.Application(this.dim, this.dim, {
			view: this.canvas,
		});

		this.backgroundTexture = new PIXI.Graphics();
		this.backgroundTexture.beginFill(0xffffff);
		this.backgroundTexture.drawRect(0, 0, this.dim, this.dim);

		const chessboardTexture = PIXI.Texture.fromImage(chessboardImg);
		this.chessboardSprite = new PIXI.Sprite(chessboardTexture);
		this.chessboardSprite.width = this.dim;
		this.chessboardSprite.height = this.dim;

		this.app.stage.interactive = true;
		this.app.stage.mousemove = this.handleMove;

		this.app.stage.addChild(this.backgroundTexture);
		this.app.stage.addChild(this.chessboardSprite);

		this.metaStage = new PIXI.Container();
		this.app.stage.addChild(this.metaStage);

		this.mainStage = new PIXI.Container();
		this.app.stage.addChild(this.mainStage);

		this.app.ticker.add(this.update);

		// register listeners
		this.props.gameState.registerListener(this.updateState);

		window.addEventListener('resize', this.resize);
	}

	componentWillUnmount() {
        window.removeEventListener('resize', this.resize);
    }

	componentWillReceiveProps(nextProps) {
		if (this.props.gameState !== nextProps.gameState) {
	    	// destroy all sprites
	    	for (let pieceId in this.pieceSprites) {
	    		const pieceSprite = this.pieceSprites[pieceId];
				this.destroyPieceSprite(pieceSprite);
	    	}

			this.pieceSprites = {};
			this.unselect();

			nextProps.gameState.registerListener(this.updateState);
		}
	}

    updateState(gameState) {
    	if (gameState) {
	    	this.setState({
	    		gameId: gameState.gameId,
	    		isReady: gameState.isReady(),
	    	});
	    }
    }

    resize() {
    	const windowWidth = window.innerWidth, windowHeight = window.innerHeight;
		this.dim = Math.max(512, Math.min(windowWidth, windowHeight) - 64);
		this.border = this.dim * BORDER_FACTOR;
		this.cellDim = (this.dim - 2 * this.border) / 8;
		this.cellPadding = this.cellDim * (1 - SPRITE_FACTOR) / 2;

		this.backgroundTexture.clear();
		this.backgroundTexture.beginFill(0xffffff);
		this.backgroundTexture.drawRect(0, 0, this.dim, this.dim);

		this.chessboardSprite.width = this.dim;
		this.chessboardSprite.height = this.dim;

		this.app.renderer.resize(this.dim, this.dim);
    }

	destroyPieceSprite(pieceSprite) {
		pieceSprite.sprite.destroy();
		pieceSprite.cooldownGraphics.destroy(true);
		pieceSprite.borderGraphics.destroy(true);
		this.mainStage.removeChild(pieceSprite.sprite);
		this.metaStage.removeChild(pieceSprite.cooldownGraphics);
		this.metaStage.removeChild(pieceSprite.borderGraphics);
	}

	update() {
		const { gameState } = this.props;
		const { game } = gameState;
		if (!game) {
			return;
		}

		const currentTick = gameState.getCurrentTick();

		const movingPieces = {};
		game.activeMoves.forEach(move => {
			movingPieces[move.piece.id] = move;
		});

		const cooldownPieces = {};
		game.cooldowns.forEach(cooldown => {
			cooldownPieces[cooldown.piece.id] = cooldown;
		})

		// render pieces
		game.board.pieces.forEach(piece => {
			const key = piece.type + piece.player;
			
			// check for when selected piece is captured
			if (piece.captured && this.selected && this.selected.piece.id === piece.id) {
				this.unselect();
			}

			let pieceSprite = this.pieceSprites[piece.id]
			if (!pieceSprite || pieceSprite.key !== key) {
				// create sprite if it doesn't exist already or the key changed
				if (pieceSprite) {
					this.destroyPieceSprite(pieceSprite);
				}

				const spriteFn = sprites[key];
				if (spriteFn) {
					pieceSprite = {key, sprite: spriteFn()};
					this.mainStage.addChild(pieceSprite.sprite);

					pieceSprite.cooldownGraphics = new PIXI.Graphics();
					this.metaStage.addChild(pieceSprite.cooldownGraphics);

					pieceSprite.borderGraphics = new PIXI.Graphics();
					this.metaStage.addChild(pieceSprite.borderGraphics);

					this.pieceSprites[piece.id] = pieceSprite
				}
			}

			if (pieceSprite) {
				if (piece.captured) {
					// don't show captured pieces
					pieceSprite.sprite.visible = false;
				} else {
					pieceSprite.sprite.visible = true;
					pieceSprite.sprite.width = this.cellDim * SPRITE_FACTOR;
					pieceSprite.sprite.height = this.cellDim * SPRITE_FACTOR;

					let pRow, pCol;
					if (piece.id in movingPieces) {
						// moving piece sprites are re-added to stage so they appear on top
						this.mainStage.removeChild(pieceSprite.sprite);
						this.mainStage.addChild(pieceSprite.sprite);

						// compute interpolated position of the moving piece
						const move = movingPieces[piece.id]
						const totalMoveTicks = (move.moveSeq.length - 1) * game.moveTicks;
						const interp = Math.max(0, Math.min(1, (currentTick - move.startingTick) / totalMoveTicks));
						const sRow = move.moveSeq[0][0], sCol = move.moveSeq[0][1];
						const eRow = move.moveSeq[move.moveSeq.length - 1][0], eCol = move.moveSeq[move.moveSeq.length - 1][1];
						pRow = sRow + (eRow - sRow) * interp;
						pCol = sCol + (eCol - sCol) * interp;
					} else {
						pRow = piece.row;
						pCol = piece.col;
					}

					const position = this.getPosition(pRow, pCol);
					pieceSprite.sprite.x = position.x;
					pieceSprite.sprite.y = position.y;

					// for debugging
					// pieceSprite.borderGraphics.clear();
					// pieceSprite.borderGraphics.lineStyle(1, 0x000000);
					// pieceSprite.borderGraphics.drawRect(position.x, position.y, this.cellDim, this.cellDim);
				}
			}
		});

		// render selected if necessary
		if (this.selected) {
			this.metaStage.removeChild(this.selected.graphics);
			this.metaStage.addChild(this.selected.graphics);

			const position = this.getPosition(this.selected.piece.row, this.selected.piece.col);
			if (gameState.player === 2) {
				position.x++;
				position.y++;
			}

			this.selected.graphics.clear();
			this.selected.graphics.lineStyle(4, COOLDOWN_COLOR);
			this.selected.graphics.drawRect(position.x, position.y, this.cellDim - 2, this.cellDim - 2);

			if (gameLogic.isLegalMove(game, currentTick, this.selected.piece, this.selected.row, this.selected.col)) {
				// selected piece sprite is re-added to the stage so it appears on top
				this.mainStage.removeChild(this.selected.sprite);
				this.mainStage.addChild(this.selected.sprite);

				const selectedPosition = this.getPosition(this.selected.row, this.selected.col);
				this.selected.sprite.x = selectedPosition.x;
				this.selected.sprite.y = selectedPosition.y;
				this.selected.sprite.width = this.cellDim * SPRITE_FACTOR;
				this.selected.sprite.height = this.cellDim * SPRITE_FACTOR;
				this.selected.sprite.alpha = 0.3;
			} else {
				this.mainStage.removeChild(this.selected.sprite);
			}
		}

		// render cooldowns if necessary
		for (let pieceId in this.pieceSprites) {
			const pieceSprite = this.pieceSprites[pieceId];
			if (pieceId in cooldownPieces) {

				const cooldown = cooldownPieces[pieceId];
				const interp = Math.max(0, Math.min(1, (currentTick - cooldown.startingTick) / game.cooldownTicks));
				this.updateCooldownGraphics(pieceSprite.cooldownGraphics, cooldown.piece.row, cooldown.piece.col, interp);
			} else {
				pieceSprite.cooldownGraphics.visible = false;

				if (pieceId in movingPieces) {
					// special case for the end of a move, start rendering cooldown even if server hasn't updated us yet
					const move = movingPieces[pieceId];
					if (!move.piece.captured) {
						const totalMoveTicks = (move.moveSeq.length - 1) * game.moveTicks;
						if (currentTick - move.startingTick >= totalMoveTicks) {
							const lastMove = move.moveSeq[move.moveSeq.length - 1];
							const interp = (currentTick - move.startingTick - totalMoveTicks) / game.cooldownTicks;
							this.updateCooldownGraphics(pieceSprite.cooldownGraphics, lastMove[0], lastMove[1], interp);
						}
					}
				}
			}
		}
	}

	updateCooldownGraphics(cooldownGraphics, row, col, interp) {
		cooldownGraphics.visible = true;
		cooldownGraphics.clear();
		cooldownGraphics.alpha = 0.5;
		cooldownGraphics.beginFill(COOLDOWN_COLOR);

		const offset = this.cellDim * interp, remaining = this.cellDim - offset;
		const position = this.getPosition(row, col);
		cooldownGraphics.drawRect(position.x, position.y + offset, this.cellDim, remaining);
	}

	handleClick(event) {
		const { gameState } = this.props;
		if (!gameState.game.started || gameState.game.finished) {
			// don't allow clicks before game starts or after game finishes
			return;
		}

		const { row, col, piece } = this.getClickedPiece(event);

		let shouldSelect = true;
		if (this.selected) {
			if (piece && this.selected.piece.id === piece.id) {
				this.unselect();
				shouldSelect = false;
			} else if (!gameLogic.isLegalMove(gameState.game, gameState.getCurrentTick(), this.selected.piece, row, col)) {
				this.unselect();
			} else {
				if (!piece || this.selected.piece.player !== piece.player) {
					gameState.onMove(this.selected.piece.id, this.selected.piece.player, row, col);
				}
				this.unselect();
				shouldSelect = false;
			}
		}

		if (piece && piece.player === gameState.player && shouldSelect) {
			const key = piece.type + piece.player;
			const sprite = sprites[key]();
			const graphics = new PIXI.Graphics();

			this.selected = {
				piece,
				row,
				col,
				sprite,
				graphics,
			};
		}
	}

	getPosition(row, col) {
		const { player } = this.props.gameState;

		if (player === 1) {
			return {
				x: this.border + col * this.cellDim + this.cellPadding - this.shift,
				y: this.border + row * this.cellDim + this.cellPadding - this.shift,
			};
		} else {
			return {
				x: this.border + (7 - col) * this.cellDim + this.cellPadding - this.shift,
				y: this.border + (7 - row) * this.cellDim + this.cellPadding - this.shift,
			};
		}
	}

	unselect() {
		if (this.selected) {
			this.selected.sprite.destroy();
			this.selected.graphics.destroy(true);
			this.mainStage.removeChild(this.selected.sprite);
			this.metaStage.removeChild(this.selected.graphics);
			this.selected = null;
		}
	}

	handleMove(event) {
		const { row, col, piece } = this.getClickedPiece(event.data.originalEvent);

		if (this.selected) {
			this.selected.row = row;
			this.selected.col = col;
		}
	}

	getClickedPiece(event) {
		const canvasRect = this.canvas.getBoundingClientRect();
		const adjustedX = event.clientX - canvasRect.x, adjustedY = event.clientY - canvasRect.y;
		const point = new PIXI.Point(adjustedX, adjustedY);

		let row = Math.floor((adjustedY - this.border) / this.cellDim);
		let col = Math.floor((adjustedX - this.border) / this.cellDim);
		if (this.props.gameState.player === 2) {
			row = 7 - row;
			col = 7 - col;
		}

		// find if click landed on any piece
		for (let pieceId in this.pieceSprites) {
			const pieceSprite = this.pieceSprites[pieceId];
			if (!pieceSprite.sprite.visible) {
				continue;
			}

			const { game } = this.props.gameState;
			const piece = gameLogic.getPieceById(game, pieceId);
			if (
				pieceSprite.sprite.containsPoint(point) &&
				!gameLogic.isMoving(game, piece) &&
				!gameLogic.isCooldown(game, piece)
			) {
				return { row, col, piece };
			}
		}

		return { row, col };
	}

	render() {
		const { gameState } = this.props;
		const { gameId, isReady } = this.state;

    	let gameStatus = 'Waiting...';
    	if (gameState && gameState.game) {
	    	if (gameState.game.finished) {
	    		gameStatus = (gameState.game.finished === 1 ? 'White' : 'Black') + ' wins!';
	    	} else if (gameState.game.started) {
	    		gameStatus = 'Playing';
			}
		}

		return (
			<div>
        		{gameState && <div> Game ID: {gameId}</div>}
        		{gameState &&
        			<div>
        				Game Status: {gameStatus}
        				{!isReady && <input type='submit' value='Ready!' onClick={gameState.onReady.bind(gameState)} />}
        			</div>
        		}
				<canvas ref={ref => (this.canvas = ref)} onClick={this.handleClick} />
			</div>
		);
	}
};
