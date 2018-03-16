import json
import random
import string
import threading
import time
import traceback
import uuid

import eventlet
from flask import Flask, request
from flask_login import LoginManager
from flask_socketio import SocketIO, join_room, leave_room, emit

import config
from db import db_service
from lib import ai
from lib.game import Game, GameState
from web.user import user


TICK_PERIOD = 0.1

eventlet.monkey_patch()

app = Flask(__name__)
app.secret_key = config.FLASK_SECRET_KEY
app.register_blueprint(user)
socketio = SocketIO(app)

login_manager = LoginManager()
login_manager.init_app(app)

game_states = {}


@login_manager.user_loader
def load_user(user_id):
    return db_service.get_user_by_id(user_id)


@app.route('/', methods=['GET'])
def index():
    return 'Kung Fu Chess'


@app.route('/api/game/new', methods=['POST'])
def new():
    data = json.loads(request.data)
    move_ticks = data['moveTicks']
    cooldown_ticks = data['cooldownTicks']
    bots = data.get('bots', {})
    bots = {int(player): ai.get_bot(difficulty) for player, difficulty in bots.iteritems()}

    game_id = ''.join(random.choice(string.ascii_uppercase + string.digits) for i in xrange(6))
    game = Game(move_ticks, cooldown_ticks)
    for player in bots:
        game.mark_ready(player)

    player_keys = {i: str(uuid.uuid4()) for i in xrange(1, 3) if i not in bots}
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


@socketio.on('reset')
def reset(data):
    data = json.loads(data)
    game_id = data['gameId']
    player_key = data['playerKey']
    print 'reset', data

    game_state = game_states[game_id]

    auth_player = None
    for player, key in game_state.player_keys.iteritems():
        if player_key == key:
            auth_player = player

    # only authenticated players can make moves
    if auth_player is not None:
        old_game = game_state.game
        game = Game(old_game.move_ticks, old_game.cooldown_ticks)
        for player in game_state.bots:
            game.mark_ready(player)
        game_state.game = game

        emit('resetack', {
            'game': game.to_json_obj(),
        }, room=game_id, json=True)


def tick():
    start = time.time()
    tick_number = 0
    while True:
        tick_number += 1
        next_tick = start + TICK_PERIOD * tick_number
        sleep_amount = next_tick - time.time()
        if sleep_amount > 0:
            eventlet.sleep(sleep_amount)

        current_time = time.time()
        expired_games = set()
        for game_id, game_state in game_states.iteritems():
            game = game_state.game

            if current_time - min(game.last_tick_time, game.last_move_time) > 60 * 10:
                expired_games.add(game_id)
                continue

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

                if moved:
                    socketio.emit('moveack', {
                        'game': game_state.game.to_json_obj(),
                        'success': True,
                    }, room=game_id, json=True)
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

        for game_id in expired_games:
            del game_states[game_id]


eventlet.spawn(tick)
