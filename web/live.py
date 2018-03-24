import datetime
import json

from flask import Blueprint, request

from db import db_service


live = Blueprint('live', __name__)


@live.route('/api/live', methods=['GET'])
def live_index():
    active_games = db_service.get_all_active_games()

    ten_minutes_ago = datetime.datetime.utcnow() - datetime.timedelta(minutes=10)
    online_users = db_service.get_users_online_since(ten_minutes_ago)

    return json.dumps({
        'games': [
            g.to_json_obj() for g in active_games
        ],
        'users': {
            user_id: user.to_json_obj()
            for user_id, user in online_users.iteritems()
        }
    })
