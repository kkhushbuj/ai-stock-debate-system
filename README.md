# StockDuel — Multi-Agent Stock Debate & Verification System

Two independent LLM debaters argue for competing stocks using live-fetched
data across two rounds (pro case, then cross-attack rebuttal). A third,
separate LLM judge independently re-verifies every claim before scoring
both rounds against 10 weighted factors and producing a winner with a
confidence split — never a black-box single number.

Research angle: does adversarial multi-agent debate + independent
fact-verification produce more reliable, less-hallucinated investment
reasoning than one AI reasoning alone?

## Demo

**1. The home page** (full tour, 1080p)

[![StockDuel home page tour](docs/demo-home-page.gif)](docs/demo-home-page.mp4)

_Click the picture to open the full 1080p video._

**2. A live debate** (NVDA vs AMD, from picking the stocks to the verdict, 1080p)

[![StockDuel live debate](docs/demo-live-debate.gif)](docs/demo-live-debate.mp4)

_Click the picture to open the full 1080p video._

_A full live debate takes about 30 seconds._

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in your own API keys. Never commit `.env`.

| Key | Used for |
|---|---|
| `GEMINI_API_KEY` | Debater A (default model: `gemini-3.5-flash-lite`, Google Gemini; the free tier is enough for testing) |
| `OPENROUTER_API_KEY` | Optional: any `openrouter/<vendor>/<model>` model, for example `openrouter/meta-llama/llama-3.3-70b-instruct` |
| `COHERE_API_KEY` | Optional: any `command-*` model |
| `MISTRAL_API_KEY` | Debater B (default model: `ministral-3b-latest`) |
| `OPENAI_API_KEY` | Judge + chat assistant (default model: `gpt-4.1-mini`) |
| `TAVILY_API_KEY` | Live news search |
| `FRED_API_KEY` | Fed Funds Rate |

The models can be changed with `DEBATER_A_MODEL`, `DEBATER_B_MODEL` and
`JUDGE_MODEL` in `.env`. The provider is picked from the model name
(`gpt-*`, `gemini-*`, `openrouter/<vendor>/<model>`, `command-*`, `mistral-*` / `ministral-*`). Free or trial keys have
call limits, so a full debate (about 12 calls) can fail once a limit is hit.

## Run the website (React + Python API)

The site has two parts: a Python API (`api.py`, wraps the debate engine) and a
Next.js website (`frontend/`). Run each in its own terminal.

```bash
# Terminal 1: the API (from the project folder)
python -m uvicorn api:app --host 127.0.0.1 --port 8010

# Terminal 2: the website
cd frontend
npm install
echo API_URL=http://127.0.0.1:8010 > .env.local
echo NEXT_PUBLIC_API_URL=http://127.0.0.1:8010 >> .env.local
npm run dev
```

Open http://localhost:3000. Pick two stocks (search a company or type any
ticker) and click **Start the debate**. A full run makes about 12 live LLM calls plus
data calls and takes about 30 seconds. Unknown tickers are rejected with a friendly
message before any AI call is made.

## Live site

https://stockduel-kappa.vercel.app

A full debate takes about 30 seconds. It uses free or low-cost API keys with call
limits, so a debate can fail once a limit is used up.

## Deployment

The site runs in two parts, both on free plans:

- **Website** (`frontend/`): Vercel. Root directory is `frontend`. It needs two
  environment variables: `API_URL` and `NEXT_PUBLIC_API_URL`, both set to the
  API's HTTPS address. `NEXT_PUBLIC_API_URL` is baked in at build time, so
  redeploy after changing it.
- **API** (`api.py`): an Oracle Cloud Always Free VM (Ubuntu 22.04, 1 GB RAM plus
  2 GB swap). `uvicorn` runs as a `systemd` service on `127.0.0.1:8010`, and
  Caddy sits in front of it and gets a free HTTPS certificate for
  `<ip-with-dashes>.sslip.io`. The Caddy proxy has response buffering turned off so
  the live debate stream works. Ports 80 and 443 are opened in the VM's network
  security group and its own firewall.

API keys live only in a `.env` file on the VM (see `.env.example`). They are not
in this repository and not in Vercel.

Note: the cache and debate history are saved as local files in `data/` on the VM.
They survive restarts, but not if the VM is deleted.

## Run a debate from the CLI

```bash
python graph.py NVDA AMD
```

## Project structure

```
config.py        env/model loading, provider dispatch by model-name prefix
factors.py        the 10 locked, weighted scoring factors
schemas.py         Pydantic structured-output models (claims, scores, verdict)
state.py            LangGraph state schema
cache.py             TTL-tiered file cache + backtest freeze mode
tools/               yfinance / Tavily / FRED tools, each cache-wrapped
agents/debater.py    debater agents (Round 1 pro case, Round 2 attack)
agents/judge.py      judge: fact-check -> score R1 + R2 -> verdict (fails soft if the fact-check breaks)
graph.py              LangGraph wiring + CLI entrypoint
api.py                  FastAPI wrapper used by the website (no engine changes)
frontend/               Next.js website: landing, live debate, results, history, chat
chatbot.py              "Ask about this debate" assistant (answers only from the debate result)
history.py              saves finished debates per visitor session
ticker_lookup.py        S&P 500 ticker <-> company name lookup
tests/                  fast automated tests (no API keys needed)
backtests/            3 evaluation scripts (see below)
data/cache/             cached tool responses (gitignored)
```

## Tests

Fast automated tests for the parts that need no API keys or internet: scoring
math, winner and confidence split, claim matching, ticker lookup, cache, history
privacy, chatbot guard rules and the API endpoints.

```bash
pip install -r requirements-dev.txt
python -m pytest
```

## Backtests

All three freeze live data for the session (`FREEZE_DATA_FOR_BACKTEST=true`
is set automatically by each script) so results reflect the *reasoning's*
stability, not the market moving mid-test.

**1. Consistency check** — same pair, run N times, measure verdict variance:
```bash
python -m backtests.consistency_check NVDA AMD --runs 5
```

**2. Fair-fight (model-bias) check** — same pairs, debater models flipped,
checks whether the same stock or the same model keeps winning:
```bash
python -m backtests.fair_fight_check
python -m backtests.fair_fight_check --pairs NVDA:AMD MSFT:GOOGL
```

**3. Fact-check accuracy (lie-detector) check** — logs every claim + the
judge's verdict to JSON; you manually spot-check a sample against real
numbers, then score the judge's accuracy:
```bash
python -m backtests.factcheck_accuracy collect --pairs NVDA:AMD MSFT:GOOGL
# open the JSON, fill in manual_verdict: true/false for ~30-50 claims
python -m backtests.factcheck_accuracy score backtests/results/factcheck_claims_<ts>.json
```

Results are written to `backtests/results/*.json` (gitignored).

## Design notes

- **Scoring is deterministic.** The LLM judge only ever outputs 0-10
  per-factor sub-scores and narrative reasoning; the final weighted total,
  confidence split, and winner are computed in plain Python
  (`factors.blended_score`, `agents/judge.py:final_verdict_node`) — the
  LLM never outputs the probability/verdict number directly.
- **Claims are structured, not prose.** Every debater argument is
  extracted into a `DebaterArgument` (argument text + itemized `Claim`
  list with factor/statement/cited value/source), so the judge's
  fact-check stage has something machine-checkable to re-verify rather
  than parsing free text.
- **Round 2 cross-attack uses full opponent context**, not a summary — the
  graph passes the opponent's actual structured Round 1 argument
  (including its claims list) into the Round 2 prompt, and debaters are
  instructed to quote/paraphrase specific claims rather than argue
  generically.
- **Reply text is read with `.text`.** Some models return `.content` as a
  list of blocks instead of a plain string, so the code reads `.text` (a
  property) on AI messages to handle both cases safely.
- **Calls are retried.** `config.invoke_structured` retries a structured call
  up to 3 times, and every provider call has a 90 second timeout, so one flaky
  reply does not kill a whole debate.
- **Judge fact-check re-fetches data with plain Python, not an LLM tool
  loop.** Which tool a claim needs is fully determined by its `factor`
  field, so `agents/judge.py:_prefetch_verification_data` calls the tool
  functions directly (free) and the judge model only does the actual
  comparison/labeling in a single structured-output call — an agentic
  tool-calling loop here would mean one LLM round-trip per claim (could be
  20-30+ per debate) for zero benefit over just calling the right tool
  directly.
- **`Claim.factor` self-normalizes.** Cheap/small models don't always
  follow "use exactly this id" instructions — they'll echo a raw tool
  field name instead (e.g. `earnings_growth` instead of
  `earnings_guidance`). `schemas.py`'s `FactorId` type runs every factor
  value through a synonym/fuzzy normalizer before strict validation, so
  this doesn't hard-crash the run.

## License

MIT. See `LICENSE`.
