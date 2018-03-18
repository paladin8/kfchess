import json
import random
import requests
import string
import traceback
import uuid

from flask import Blueprint, abort, request, redirect, session, url_for
from flask_login import current_user, login_user, logout_user
from flask_oauth import OAuth
from sqlalchemy.exc import IntegrityError

import config
from db import db_service, s3


ANIMALS = ['Tiger', 'Leopard', 'Crane', 'Snake', 'Dragon']
CHESS_PIECES = ['Pawn', 'Knight', 'Bishop', 'Rook', 'Queen', 'King']

PROFILE_PIC_SIZE_LIMIT = 1024 * 64;

oauth = OAuth()
google = oauth.remote_app(
    'google',
    base_url='https://www.google.com/accounts/',
    authorize_url='https://accounts.google.com/o/oauth2/auth',
    request_token_url=None,
    request_token_params={
        'scope': 'email',
        'response_type': 'code'
    },
    access_token_url='https://accounts.google.com/o/oauth2/token',
    access_token_method='POST',
    access_token_params={'grant_type': 'authorization_code'},
    consumer_key=config.GOOGLE_CLIENT_ID,
    consumer_secret=config.GOOGLE_CLIENT_SECRET
)

user = Blueprint('user', __name__)


@user.route('/login', methods=['GET'])
def login():
    print 'login'

    if current_user.is_authenticated:
        return redirect(url_for('index'))

    callback = url_for('user.authorized', _external=True)
    return google.authorize(callback=callback)


@user.route('/api/user/oauth2callback', methods=['GET'])
@google.authorized_handler
def authorized(data):
    if current_user.is_authenticated:
        return redirect(url_for('index'))

    # store access token in the session
    access_token = data['access_token']
    session['access_token'] = access_token, ''

    # get user's email from google
    headers = {'Authorization': 'OAuth ' + access_token}
    response = requests.get('https://www.googleapis.com/plus/v1/people/me', headers=headers)
    if response.status_code == 200:
        user_data = response.json()

        email = [e for e in user_data['emails'] if e['type'] == 'account'][0]['value']
        user = db_service.get_user_by_email(email)
        if user is None:
            # create user with random username
            username = random_username()
            while db_service.get_user_by_username(username) is not None:
                username = random_username()

            user = db_service.create_user(email, username, None, {})

        login_user(user)
    else:
        print 'error getting google info', response.status_code, response.text

    return redirect(url_for('index'))


@user.route('/logout', methods=['POST'])
def logout():
    print 'logout', current_user

    logout_user()

    csrf_token = generate_csrf_token()

    return json.dumps({
        'loggedIn': False,
        'csrfToken': csrf_token,
    })


@user.route('/api/user/info', methods=['GET'])
def info():
    user_ids = request.args.getlist('userId')
    print 'user info', user_ids

    if not user_ids:
        csrf_token = generate_csrf_token()

        # look up my info
        if not current_user.is_authenticated:
            return json.dumps({
                'loggedIn': False,
                'csrfToken': csrf_token,
            })

        return json.dumps({
            'loggedIn': True,
            'csrfToken': csrf_token,
            'user': current_user.to_json_obj(),
        });

    # look up other user info
    response = {}
    for user_id in user_ids:
        user = db_service.get_user_by_id(user_id)
        response[user_id] = user.to_json_obj()
    return json.dumps(response)


@user.route('/api/user/update', methods=['POST'])
def update():
    data = json.loads(request.data)
    print 'user update', data

    if not current_user.is_authenticated:
        return json.dumps({
            'success': False,
            'message': 'User is not logged in.',
        })

    user_id = current_user.user_id
    user = db_service.get_user_by_id(user_id)
    if user is None:
        return json.dumps({
            'success': False,
            'message': 'User does not exist.',
        })

    user.username = data.get('username', user.username)

    if len(user.username) < 3:
        return json.dumps({
            'success': False,
            'message': 'Username too short.',
        })
    elif len(user.username) > 24:
        return json.dumps({
            'success': False,
            'message': 'Username too long.',
        })

    try:
        user = db_service.update_user(user_id, user.username, user.picture_url)
        response = {
            'success': True,
            'user': user.to_json_obj(),
        }
    except IntegrityError:
        response = {
            'success': False,
            'message': 'Username already taken.',
        }

    return json.dumps(response)


@user.route('/api/user/uploadPic', methods=['POST'])
def upload_pic():
    file_bytes = request.data
    print 'upload pic', len(file_bytes)

    if not current_user.is_authenticated:
        return json.dumps({
            'success': False,
            'message': 'User is not logged in.',
        })

    user_id = current_user.user_id
    user = db_service.get_user_by_id(user_id)
    if user is None:
        return json.dumps({
            'success': False,
            'message': 'User does not exist.',
        })

    if len(file_bytes) > PROFILE_PIC_SIZE_LIMIT:
        return json.dumps({
            'success': False,
            'message': 'File is too large (max size 64KB).',
        })

    try:
        key = 'profile-pics/' + str(uuid.uuid4())
        s3.upload_data('com-kfchess-public', key, file_bytes, ACL='public-read')
        url = s3.get_public_url('com-kfchess-public', key)
        print 's3 upload', key, url

        user = db_service.update_user(user_id, user.username, url)
        response = {
            'success': True,
            'user': user.to_json_obj(),
        }
    except:
        traceback.print_exc()
        response = {
            'success': False,
            'message': 'Failed to upload profile picture.',
        }

    return json.dumps(response)


def random_username():
    return random.choice(ANIMALS) + ' ' + random.choice(CHESS_PIECES) + ' ' + str(random.randint(100, 999))


def generate_csrf_token():
    if '_csrf_token' not in session:
        session['_csrf_token'] = ''.join(random.choice(string.ascii_uppercase + string.digits) for i in xrange(24))
    return session['_csrf_token']
