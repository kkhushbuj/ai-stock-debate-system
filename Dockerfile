# One container that runs both the Python API and the Next.js website.
# Made for a Hugging Face Docker Space (only one public port, 7860), but any Docker host works.
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face runs the container as user 1000
RUN useradd -m -u 1000 user || true
USER 1000
ENV HOME=/home/user PATH=/home/user/venv/bin:$PATH
WORKDIR /home/user/app

COPY --chown=1000 requirements.txt .
RUN python3 -m venv /home/user/venv && pip install --no-cache-dir -r requirements.txt

COPY --chown=1000 frontend/package*.json frontend/
RUN cd frontend && npm install

COPY --chown=1000 . .
# The browser talks to /api on the same address; Next forwards it to the Python API inside the container.
ENV API_URL=http://127.0.0.1:8010 NEXT_PUBLIC_API_URL=""
RUN cd frontend && npm run build && mkdir -p /home/user/app/data/cache

EXPOSE 7860
CMD ["bash", "start.sh"]
