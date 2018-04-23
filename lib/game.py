import datetime
import math
import threading
import time

from lib.board import Board


class Speed(object):

    STANDARD = 'standard'
    LIGHTNING = 'lightning'

    def __init__(self, value):
        self.value = value

    def get_move_ticks(self):
        if self.value == Speed.STANDARD:
            return 10
        elif self.value == Speed.LIGHTNING:
            return 2
        else:
            raise ValueError('Unexpected speed ' + self.value)

    def get_cooldown_ticks(self):
        if self.value == Speed.STANDARD:
            return 100
        elif self.value == Speed.LIGHTNING:
            return 20
        else:
            raise ValueError('Unexpected speed ' + self.value)


class Move(object):

    def __init__(self, piece, move_seq, starting_tick):
        self.piece = piece
        self.move_seq = move_seq
        self.starting_tick = starting_tick

    def to_json_obj(self):
        return {
            'pieceId': self.piece.id,
            'player': self.piece.player,
            'moveSeq': self.move_seq,
            'startingTick': self.starting_tick,
        }


class Cooldown(object):

    def __init__(self, piece, starting_tick):
        self.piece = piece
        self.starting_tick = starting_tick

    def to_json_obj(self):
        return {
            'pieceId': self.piece.id,
            'player': self.piece.player,
            'startingTick': self.starting_tick,
        }


class Game(object):

    GAME_CONTINUES = 0
    WHITE_WINS = -1
    BLACK_WINS = 1
    PLAYER_DIRECTION = [GAME_CONTINUES, WHITE_WINS, BLACK_WINS]

    MIN_DRAW_TICKS = {
        Speed.STANDARD: 1800,  # 3 min
        Speed.LIGHTNING: 900,  # 90 sec
    }
    DRAW_LIMITS = {
        Speed.STANDARD: 900,   # 90 sec
        Speed.LIGHTNING: 450,  # 45 sec
    }

    NO_MOVE_TIMEOUT = 120  # 2 min

    # move_ticks     = number of ticks to move 1 square in any direction (including diagonal)
    # cooldown_ticks = number of ticks before a piece can move again
    def __init__(self, speed, players, num_players=2, board=None, is_campaign=False, debug=False):
        self.speed = speed
        self.players = players
        self.num_players = num_players
        self.board = board or Board.initial()
        self.is_campaign = is_campaign
        self.debug = debug

        self.move_ticks = speed.get_move_ticks()
        self.cooldown_ticks = speed.get_cooldown_ticks()
        self.players_ready = {i + 1: False for i in xrange(num_players)}

        self.active_moves = []
        self.cooldowns = []
        self.move_log = []
        self.current_tick = 0
        self.last_move_time = time.time()
        self.last_tick_time = time.time()
        self.started = False
        self.finished = 0
        self.start_time = datetime.datetime.utcnow()
        self.last_capture_tick = 0

        self.piece_to_move_seq_fn = {
            'P': self._get_pawn_move_seq,
            'N': self._get_knight_move_seq,
            'B': self._get_bishop_move_seq,
            'R': self._get_rook_move_seq,
            'Q': self._get_queen_move_seq,
            'K': self._get_king_move_seq,
        }

    # returns the move or None if it is invalid
    def move(self, piece_id, player, to_row, to_col):
        # check if piece exists and is owned by the player
        piece = self.board.get_piece_by_id(piece_id)
        if piece is None or piece.player != player:
            if self.debug:
                print 'move failed: piece does not exist or is not controlled by player'
            return None

        # no moving out of bounds
        if to_row < 0 or to_row >= 8 or to_col < 0 or to_col >= 8:
            if self.debug:
                print 'move failed: out of bounds'
            return None

        # no staying in the same spot
        if piece.row == to_row and piece.col == to_col:
            if self.debug:
                print 'move failed: original position'
            return None

        # check if piece is already moving
        if self._already_moving(piece):
            if self.debug:
                print 'move failed: piece is already moving'
            return None

        # check if piece is on cooldown
        if self._on_cooldown(piece):
            if self.debug:
                print 'move failed: piece is on cooldown'
            return None

        # check if piece can move to destination
        move_seq_res = self._compute_move_seq(piece, to_row, to_col)
        if not move_seq_res:
            if self.debug:
                print 'move failed: piece cannot move to destination or is blocked'
            return None

        move_seq, extra_move = move_seq_res
        move_seq.insert(0, (piece.row, piece.col))

        # move is valid, add to active moves and game log
        move = Move(piece, move_seq, self.current_tick + 1)
        self.active_moves.append(move)
        self.move_log.append(move)
        piece.moved = True

        # check extra move (for castling)
        if extra_move:
            if self.debug:
                print 'castling %s' % piece

            self.active_moves.append(extra_move)
            self.move_log.append(extra_move)
            extra_move.piece.moved = True

        if self.debug:
            print 'moving %s along %s from tick %s' % (piece, move_seq, self.current_tick)

        if not self.players[player].startswith('b'):
            # last move time only counts for non-bots
            self.last_move_time = time.time()

        return move

    # get the sequence of moves to move piece to (to_row, to_col)
    def _compute_move_seq(self, piece, to_row, to_col):
        return self.piece_to_move_seq_fn[piece.type](piece, to_row, to_col)

    # pawns take one or two movements to get to their destination
    def _get_pawn_move_seq(self, piece, to_row, to_col):

        # pawns must move one row in the player's direction unless it is the first move
        can_capture = True
        row_dir = Game.PLAYER_DIRECTION[piece.player]
        steps = abs(to_row - piece.row)
        if to_row - piece.row != row_dir:
            if piece.player == 1 and piece.row == 6 and to_row == 4:
                can_capture = False
            elif piece.player == 2 and piece.row == 1 and to_row == 3:
                can_capture = False
            else:
                return None

        # if it is not changing column, it must move to an empty location
        if piece.col == to_col:
            move_seq = self._get_move_seq_ensuring_no_cross(piece, row_dir, 0, steps, capture=False)
            if move_seq is not None:
                return move_seq

        # if it is changing column by 1, it must be capturing
        if can_capture and (piece.col + 1 == to_col or piece.col - 1 == to_col):
            dest_piece = self.board.get_piece_by_location(to_row, to_col)
            if dest_piece is not None and dest_piece.player != piece.player and not self._already_moving(dest_piece):
                move_seq = self._get_move_seq_ensuring_no_cross(piece, row_dir, to_col - piece.col, 1)
                if move_seq is not None:
                    return move_seq

        return None

    # knights take two movements to get to their destination, but are 'floating' for one of them
    def _get_knight_move_seq(self, piece, to_row, to_col):

        # make sure one dimension moves 2 and the other moves 1
        row_delta, col_delta = abs(to_row - piece.row), abs(to_col - piece.col)
        if {row_delta, col_delta} != {1, 2}:
            return None

        move_seq = self._get_move_seq_ensuring_no_cross(piece, to_row - piece.row, to_col - piece.col, 1)
        if move_seq is None:
            return None

        return [(float(to_row + piece.row) / 2, float(to_col + piece.col) / 2), (to_row, to_col)], None

    # bishops take N movements to get to their destination
    def _get_bishop_move_seq(self, piece, to_row, to_col):

        # make sure dimensions move equally
        row_delta, col_delta = abs(to_row - piece.row), abs(to_col - piece.col)
        if row_delta != col_delta:
            return None

        row_dir = (to_row - piece.row) / row_delta
        col_dir = (to_col - piece.col) / col_delta
        return self._get_move_seq_ensuring_no_cross(piece, row_dir, col_dir, row_delta)

    # rooks take N movements to get to their destination
    def _get_rook_move_seq(self, piece, to_row, to_col):

        # make sure only one dimension moves
        row_delta, col_delta = abs(to_row - piece.row), abs(to_col - piece.col)
        if row_delta != 0 and col_delta != 0:
            return None

        row_dir = (to_row - piece.row) / row_delta if row_delta > 0 else 0
        col_dir = (to_col - piece.col) / col_delta if col_delta > 0 else 0
        return self._get_move_seq_ensuring_no_cross(piece, row_dir, col_dir, max(row_delta, col_delta))

    # queens take N movements to get to their destination
    def _get_queen_move_seq(self, piece, to_row, to_col):

        # can move like a bishop or a rook
        return self._get_bishop_move_seq(piece, to_row, to_col) or self._get_rook_move_seq(piece, to_row, to_col)

    # kings take exactly one movement to get to their destination
    def _get_king_move_seq(self, piece, to_row, to_col):

        # make sure we are moving at most one space in each direction
        row_delta, col_delta = abs(to_row - piece.row), abs(to_col - piece.col)
        if row_delta > 1 or col_delta > 1:
            # check for castling
            if not piece.moved and row_delta == 0 and (to_col == 6 or to_col == 2):
                rook_col = 0 if to_col == 2 else 7
                rook_to_col = 3 if to_col == 2 else 5
                rook_piece = self.board.get_piece_by_location(piece.row, rook_col)
                if rook_piece and not rook_piece.moved:
                    king_move_seq = self._get_rook_move_seq(piece, to_row, to_col)[0]
                    rook_move_seq = self._get_rook_move_seq(rook_piece, to_row, rook_to_col)[0]
                    if king_move_seq and rook_move_seq:
                        # this is a nasty special case where we return an extra move for the castle
                        rook_move = Move(rook_piece, rook_move_seq, self.current_tick + 1)
                        rook_move_seq.insert(0, (rook_piece.row, rook_piece.col))
                        return king_move_seq, rook_move

            return None

        return self._get_queen_move_seq(piece, to_row, to_col)

    # move in given direction without crossing pieces
    def _get_move_seq_ensuring_no_cross(self, piece, row_dir, col_dir, steps, capture=True):
        moves = []
        for i in xrange(1, steps + 1):
            i_row, i_col = piece.row + row_dir * i, piece.col + col_dir * i
            moves.append((i_row, i_col))

            # check for not moving pieces
            i_piece = self.board.get_piece_by_location(i_row, i_col)
            if (
                i_piece is not None and
                not i_piece.captured and
                not self._already_moving(i_piece) and
                (
                    not capture or
                    i != steps or
                    i_piece.player == piece.player
                )
            ):
                return None

            # check for same player's moving pieces
            for move in self.active_moves:
                if move.piece.player == piece.player and move.move_seq[-1] == (i_row, i_col):
                    return None

        # the destination cannot be on the future path of any of the same player's moves
        for move in self.active_moves:
            if move.piece.player != piece.player:
                continue

            tick_delta = self.current_tick - move.starting_tick
            movements = (tick_delta + self.move_ticks - 1) / self.move_ticks
            for row, col in move.move_seq[movements:]:
                if i_row == row and i_col == col:
                    return None

        return moves, None

    # whether piece is part of an active move
    def _already_moving(self, piece):
        for move in self.active_moves:
            if move.piece.id == piece.id:
                return True
        return False

    # whether a piece is on cooldown
    def _on_cooldown(self, piece):
        for cooldown in self.cooldowns:
            if cooldown.piece.id == piece.id:
                return True
        return False

    # one tick of the game passing, returns a pair of:
    #   - status indicating whether the game continues or if someone won
    #   - list of meaningful updates (capture, move/cooldown finished, promotion)
    def tick(self):
        self.current_tick += 1
        self.last_tick_time = time.time()

        updates = []

        # resolve all movements
        moving = {}
        for move in self.active_moves:
            tick_delta = self.current_tick - move.starting_tick
            movements = tick_delta / self.move_ticks
            if movements >= len(move.move_seq):
                continue

            piece = move.piece
            moving[piece.id] = move
            new_row, new_col = move.move_seq[movements][0], move.move_seq[movements][1]

            if self.debug and (piece.row != new_row or piece.col != new_col):
                print '%s to %s %s' % (piece, new_row, new_col)

            piece.row, piece.col = new_row, new_col

            # promote pawn to queen
            if piece.type == 'P' and ((piece.player == 1 and piece.row == 0) or (piece.player == 2 and piece.row == 7)):
                piece.type = 'Q'
                updates.append({
                    'type': 'promotion',
                    'piece': piece.to_json_obj(),
                })

        # resolve all captures
        for move in self.active_moves:
            if move.piece.captured:
                continue

            tick_delta = self.current_tick - move.starting_tick
            movements = tick_delta / self.move_ticks
            if movements >= len(move.move_seq):
                continue

            piece = move.piece
            row, col = self._get_interp_position(move, self.current_tick)

            # check each other piece
            for p in self.board.pieces:
                if p.player == piece.player or p.captured:
                    continue

                other_move = moving.get(p.id)
                if other_move is not None:
                    other_row, other_col = self._get_interp_position(other_move, self.current_tick)
                    if other_row < 0 or other_col < 0:
                        continue
                else:
                    other_row, other_col = p.row, p.col

                # threshold for considering capture (half square diagonal is max distance)
                dist = math.hypot(row - other_row, col - other_col)
                if dist > 0.71:
                    continue

                # knights can only capture at the end of their move
                if piece.type == 'N':
                    interp = float(self.current_tick - move.starting_tick) / (2 * self.move_ticks)
                    if interp < 0.85:
                        continue

                # if the other piece is static and we're close enough, capture it
                if other_move is None:
                    if dist < 0.4001:
                        if piece.type == 'P' and move.move_seq[0][1] == move.move_seq[-1][1]:
                            piece.captured = True
                            self.last_capture_tick = self.current_tick
                            updates.append({
                                'type': 'capture',
                                'piece': p.to_json_obj(),
                                'target': piece.to_json_obj(),
                            })
                        else:
                            p.captured = True
                            self.last_capture_tick = self.current_tick
                            updates.append({
                                'type': 'capture',
                                'piece': piece.to_json_obj(),
                                'target': p.to_json_obj(),
                            })

                        break

                    continue

                # check distance after a half-tick
                n_row, n_col = self._get_interp_position(move, self.current_tick + 0.5)
                n_dist = math.hypot(n_row - other_row, n_col - other_col)

                # check other distince after a half-tick
                n_other_row, n_other_col = self._get_interp_position(other_move, self.current_tick + 0.5)
                n_other_dist = math.hypot(row - n_other_row, col - n_other_col)

                # one of these has to be within the true capture threshold to consider a capture
                if min(dist, n_dist, n_other_dist) > 0.4001:
                    continue

                # pawns not moving diagonally cannot capture, so they always get captured on collision
                if piece.type == 'P' and move.move_seq[0][1] == move.move_seq[-1][1]:
                    if (
                        other_move.piece.type != 'P' or
                        other_move.move_seq[0][1] != other_move.move_seq[-1][1] or
                        other_move.starting_tick < move.starting_tick
                    ):
                        piece.captured = True
                        self.last_capture_tick = self.current_tick
                        updates.append({
                            'type': 'capture',
                            'piece': p.to_json_obj(),
                            'target': piece.to_json_obj(),
                        })

                        break

                    continue

                captured = False
                if n_dist < dist and n_other_dist > dist:
                    # piece is moving closer, other piece is moving away
                    captured = True
                elif n_dist > dist and n_other_dist < dist:
                    # other_piece captures, let that piece trigger it
                    pass
                else:
                    # both are moving away or moving closer, the earlier moving piece wins
                    if move.starting_tick <= other_move.starting_tick:
                        captured = True

                if captured:
                    self.last_capture_tick = self.current_tick
                    other_move.piece.captured = True
                    updates.append({
                        'type': 'capture',
                        'piece': piece.to_json_obj(),
                        'target': p.to_json_obj(),
                    })

                    break

        # remove moves that have ended
        new_active_moves = []
        new_cooldowns = []
        for move in self.active_moves:
            if move.piece.captured:
                continue

            tick_delta = self.current_tick - move.starting_tick
            if tick_delta >= self.move_ticks * (len(move.move_seq) - 1):
                if self.debug:
                    print '%s going on cooldown' % move.piece

                new_cooldowns.append(Cooldown(move.piece, self.current_tick))
                updates.append({
                    'type': 'startcooldown',
                    'piece': move.piece.to_json_obj(),
                })
            else:
                new_active_moves.append(move)

        # remove cooldowns that have ended
        for cooldown in self.cooldowns:
            if cooldown.piece.captured:
                continue

            tick_delta = self.current_tick - cooldown.starting_tick
            if tick_delta < self.cooldown_ticks:
                new_cooldowns.append(cooldown)
            else:
                if self.debug:
                    print '%s going off cooldown' % cooldown.piece

                updates.append({
                    'type': 'endcooldown',
                    'piece': cooldown.piece.to_json_obj(),
                })

        # set new active moves and cooldowns
        self.active_moves = new_active_moves
        self.cooldowns = new_cooldowns

        for p in self.board.pieces:
            # someone's king has been captured, so the game is over
            if p.type == 'K' and p.captured:
                self.finished = 1 if p.player == 2 else 2
                return self.finished, updates

        # too long without a capture or player move, consider it a draw
        if (
            (
                not self.is_campaign and
                self.current_tick >= Game.MIN_DRAW_TICKS[self.speed.value] and
                self.current_tick - self.last_capture_tick > Game.DRAW_LIMITS[self.speed.value]
            ) or
            (
                self.is_campaign and
                time.time() - self.last_move_time >= Game.NO_MOVE_TIMEOUT
            )
        ):
            self.finished = -1
            return -1, updates

        return 0, updates

    def _get_interp_position(self, move, current_tick):
        total_move_ticks = self.move_ticks * (len(move.move_seq) - 1)
        tick_delta = current_tick - move.starting_tick
        if move.piece.type == 'N' and tick_delta < total_move_ticks - self.move_ticks / 2:
            return -1, -1

        movements = int(tick_delta) / self.move_ticks
        if movements >= len(move.move_seq):
            movements = len(move.move_seq) - 1

        row1, col1 = move.move_seq[movements][0], move.move_seq[movements][1]
        if movements >= len(move.move_seq) - 1:
            row2, col2 = row1, col1
        else:
            row2, col2 = move.move_seq[movements + 1][0], move.move_seq[movements + 1][1]

        weight1 = 1 - float(tick_delta % self.move_ticks) / self.move_ticks
        row, col = row1 * weight1 + row2 * (1 - weight1), col1 * weight1 + col2 * (1 - weight1)
        return row, col

    def mark_ready(self, player):
        self.players_ready[player] = True
        if all(self.players_ready.values()):
            self.started = True
            self.last_move_time = time.time()
            self.last_tick_time = time.time()

    def to_json_obj(self):
        return {
            'speed': self.speed.value,
            'players': self.players,
            'numPlayers': self.num_players,
            'board': self.board.to_json_obj(),
            'isCampaign': self.is_campaign,

            'moveTicks': self.move_ticks,
            'cooldownTicks': self.cooldown_ticks,
            'playersReady': self.players_ready,

            'activeMoves': [move.to_json_obj() for move in self.active_moves],
            'cooldowns': [cooldown.to_json_obj() for cooldown in self.cooldowns],
            'moveLog': [move.to_json_obj() for move in self.move_log],
            'currentTick': self.current_tick,
            'timeSinceLastTick': time.time() - self.last_tick_time,
            'started': self.started,
            'finished': self.finished,
            'startTime': str(self.start_time),
        }


class GameState(object):

    def __init__(self, game_id, game, player_keys, bots, replay=None, level=None):
        self.game_id = game_id
        self.game = game
        self.player_keys = player_keys
        self.bots = bots
        self.replay = replay
        self.level = level
