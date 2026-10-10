Run the smoke test against the default nginx URL: `bash scripts/smoke.sh`.
Set `BASE_URL` or pass the API root URL as the first argument.
Set `WAIT` to change the health wait (default 30 seconds).
Set `LEGACY=0` to skip the legacy `/symptoms` check.
