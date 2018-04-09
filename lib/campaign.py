from lib.board import Board
from lib.game import Speed


class CampaignLevel(object):

    def __init__(self, speed, board):
        self.speed = speed
        self.board = board


LEVELS = [
    # white belt

    CampaignLevel(
        Speed.STANDARD,
        '''
            00000000K2000000
            0000000000000000
            0000000000000000
            0000000000000000
            0000000000000000
            0000000000000000
            P1P1P1P1P1P1P1P1
            R1N1B1Q1K1B1N1R1
        '''
    ),

    CampaignLevel(
        Speed.STANDARD,
        '''
            00000000K2000000
            0000000000000000
            0000000000000000
            0000000000000000
            0000000000000000
            0000000000000000
            0000000000000000
            R10000Q1K10000R1
        '''
    ),

    # yellow belt
]


def get_level(level):
    return LEVELS[level]
