#!/bin/bash

./deploy/buildui.sh
./deploy/buildpy.sh
cp favicon.ico /var/www/kfchess/
