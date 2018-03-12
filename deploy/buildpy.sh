#!/bin/bash

./env/bin/pip install -r requirements.txt
sudo supervisorctl reload
