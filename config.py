import os
from dotenv import load_dotenv

load_dotenv()


def _require(name: str) -> str:
    val = os.getenv(name)
    if not val:
        raise RuntimeError(
            f"Missing required environment variable {name}. "
            f"Copy .env.example to .env and fill it in."
        )
    return val


OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
COHERE_API_KEY = os.getenv("COHERE_API_KEY", "")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")  # one shared key, used when a vendor has no key of its own
# Optional separate OpenRouter keys per vendor, so Claude and Llama can be billed and limited apart.
_OPENROUTER_VENDOR_KEYS = {
    "anthropic": os.getenv("OPENROUTER_API_KEY_CLAUDE", ""),
    "meta-llama": os.getenv("OPENROUTER_API_KEY_LLAMA", ""),
}
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "")
FRED_API_KEY = os.getenv("FRED_API_KEY", "")

DEBATER_A_MODEL = os.getenv("DEBATER_A_MODEL", "openrouter/meta-llama/llama-3.3-70b-instruct")
DEBATER_B_MODEL = os.getenv("DEBATER_B_MODEL", "ministral-3b-latest")
JUDGE_MODEL = os.getenv("JUDGE_MODEL", "gpt-4.1-mini")

FREEZE_DATA_FOR_BACKTEST = os.getenv("FREEZE_DATA_FOR_BACKTEST", "false").lower() == "true"

CACHE_DIR = os.path.join(os.path.dirname(__file__), "data", "cache")
os.makedirs(CACHE_DIR, exist_ok=True)


LLM_TIMEOUT = 90  # seconds per call; a stuck provider fails fast instead of hanging the debate


def invoke_structured(llm, schema, prompt, attempts: int = 3):
    """Structured-output call with retries. Small models sometimes return a
    reply that fails validation or a call that times out; a fresh attempt
    nearly always succeeds, so only raise after all attempts fail."""
    import logging
    last = None
    for i in range(attempts):
        try:
            return llm.with_structured_output(schema).invoke(prompt)
        except Exception as e:
            last = e
            logging.getLogger("stockduel").warning("Structured call failed (attempt %d/%d): %s", i + 1, attempts, e)
    raise last


def get_debater_llm(model_name: str, temperature: float = 0.0, max_tokens: int = 2048):
    """Returns a chat model instance for the given model name, picking the
    right LangChain provider by name prefix.

    temperature=0.0: debaters used to run at 0.4 (some deliberate
    randomness in phrasing/emphasis), which is why the same cached data
    could still produce a different winner between runs — proven via the
    consistency backtest. Set to 0 to match the judge and make results as
    repeatable as the underlying data allows.

    max_tokens is deliberately capped and NOT left at provider defaults.
    Combined with schema fields that ask for terse text, this keeps a hard
    worst-case bound on every call's output cost regardless of how verbose
    a model tries to be.

    2048, not lower: Round 2 (argument + up to ~9 claims + rebuttals) hit
    a 1536 cap mid-generation in practice — OpenAI's structured-output
    parser hard-fails on a truncated response (LengthFinishReasonError)
    rather than returning partial JSON, so this needs real headroom, not
    just the theoretical minimum for a "typical" response.
    """
    if model_name.startswith("gpt") or model_name.startswith("o1") or model_name.startswith("o3"):
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model=model_name, temperature=temperature, max_tokens=max_tokens, api_key=OPENAI_API_KEY or None, timeout=LLM_TIMEOUT, max_retries=2)
    if model_name.startswith("openrouter/"):
        # OpenRouter reaches many providers (Claude, Llama, ...) with one key. Write the model as "openrouter/<vendor>/<model>".
        from langchain_openai import ChatOpenAI
        model_id = model_name.split("/", 1)[1]
        # Ask for the fastest provider. Claude on OpenRouter "thinks" before it answers and the thinking uses up
        # max_tokens, which can leave the answer empty, so thinking is switched off for it.
        extra = {"provider": {"sort": "throughput"}}
        if model_id.startswith("meta-llama/"):
            # A debate prompt is about 6,500 tokens in and 2,048 out, and the reply must follow a strict JSON schema.
            # Only these hosts handled that in testing. SambaNova (4,096-token limit), Novita and Cloudflare (small
            # windows) rejected it, Groq cannot do the strict schema, and OpenRouter's "ignore" list did not stop
            # SambaNova, so the safe hosts are named with "only" instead.
            extra["provider"]["only"] = ["deepinfra", "parasail", "akashml"]
            # Llama writes more claims than the other models and was cut off at 2,048 tokens (a cut-off reply cannot
            # be parsed). It is paid per token actually written, so a higher cap costs nothing extra.
            max_tokens = max(max_tokens, 4096)
        if model_id.startswith("anthropic/"):
            extra["reasoning"] = {"enabled": False}
        return ChatOpenAI(model=model_id, temperature=temperature, max_tokens=max_tokens, api_key=_OPENROUTER_VENDOR_KEYS.get(model_id.split("/")[0]) or OPENROUTER_API_KEY or None, base_url="https://openrouter.ai/api/v1", timeout=LLM_TIMEOUT, max_retries=2, extra_body=extra)
    if model_name.startswith("gemini"):
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(model=model_name, temperature=temperature, max_output_tokens=max(max_tokens, 4096), google_api_key=GEMINI_API_KEY or None, timeout=LLM_TIMEOUT, max_retries=2)
    if model_name.startswith("command"):
        from langchain_cohere import ChatCohere
        return ChatCohere(model=model_name, temperature=temperature, max_tokens=max_tokens, cohere_api_key=COHERE_API_KEY or None, timeout=LLM_TIMEOUT)
    if model_name.startswith("mistral") or model_name.startswith("ministral") or model_name.startswith("open-mistral") or model_name.startswith("open-mixtral"):
        from langchain_mistralai import ChatMistralAI
        return ChatMistralAI(model=model_name, temperature=temperature, max_tokens=max_tokens, api_key=MISTRAL_API_KEY or None, timeout=LLM_TIMEOUT, max_retries=2)
    raise ValueError(f"Unrecognized model name '{model_name}' — expected a gpt-*, command-*, or mistral-* id.")


def get_judge_llm(temperature: float = 0.0, max_tokens: int = 2048):
    # Judge is deterministic-leaning: low temperature for consistent
    # fact-checking/scoring. Slightly higher ceiling than debaters since a
    # fact-check response covers 20-30 claims in one structured object.
    return get_debater_llm(JUDGE_MODEL, temperature=temperature, max_tokens=max_tokens)
