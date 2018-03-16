class User(object):

    def __init__(self, user_id, email, username, picture_url, ratings, join_time):
        self.user_id = user_id
        self.email = email
        self.username = username
        self.picture_url = picture_url
        self.ratings = ratings
        self.join_time = join_time

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
        }

    @staticmethod
    def from_row(row):
        return User(row.id, row.email, row.username, row.picture_url, row.ratings, row.join_time)
