import math


def update_ratings(ra, rb, winner):
    ea = 1.0 / (1 + math.pow(10, (rb - ra) / 400.0))
    eb = 1.0 / (1 + math.pow(10, (ra - rb) / 400.0))

    if winner <= 0:
        sa, sb = 0.5, 0.5
    elif winner == 1:
        sa, sb = 1, 0
    else:
        sa, sb = 0, 1

    k = 32
    nra = ra + k * (sa - ea)
    nrb = rb + k * (sb - eb)
    return int(round(nra)), int(round(nrb))
