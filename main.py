import json

import eventlet
from flask import Flask, abort, request, session
from flask_login import LoginManager
from flask_socketio import SocketIO, join_room, leave_room, emit

import config
from db import db_service
from lib.game import Game
from web import game_states, game as game_handlers
from web.game import game as game_blueprint
from web.live import live as live_blueprint
from web.user import user as user_blueprint


eventlet.monkey_patch()

app = Flask(__name__)
app.secret_key = config.FLASK_SECRET_KEY
app.register_blueprint(game_blueprint)
app.register_blueprint(live_blueprint)
app.register_blueprint(user_blueprint)
socketio = SocketIO(app)

login_manager = LoginManager()
login_manager.init_app(app)

game_handlers.initialize(socketio)


@login_manager.user_loader
def load_user(user_id):
    return db_service.get_user_by_id(user_id)


@app.before_request
def csrf_protect():
    if request.method == 'POST':
        token = session.get('_csrf_token')
        if not token or token != request.headers.get('X-CSRF-Token'):
            abort(403)


@app.route('/', methods=['GET'])
def index():
    return 'Kung Fu Chess'


# socket.io functions


def get_auth_player(game_state, player_key):
    if player_key is not None:
        for player, key in game_state.player_keys.iteritems():
            if player_key == key:
                return player

    return 0  # no key or no match means player 0 = spectator


@socketio.on('join')
def join(data):
    data = json.loads(data)
    game_id = data['gameId']
    player_key = data.get('playerKey')
    print 'join', data

    if game_id not in game_states:
        return

    game_state = game_states[game_id]
    auth_player = get_auth_player(game_state, player_key)

    join_room(game_id)
    emit('joinack', {
        'game': game_state.game.to_json_obj(),
        'player': auth_player,
        'ticks': game_state.replay.ticks if game_state.replay is not None else None,
    }, json=True)


@socketio.on('cancel')
def cancel(data):
    data = json.loads(data)
    game_id = data['gameId']
    player_key = data.get('playerKey')
    print 'cancel', data

    if game_id not in game_states:
        emit('cancelack', {}, room=game_id, json=True)
        return

    game_state = game_states[game_id]
    auth_player = get_auth_player(game_state, player_key)

    # only authenticated players can cancel
    game = game_state.game
    if auth_player and (not game.started or game.finished):
        for player, value in game.players.iteritems():
            if value.startswith('u'):
                user_id = int(value[2:])
                db_service.update_user_current_game(user_id, None, None)

        del game_states[game_id]

        emit('cancelack', {}, room=game_id, json=True)


@socketio.on('ready')
def ready(data):
    data = json.loads(data)
    game_id = data['gameId']
    player_key = data['playerKey']
    print 'ready', data

    if game_id not in game_states:
        return

    game_state = game_states[game_id]
    auth_player = get_auth_player(game_state, player_key)

    # only authenticated players can ready
    if auth_player:
        game_state.game.mark_ready(auth_player)

        emit('readyack', {
            'game': game_state.game.to_json_obj(),
        }, room=game_id, json=True)


@socketio.on('move')
def move(data):
    data = json.loads(data)
    game_id = data['gameId']
    player_key = data['playerKey']
    piece_id = data['pieceId']
    to_row = data['toRow']
    to_col = data['toCol']
    print 'move', data

    if game_id not in game_states:
        return

    game_state = game_states[game_id]
    auth_player = get_auth_player(game_state, player_key)

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

    if game_id not in game_states:
        return

    game_state = game_states[game_id]
    auth_player = get_auth_player(game_state, player_key)

    # only authenticated players can reset game
    if auth_player is not None:
        old_game = game_state.game
        game = Game(old_game.speed, old_game.players)
        for player in game_state.bots:
            game.mark_ready(player)
        game_state.game = game

        emit('resetack', {
            'game': game.to_json_obj(),
        }, room=game_id, json=True)


@socketio.on('leave')
def leave(data):
    data = json.loads(data)
    game_id = data['gameId']
    print 'leave', data

    leave_room(game_id)
