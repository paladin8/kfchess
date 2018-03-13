import collections
import random

from lib.game import Game


KNIGHT_DIRS = [
    (2, 1),
    (2, -1),
    (1, -2),
    (-1, -2),
    (-2, -1),
    (-2, 1),
    (-1, 2),
    (1, 2),
]
BISHOP_DIRS = [
    (1, 1),
    (1, -1),
    (-1, -1),
    (-1, 1),
]
ROOK_DIRS = [
    (1, 0),
    (0, -1),
    (-1, 0),
    (0, 1),
]

PIECE_SCORES = {
    'P': 1,
    'N': 3,
    'B': 3,
    'R': 5,
    'Q': 9,
    'K': 100,
}


def get_bot(difficulty):
    if difficulty == 'novice':
        return BasicBot(45, 10)
    elif difficulty == 'intermediate':
        return BasicBot(30, 3)
    elif difficulty == 'advanced':
        return BasicBot(15, 1)
    else:
        raise ValueError('Unexpected difficulty ' + difficulty)


class BasicBot(object):

    def __init__(self, ticks_per_move, top_n_moves):
        self.ticks_per_move = ticks_per_move
        self.top_n_moves = top_n_moves

    def get_move(self, game, player):
        # moves approx every ticks_per_move (with randomness)
        if game.current_tick % self.ticks_per_move != random.randint(0, self.ticks_per_move - 1):
            return None

        # precompute location -> piece map for performance
        location_to_piece_map = game.board.get_location_to_piece_map()

        # precompute current pressures
        current_pressures = collections.defaultdict(list)
        for p1 in game.board.pieces:
            for p2 in game.board.pieces:
                if p1.player == p2.player:
                    continue

                if self._can_target(location_to_piece_map, p2, p1.row, p1.col):
                    current_pressures[p1.id].append(p2)

        # get all possible moves with scores
        all_moves = []
        for piece in game.board.pieces:
            if (
                piece.captured or piece.player != player or
                game._already_moving(piece) or game._on_cooldown(piece)
            ):
                continue

            piece_moves = self._get_possible_moves(game, piece)
            for move in piece_moves:
                score = self._get_score(game, current_pressures, location_to_piece_map, move)
                if score > 0:
                    all_moves.append((move, score))

        if len(all_moves) == 0:
            return None

        # sorts all moves by score and picks a random one from the top_n_moves
        all_moves.sort(key=lambda p: p[1], reverse=True)
        return random.choice(all_moves[:self.top_n_moves])[0]

    def _get_possible_moves(self, game, piece):
        moves = []

        if piece.type == 'P':
            row_dir = -1 if piece.player == 1 else 1
            row = piece.row + row_dir
            for col in [piece.col - 1, piece.col, piece.col + 1]:
                if (
                    row >= 0 and row < 8 and col >= 0 and col < 8 and
                    game._get_pawn_move_seq(piece, row, col) is not None
                ):
                    moves.append((piece, row, col))

            if (
                (piece.player == 1 and piece.row == 6) or
                (piece.player == 2 and piece.row == 1)
            ):
                row = piece.row + 2 * row_dir
                if row >= 0 and row < 8 and game._get_pawn_move_seq(piece, row, piece.col) is not None:
                    moves.append((piece, row, piece.col))

        if piece.type == 'N':
            for row_dir, col_dir in KNIGHT_DIRS:
                row, col = piece.row + row_dir, piece.col + col_dir
                if (
                    row >= 0 and row < 8 and col >= 0 and col < 8 and
                    game._get_knight_move_seq(piece, row, col) is not None
                ):
                    moves.append((piece, row, col))

        if piece.type in ['B', 'Q', 'K']:
            for row_dir, col_dir in BISHOP_DIRS:
                limit = 1 if piece.type == 'K' else 8
                for i in xrange(1, limit + 1):
                    row, col = piece.row + i * row_dir, piece.col + i * col_dir
                    if (
                        row >= 0 and row < 8 and col >= 0 and col < 8 and
                        game._get_bishop_move_seq(piece, row, col) is not None
                    ):
                        moves.append((piece, row, col))
                    else:
                        break

        if piece.type in ['R', 'Q', 'K']:
            for row_dir, col_dir in ROOK_DIRS:
                limit = 1 if piece.type == 'K' else 8
                for i in xrange(1, limit + 1):
                    row, col = piece.row + i * row_dir, piece.col + i * col_dir
                    if (
                        row >= 0 and row < 8 and col >= 0 and col < 8 and
                        game._get_rook_move_seq(piece, row, col) is not None
                    ):
                        moves.append((piece, row, col))
                    else:
                        break

        return moves

    def _get_score(self, game, current_pressures, location_to_piece_map, move):
        piece, row, col = move
        new_piece = piece.at_position(row, col)

        # moving forward is good
        row_score = piece.row - row if piece.player == 1 else row - piece.row
        if piece.type == 'P':
            row_score *= 2

        # moving toward the center is good
        col_score = abs(3.5 - piece.col) - abs(3.5 - col)

        capture_score, pressure_score, vuln_score, protect_score = 0, 0, 0, 0
        for p in game.board.pieces:
            if p.captured or p.id == piece.id:
                continue

            # capture score
            if (
                p.row == row and p.col == col and
                p.player != piece.player and not game._already_moving(p)
            ):
                capture_score += PIECE_SCORES[p.type]

                # capturing improves vulnerable score for other pieces
                for p2 in game.board.pieces:
                    if p2.captured or p2.player == p.player:
                        continue

                    if p in current_pressures[p2.id]:
                        vuln_score += PIECE_SCORES[p2.type]

            # pressure score
            if p.player != piece.player:
                old_pressure = p in current_pressures[piece.id]
                new_pressure = self._can_target(location_to_piece_map, new_piece, p.row, p.col)
                pressure_score += (new_pressure - old_pressure) * PIECE_SCORES[p.type]

            # vulnerable score
            if p.player != piece.player:
                old_vuln = piece in current_pressures[p.id]
                new_vuln = self._can_target(location_to_piece_map, p, row, col)
                vuln_score -= (new_vuln - old_vuln) * PIECE_SCORES[piece.type]

            # protect score
            if p.player == piece.player:
                protect = p in current_pressures[piece.id]
                new_protect = self._can_target(location_to_piece_map, new_piece, p.row, p.col)

                protect_value = 0
                if len(current_pressures[p.id]) > 0:
                    protect_value = min(PIECE_SCORES[p2.type] for p2 in current_pressures[p.id]) - PIECE_SCORES[p.type]
                protect_score += (new_protect - protect) * protect_value

        # print piece, row, col, row_score, col_score, capture_score, pressure_score, vuln_score, protect_score
        return 2 * row_score + col_score + 16 * capture_score + 8 * pressure_score + 12 * vuln_score + 4 * protect_score

    def _can_target(self, location_to_piece_map, piece, t_row, t_col):
        if t_row == piece.row and t_col == piece.col:
            return False

        if piece.type == 'P':
            row_dir = -1 if piece.player == 1 else 1
            row = piece.row + row_dir
            return row == t_row and (piece.col == t_col - 1 or piece.col == t_col + 1)

        if piece.type == 'N':
            row_delta, col_delta = t_row - piece.row, t_col - piece.col
            return (row_delta, col_delta) in KNIGHT_DIRS

        if piece.type in ['B', 'Q', 'K']:
            row_delta, col_delta = t_row - piece.row, t_col - piece.col
            if abs(row_delta) == abs(col_delta):
                row_dir, col_dir = row_delta / abs(row_delta), col_delta / abs(col_delta)
                limit = 1 if piece.type == 'K' else 8
                for i in xrange(1, limit + 1):
                    row, col = piece.row + i * row_dir, piece.col + i * col_dir
                    if row == t_row and col == t_col:
                        return True

                    if (row, col) in location_to_piece_map:
                        break

        if piece.type in ['R', 'Q', 'K']:
            row_delta, col_delta = t_row - piece.row, t_col - piece.col
            if row_delta == 0 or col_delta == 0:
                row_dir = row_delta / abs(row_delta) if row_delta != 0 else 0
                col_dir = col_delta / abs(col_delta) if col_delta != 0 else 0
                limit = 1 if piece.type == 'K' else 8
                for i in xrange(1, limit + 1):
                    row, col = piece.row + i * row_dir, piece.col + i * col_dir
                    if row == t_row and col == t_col:
                        return True

                    if (row, col) in location_to_piece_map:
                        break

        return False


if __name__ == '__main__':
    import yappi
    yappi.set_clock_type('wall')
    yappi.start()

    bot = get_bot('novice')
    game = Game(10, 10)
    for i in xrange(1000):
        if game.finished:
            break

        move = bot.get_move(game, 1)
        if move:
            piece, row, col = move
            game.move(piece.id, piece.player, row, col)

        move = bot.get_move(game, 2)
        if move:
            piece, row, col = move
            game.move(piece.id, piece.player, row, col)

        game.tick()

    yappi.stop()
    yappi.get_func_stats().print_all()
