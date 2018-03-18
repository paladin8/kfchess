import json


class User(object):

    def __init__(self, user_id, email, username, picture_url, ratings, join_time, last_online, current_game):
        self.user_id = user_id
        self.email = email
        self.username = username
        self.picture_url = picture_url
        self.ratings = ratings
        self.join_time = join_time
        self.last_online = last_online
        self.current_game = current_game

        # for flask-login
        self.is_authenticated = True
        self.is_active = True
        self.is_anonymous = False

    # for flask-login
    def get_id(self):
        return unicode(self.user_id)

    def to_json_obj(self):
        return {
            'userId': str(self.user_id),
            'email': self.email,
            'username': self.username,
            'pictureUrl': self.picture_url,
            'ratings': self.ratings,
            'joinTime': str(self.join_time),
            'lastOnline': self.last_online and str(self.last_online),
            'currentGame': self.current_game,
        }

    def __str__(self):
        return json.dumps(self.to_json_obj())

    @staticmethod
    def from_row(row):
        return User(
            row.id,
            row.email,
            row.username,
            row.picture_url,
            row.ratings,
            row.join_time,
            row.last_online,
            row.current_game
        )


class UserGameHistory(object):

    def __init__(self, history_id, user_id, game_time, game_info):
        self.history_id = history_id
        self.user_id = user_id
        self.game_time = game_time
        self.game_info = game_info

    def to_json_obj(self):
        return {
            'historyId': self.history_id,
            'userId': str(self.user_id),
            'gameTime': str(self.game_time),
            'gameInfo': self.game_info,
        }

    @staticmethod
    def from_row(row):
        return UserGameHistory(row.id, row.user_id, row.game_time, row.game_info)
