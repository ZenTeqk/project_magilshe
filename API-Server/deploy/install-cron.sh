#!/usr/bin/env bash
# Installs the API's scheduled jobs in the deploy user's crontab. Safe to run
# on every deploy: any previous copy of each line is replaced, nothing else in
# the crontab is touched. The server clock is UTC, so 04:30 is 10:00 AM IST.
set -euo pipefail

APP_DIR="$HOME/api/cakery"
PYTHON="$HOME/api/venv/bin/python"
MARKER="send_occasion_reminders"
LINE="30 4 * * * cd $APP_DIR && /bin/bash -c 'set -a && . ./.env && set +a && exec $PYTHON manage.py $MARKER' >> $HOME/api/occasion-reminders.log 2>&1"

{ crontab -l 2>/dev/null | grep -v "$MARKER" || true; echo "$LINE"; } | crontab -
echo "Scheduled: occasion reminders daily at 10:00 AM IST"
