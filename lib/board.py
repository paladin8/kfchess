import uuid


class Piece(object):

    PAWN = 'P'
    KNIGHT = 'N'
    BISHOP = 'B'
    ROOK = 'R'
    QUEEN = 'Q'
    KING = 'K'
    ALL_TYPES = [PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING]

    def __init__(self, type, player, row, col, captured=False, id=None):
        if type not in Piece.ALL_TYPES:
            raise ValueError('Invalid piece type: ' + type)

        self.type = type
        self.player = player
        self.row = row
        self.col = col
        self.captured = captured
        self.id = id or str(uuid.uuid4())

    def at_position(self, row, col):
        return Piece(self.type, self.player, row, col, captured=self.captured, id=self.id)

    def to_json_obj(self):
        return {
            'type': self.type,
            'player': self.player,
            'row': self.row,
            'col': self.col,
            'captured': self.captured,
            'id': self.id,
        }

    def __str__(self):
        return self.type + str(self.player)

    def __repr__(self):
        return self.__str__()

    @staticmethod
    def from_str(s, row, col):
        return Piece(s[0], int(s[1]), row, col)


class Board(object):

    INITIAL_BOARD = '''R2N2B2Q2K2B2N2R2
P2P2P2P2P2P2P2P2
0000000000000000
0000000000000000
0000000000000000
0000000000000000
P1P1P1P1P1P1P1P1
R1N1B1Q1K1B1N1R1'''

    def __init__(self, pieces):
        self.pieces = pieces

    def get_piece_by_id(self, id):
        for p in self.pieces:
            if p.id == id:
                return p
        return None

    def get_piece_by_location(self, row, col):
        for p in self.pieces:
            if not p.captured and p.row == row and p.col == col:
                return p
        return None

    def get_location_to_piece_map(self):
        result = {}
        for p in self.pieces:
            if not p.captured:
                result[(p.row, p.col)] = p
        return result

    def to_json_obj(self):
        return {
            'pieces': [piece.to_json_obj() for piece in self.pieces],
        }

    def __str__(self):
        board = [[None for col in xrange(8)] for row in xrange(8)]
        for p in self.pieces:
            if p.row >= 0 and p.col >= 0:
                board[p.row][p.col] = p
        return '\n'.join(''.join(str(p) if p is not None else '00' for p in row) for row in board)

    @staticmethod
    def from_str(s):
        s = s.splitlines()
        pieces = []
        for row in xrange(8):
            for col in xrange(8):
                p = s[row][2*col:2*col+2]
                if p != '00':
                    pieces.append(Piece.from_str(p, row, col))
        return Board(pieces)

    @staticmethod
    def initial():
        return Board.from_str(Board.INITIAL_BOARD)
