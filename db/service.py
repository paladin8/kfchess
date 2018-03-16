import json

from sqlalchemy.engine import create_engine

from db.user import User


class DbService(object):

    def __init__(self, host):
        self.engine = create_engine(host)

    # user functions

    def get_user_by_id(self, user_id):
        with self.engine.connect() as conn:
            row = conn.execute(
                "SELECT id, email, username, picture_url, ratings, join_time "
                "FROM users "
                "WHERE id = %s",
                int(user_id)
            ).fetchone()
            return row and User.from_row(row)

    def get_user_by_email(self, email):
        with self.engine.connect() as conn:
            row = conn.execute(
                "SELECT id, email, username, picture_url, ratings, join_time "
                "FROM users "
                "WHERE email = %s",
                email
            ).fetchone()
            return row and User.from_row(row)

    def get_user_by_username(self, username):
        with self.engine.connect() as conn:
            row = conn.execute(
                "SELECT id, email, username, picture_url, ratings, join_time "
                "FROM users "
                "WHERE username = %s",
                username
            ).fetchone()
            return row and User.from_row(row)

    def create_user(self, email, username, picture_url, ratings):
        with self.engine.connect() as conn:
            conn.execute(
                "INSERT INTO users (email, username, picture_url, ratings, join_time) "
                "VALUES (%s, %s, %s, %s, NOW() AT TIME ZONE 'UTC')",
                email, username, picture_url, json.dumps(ratings)
            )

        return self.get_user_by_email(email)

    def update_user(self, user_id, username, picture_url):
        with self.engine.connect() as conn:
            conn.execute(
                "UPDATE users "
                "SET username = %s, picture_url = %s "
                "WHERE id = %s",
                username, picture_url, user_id
            )

        return self.get_user_by_id(user_id)
