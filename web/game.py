import datetime
import json
import random
import string
import time
import traceback
import uuid

import eventlet
from flask import Blueprint, request
from flask_login import current_user

import context
from db import db_service
from lib import ai
from lib.game import Game, GameState, Speed
from web import game_states


TICK_PERIOD = 0.1

game = Blueprint('game', __name__)

socketio = None  # populated by initialize()


@game.route('/api/game/new', methods=['POST'])
def new():
    data = json.loads(request.data)
    speed = data['speed']
    bots = data.get('bots', {})
    bots = {int(player): ai.get_bot(difficulty) for player, difficulty in bots.iteritems()}
    username = data.get('username')
    print 'new game', data

    # generate game ID and player keys
    game_id = ''.join(random.choice(string.ascii_uppercase + string.digits) for i in xrange(6))
    player_keys = {i: str(uuid.uuid4()) for i in xrange(1, 3) if i not in bots}

    # if logged in, add current user to game
    players = {i: 'b' for i in bots}
    if current_user.is_authenticated:
        players[1] = 'u:%s' % current_user.user_id
        db_service.update_user_current_game(current_user.user_id, game_id, player_keys[1])

    # check opponent
    if username is not None:
        user = db_service.get_user_by_username(username)
        if user is None:
            return json.dumps({
                'success': False,
                'message': 'User to invite does not exist.',
            })

        if user.current_game is not None:
            return json.dumps({
                'success': False,
                'message': 'User to invite is already in a game.',
            })

        players[2] = 'u:%s' % user.user_id
        db_service.update_user_current_game(user.user_id, game_id, player_keys[2])

    for i in xrange(1, 3):
        if i not in players:
            players[i] = 'o'

    # create game and add to game states
    game = Game(Speed(speed), players)
    for player in bots:
        game.mark_ready(player)

    game_states[game_id] = GameState(game_id, game, player_keys, bots)

    return json.dumps({
        'success': True,
        'gameId': game_id,
        'game': game.to_json_obj(),
        'playerKeys': player_keys,
    })


@game.route('/api/game/check', methods=['GET'])
def check():
    game_id = request.args['gameId']
    print 'check', request.args

    if not current_user.is_authenticated:
        return json.dumps({
            'success': False,
            'message': 'User is not logged in.'
        })

    if game_id in game_states:
        return json.dumps({
            'success': True,
        })

    user = db_service.update_user_current_game(current_user.user_id, None, None)
    return json.dumps({
        'success': False,
        'user': user.to_json_obj(),
    })


@game.route('/api/game/invite', methods=['POST'])
def invite():
    data = json.loads(request.data)
    game_id = data['gameId']
    player = data['player']
    username = data['username']
    print 'invite', data

    if not current_user.is_authenticated:
        return json.dumps({
            'success': False,
            'message': 'User is not logged in.',
        })

    if game_id not in game_states:
        return json.dumps({
            'success': False,
            'message': 'Game does not exist.',
        })

    game_state = game_states[game_id]
    game = game_state.game
    if game.players[player] != 'o':
        return json.dumps({
            'success': False,
            'message': 'Player position is already filled.',
        })

    if ('u:%s' % current_user.user_id) not in game.players.values():
        return json.dumps({
            'success': False,
            'message': 'User is not in the game.',
        })

    user = db_service.get_user_by_username(username)
    if user is None:
        return json.dumps({
            'success': False,
            'message': 'User to invite does not exist.',
        })

    if user.current_game is not None:
        return json.dumps({
            'success': False,
            'message': 'User to invite is already in a game.',
        })

    # generate a new player key (for security)
    new_key = str(uuid.uuid4())
    game_state.player_keys[player] = new_key
    game.players[player] = 'u:%s' % user.user_id
    db_service.update_user_current_game(user.user_id, game_id, new_key)

    socketio.emit('inviteack', {
        'game': game.to_json_obj(),
    }, room=game_id, json=True)

    return json.dumps({
        'success': True,
    })


def initialize(init_socketio):
    global socketio
    socketio = init_socketio

    # clear all active games on server init
    db_service.clear_active_games(context.SERVER)

    # infinite loop that ticks all active games
    def tick():
        start = time.time()
        tick_number = 0
        while True:
            # adjust sleep amount to avoid drift
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
                    # add to active games
                    if game.current_tick == 0:
                        db_service.add_active_game(context.SERVER, game_id, {
                            'players': game.players,
                            'speed': game.speed.value,
                            'startTime': str(datetime.datetime.utcnow()),
                        })
                except:
                    traceback.print_exc()

                try:
                    # check for bot moves
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
                    # tick game; if there are updates, emit to room
                    status, updates = game.tick()
                    if updates:
                        socketio.emit('update', {
                            'game': game.to_json_obj(),
                            'updates': updates,
                        }, room=game_id, json=True)
                except:
                    traceback.print_exc()

                try:
                    # remove from active games and add to history
                    if game.finished:
                        db_service.remove_active_game(context.SERVER, game_id)

                        history_id = db_service.add_game_history(game)
                        for player, value in game.players.iteritems():
                            if not value.startswith('u:'):
                                continue

                            user_id = int(value[2:])
                            opponents = [v for k, v in game.players.iteritems() if k != player]
                            db_service.add_user_game_history(user_id, game.start_time, {
                                'speed': game.speed.value,
                                'player': player,
                                'winner': game.finished,
                                'historyId': history_id,
                                'ticks': game.current_tick,
                                'opponents': opponents,
                            })
                except:
                    traceback.print_exc()

            for game_id in expired_games:
                db_service.remove_active_game(context.SERVER, game_id)
                del game_states[game_id]


    eventlet.spawn(tick)
