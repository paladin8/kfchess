import json
import threading
import time
import traceback
import uuid

import eventlet
from flask import Flask, request
from flask_socketio import SocketIO, join_room, leave_room, emit

from lib import ai
from lib.game import Game, GameState


eventlet.monkey_patch()
app = Flask(__name__)
socketio = SocketIO(app)
game_states = {}
tick_period = 0.1


@app.route('/', methods=['GET'])
def index():
    return 'Kung Fu Chess'


@app.route('/game/new', methods=['POST'])
def new():
    data = json.loads(request.data)
    move_ticks = data['moveTicks']
    cooldown_ticks = data['cooldownTicks']
    bots = data.get('bots', {})
    bots = {int(player): ai.get_bot(difficulty) for player, difficulty in bots.iteritems()}

    game_id = str(uuid.uuid4())
    game = Game(move_ticks, cooldown_ticks, debug=True)
    for player in bots:
        game.mark_ready(player)

    player_keys = {1: str(uuid.uuid4()), 2: str(uuid.uuid4())}
    game_states[game_id] = GameState(game_id, game, player_keys, bots)
    return json.dumps({
        'id': game_id,
        'game': game.to_json_obj(),
        'playerKeys': player_keys,
    })


@socketio.on('join')
def join(data):
    data = json.loads(data)
    game_id = data['gameId']
    player_key = data.get('playerKey')
    print 'join', data

    game_state = game_states[game_id]
    auth_player = 0  # no key or no match means player 0 = spectator
    if player_key is not None:
        for player, key in game_state.player_keys.iteritems():
            if player_key == key:
                auth_player = player

    join_room(game_id)
    emit('joinack', {
        'game': game_state.game.to_json_obj(),
        'player': auth_player,
    }, json=True)


@socketio.on('ready')
def ready(data):
    data = json.loads(data)
    game_id = data['gameId']
    player_key = data['playerKey']
    print 'ready', data

    game_state = game_states[game_id]
    auth_player = 0
    for player, key in game_state.player_keys.iteritems():
        if player_key == key:
            auth_player = player

    if auth_player:
        game_state.game.mark_ready(auth_player)

        emit('readyack', {
            'game': game_state.game.to_json_obj(),
        }, room=game_id, json=True)


@socketio.on('leave')
def leave(data):
    data = json.loads(data)
    game_id = data['gameId']
    print 'leave', data

    leave_room(game_id)


@socketio.on('move')
def move(data):
    data = json.loads(data)
    game_id = data['gameId']
    player_key = data['playerKey']
    piece_id = data['pieceId']
    to_row = data['toRow']
    to_col = data['toCol']
    print 'move', data
    
    game_state = game_states[game_id]

    auth_player = None
    for player, key in game_state.player_keys.iteritems():
        if player_key == key:
            auth_player = player

    # only authenticated players can make moves
    if auth_player is not None:
        move = game_state.game.move(piece_id, auth_player, to_row, to_col)
        emit('moveack', {
            'game': game_state.game.to_json_obj(),
            'success': move is not None,
        }, room=game_id, json=True)


def tick():
    start = time.time()
    tick_number = 0
    while True:
        tick_number += 1
        next_tick = start + tick_period * tick_number
        sleep_amount = next_tick - time.time()
        if sleep_amount > 0:
            eventlet.sleep(sleep_amount)

        for game_id, game_state in game_states.iteritems():
            game = game_state.game
            if not game.started or game.finished:
                continue

            try:
                moved = False
                for player, bot in game_state.bots.iteritems():
                    move = bot.get_move(game, player)
                    if move:
                        piece, row, col = move
                        game.move(piece.id, player, row, col)
                        moved = True

                socketio.emit('moveack', {
                    'game': game_state.game.to_json_obj(),
                    'success': True,
                })
            except:
                traceback.print_exc()

            try:
                status, updates = game.tick()
                if updates:
                    socketio.emit('update', {
                        'game': game.to_json_obj(),
                        'updates': updates,
                    }, room=game_id, json=True)
            except:
                traceback.print_exc()


eventlet.spawn(tick)
