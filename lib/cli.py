from lib.game import Game


def main():
    game = Game(1, 1, debug=True)
    status = Game.GAME_CONTINUES
    while status == Game.GAME_CONTINUES:
        print game.board
        try:
            input = raw_input('cmd: ')
            args = input.split(' ')
            if args[0] == 'T':
                ticks = int(args[1])
                for i in xrange(ticks):
                    status = game.tick()
                    if status != Game.GAME_CONTINUES:
                        break
            elif args[0] == 'M':
                from_row, from_col, to_row, to_col = int(args[1]), int(args[2]), int(args[3]), int(args[4])
                piece = game.board.get_piece_by_location(from_row, from_col)
                valid = game.move(piece.id, piece.player, to_row, to_col)
                if not valid:
                    print 'Invalid move!'
        except KeyboardInterrupt:
            break
        except Exception, e:
            print 'Error: ' + str(e)

    if status == Game.WHITE_WINS:
        print 'White wins!'
    else:
        print 'Black wins!'


if __name__ == '__main__':
    main()
