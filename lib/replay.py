import collections


class ReplayMove(object):

    def __init__(self, piece_id, player, row, col, tick):
        self.piece_id = piece_id
        self.player = player
        self.row = row
        self.col = col
        self.tick = tick

    def to_json_obj(self):
        return {
            'pieceId': self.piece_id,
            'player': self.player,
            'row': self.row,
            'col': self.col,
            'tick': self.tick,
        }

    @staticmethod
    def from_json_obj(json):
        return ReplayMove(json['pieceId'], json['player'], json['row'], json['col'], json['tick'])


class Replay(object):

    def __init__(self, speed, players, moves, ticks):
        self.speed = speed
        self.players = players
        self.moves = moves
        self.ticks = ticks

        self.moves_by_tick = collections.defaultdict(list)
        for move in moves:
            self.moves_by_tick[move.tick].append(move)

    def to_json_obj(self):
        return {
            'speed': self.speed,
            'players': self.players,
            'moves': [move.to_json_obj() for move in self.moves],
            'ticks': self.ticks,
        }

    @staticmethod
    def from_json_obj(json):
        players = {int(k): v for k, v in json['players'].iteritems()}
        moves = [ReplayMove.from_json_obj(json_move) for json_move in json['moves']]
        return Replay(json['speed'], players, moves, json['ticks'])

    @staticmethod
    def from_game(game):
        moves = []
        for move in game.move_log:
            row, col = move.move_seq[-1]
            moves.append(ReplayMove(move.piece.id, move.piece.player, row, col, move.starting_tick))
        return Replay(game.speed.value, game.players, moves, game.current_tick)
