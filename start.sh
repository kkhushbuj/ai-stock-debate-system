#!/bin/bash
# Starts the Python API (inside the container) and the website (public port).
python -m uvicorn api:app --host 127.0.0.1 --port 8010 &
cd frontend && exec npx next start -p "${PORT:-7860}" -H 0.0.0.0
