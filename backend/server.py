"""
Ansdrop backend — FastAPI port of the Next.js API routes with an added
systemStatus (running/stopped) feature + Start/Reset admin controls.
"""
import os
import uuid
import random
import math
import logging
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, HTTPException, Request, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

# ---------- Config ----------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "ansdrop")
RAFFLE_INTERVAL_MS = int(os.environ.get("RAFFLE_INTERVAL_MS", "120000"))
DROP_MINT = os.environ.get(
    "DROP_MINT", "DRoP1111111111111111111111111111111111111111"
)
MIN_ELIGIBLE_HOLD = float(os.environ.get("DROP_MIN_ELIGIBLE", "50000"))
DROP_DECIMALS = int(os.environ.get("DROP_DECIMALS", "6"))
HELIUS_API_KEY = os.environ.get("HELIUS_API_KEY", "")
USE_REAL_HOLDERS = (
    os.environ.get("USE_REAL_HOLDERS", "0") == "1" and bool(HELIUS_API_KEY)
)
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
BASE_REWARD_POOL = int(os.environ.get("BASE_REWARD_POOL", "5000"))
HELIUS_CACHE_TTL_S = 120  # 2 min

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("ansdrop")

# ---------- Mongo ----------
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ---------- Mock holders ----------
B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"


def _mulberry32(seed: int):
    state = [seed & 0xFFFFFFFF]

    def rand():
        state[0] = (state[0] + 0x6D2B79F5) & 0xFFFFFFFF
        t = state[0]
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= (t + ((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

    return rand


def _mock_address(rng):
    return "".join(B58[int(rng() * len(B58))] for _ in range(44))


_mock_cache: Optional[List[dict]] = None


def get_mock_holders() -> List[dict]:
    global _mock_cache
    if _mock_cache is not None:
        return _mock_cache
    rng = _mulberry32(1337)
    holders = []
    for _ in range(620):
        r = rng()
        if r < 0.55:
            bal = int(rng() * 49000) + 500
        elif r < 0.85:
            bal = int(rng() * 200000) + 50000
        elif r < 0.97:
            bal = int(rng() * 800000) + 250000
        else:
            bal = int(rng() * 4000000) + 1000000
        holders.append({"address": _mock_address(rng), "balance": bal})
    _mock_cache = holders
    return holders


# ---------- Helius integration ----------
_helius_cache = {"at": 0.0, "holders": None, "source": "none"}
_helius_lock = asyncio.Lock()


async def _fetch_helius_holders() -> Optional[List[dict]]:
    if not USE_REAL_HOLDERS:
        return None
    url = f"https://mainnet.helius-rpc.com/?api-key={HELIUS_API_KEY}"
    owner_totals: dict[str, int] = {}
    page = 1
    limit = 1000
    max_pages = 20
    try:
        async with httpx.AsyncClient(timeout=25.0) as http:
            while page <= max_pages:
                body = {
                    "jsonrpc": "2.0",
                    "id": "ansdrop",
                    "method": "getTokenAccounts",
                    "params": {"mint": DROP_MINT, "page": page, "limit": limit},
                }
                r = await http.post(url, json=body)
                if r.status_code != 200:
                    logger.error("Helius HTTP %s", r.status_code)
                    return None
                data = r.json()
                if data.get("error"):
                    logger.error("Helius rpc error %s", data["error"])
                    return None
                accs = (data.get("result") or {}).get("token_accounts") or []
                if not accs:
                    break
                for a in accs:
                    try:
                        amt = int(a.get("amount") or 0)
                    except Exception:
                        amt = 0
                    if amt <= 0:
                        continue
                    owner = a.get("owner")
                    if not owner:
                        continue
                    owner_totals[owner] = owner_totals.get(owner, 0) + amt
                if len(accs) < limit:
                    break
                page += 1
    except Exception as e:
        logger.error("Helius fetch failed: %s", e)
        return None

    scale = 10 ** DROP_DECIMALS
    holders = [
        {"address": owner, "balance": raw / scale}
        for owner, raw in owner_totals.items()
    ]
    holders.sort(key=lambda h: h["balance"], reverse=True)
    return holders


async def get_all_holders() -> dict:
    now = datetime.now(timezone.utc).timestamp()
    if (
        _helius_cache.get("holders")
        and now - _helius_cache["at"] < HELIUS_CACHE_TTL_S
    ):
        return _helius_cache
    async with _helius_lock:
        if (
            _helius_cache.get("holders")
            and now - _helius_cache["at"] < HELIUS_CACHE_TTL_S
        ):
            return _helius_cache
        if USE_REAL_HOLDERS:
            real = await _fetch_helius_holders()
            if real and len(real) > 0:
                _helius_cache.update(
                    {"at": now, "holders": real, "source": "helius"}
                )
                return _helius_cache
        mock = get_mock_holders()
        _helius_cache.update({"at": now, "holders": mock, "source": "mock"})
        return _helius_cache


async def get_eligible_holders() -> List[dict]:
    data = await get_all_holders()
    return [h for h in data["holders"] if h["balance"] >= MIN_ELIGIBLE_HOLD]


# ---------- Round / winner logic ----------
def _generate_crash_point() -> float:
    r = random.random()
    cp = max(1.0, 0.99 / (1 - r * 0.99))
    return round(min(cp, 250.0), 2)


async def ensure_state() -> dict:
    st = await db.raffle_state.find_one({"_id": "singleton"})
    if not st:
        new_state = {
            "_id": "singleton",
            # Start in STOPPED state — admin must press Start
            "systemStatus": "stopped",
            "nextRoundEndsAt": None,
            "roundNumber": 0,
            "intervalMs": RAFFLE_INTERVAL_MS,
            "startedAt": None,
        }
        await db.raffle_state.insert_one(new_state)
        return new_state
    # Backfill for older docs
    changed = {}
    if "systemStatus" not in st:
        changed["systemStatus"] = "stopped"
    if "roundNumber" not in st:
        changed["roundNumber"] = 0
    if changed:
        await db.raffle_state.update_one({"_id": "singleton"}, {"$set": changed})
        st.update(changed)
    return st


async def _try_advance_round() -> Optional[dict]:
    """Atomically claim a round and pick a winner if due AND system is running."""
    now = datetime.now(timezone.utc)
    prev = await db.raffle_state.find_one_and_update(
        {
            "_id": "singleton",
            "systemStatus": "running",
            "nextRoundEndsAt": {"$lte": now, "$ne": None},
        },
        {
            "$set": {
                "nextRoundEndsAt": datetime.fromtimestamp(
                    now.timestamp() + RAFFLE_INTERVAL_MS / 1000,
                    tz=timezone.utc,
                )
            },
            "$inc": {"roundNumber": 1},
        },
        return_document=False,
    )
    if not prev:
        return None

    eligible = await get_eligible_holders()
    if not eligible:
        return None

    winner = random.choice(eligible)
    crash_point = _generate_crash_point()
    tokens_won = int(BASE_REWARD_POOL * crash_point)

    winner_doc = {
        "id": str(uuid.uuid4()),
        "roundNumber": prev.get("roundNumber", 0),
        "address": winner["address"],
        "balance": winner["balance"],
        "crashPoint": crash_point,
        "tokensWon": tokens_won,
        "baseReward": BASE_REWARD_POOL,
        "endedAt": now,
        "settledAt": prev.get("nextRoundEndsAt"),
        "paid": False,
        "paidAt": None,
        "txHash": None,
    }
    await db.winners.insert_one(dict(winner_doc))
    winner_doc.pop("_id", None)
    return winner_doc


def _serialize(doc: dict) -> dict:
    """Strip _id and convert datetimes to isoformat for JSON responses."""
    out = {}
    for k, v in doc.items():
        if k == "_id":
            continue
        if isinstance(v, datetime):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


# ---------- FastAPI ----------
app = FastAPI(title="Ansdrop API")
api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"message": "Ansdrop API"}


@api.get("/state")
async def get_state():
    st = await ensure_state()

    # Try to advance up to 5 rounds in a burst (in case server was idle)
    just_picked = None
    if st.get("systemStatus") == "running":
        for _ in range(5):
            w = await _try_advance_round()
            if not w:
                break
            just_picked = w

    st = await db.raffle_state.find_one({"_id": "singleton"})
    recent_cursor = db.winners.find({}).sort("endedAt", -1).limit(10)
    recent = [_serialize(w) async for w in recent_cursor]

    holders_data = await get_all_holders()
    all_holders = holders_data["holders"] or []
    source = holders_data.get("source", "mock")
    eligible = [h for h in all_holders if h["balance"] >= MIN_ELIGIBLE_HOLD]
    total_eligible_balance = sum(h["balance"] for h in eligible)

    dist_agg = await db.winners.aggregate(
        [{"$group": {"_id": None, "total": {"$sum": "$tokensWon"}, "count": {"$sum": 1}}}]
    ).to_list(length=1)
    total_distributed = dist_agg[0]["total"] if dist_agg else 0
    winners_count = dist_agg[0]["count"] if dist_agg else 0

    nre = st.get("nextRoundEndsAt")
    return {
        "systemStatus": st.get("systemStatus", "stopped"),
        "mint": DROP_MINT,
        "minEligibleHold": MIN_ELIGIBLE_HOLD,
        "intervalMs": RAFFLE_INTERVAL_MS,
        "now": int(datetime.now(timezone.utc).timestamp() * 1000),
        "nextRoundEndsAt": nre.isoformat() if isinstance(nre, datetime) else nre,
        "roundNumber": st.get("roundNumber", 0),
        "eligibleCount": len(eligible),
        "totalHolders": len(all_holders),
        "totalEligibleBalance": total_eligible_balance,
        "baseReward": BASE_REWARD_POOL,
        "recentWinners": recent,
        "justPicked": just_picked,
        "holderSource": source,
        "totalDistributed": total_distributed,
        "winnersCount": winners_count,
    }


@api.get("/holders")
async def get_holders(limit: int = Query(500, ge=1, le=5000)):
    all_eligible = sorted(
        await get_eligible_holders(), key=lambda h: h["balance"], reverse=True
    )
    return {
        "count": len(all_eligible),
        "minHold": MIN_ELIGIBLE_HOLD,
        "holders": all_eligible[:limit],
        "source": _helius_cache.get("source", "mock"),
    }


@api.get("/winners")
async def get_winners():
    cursor = db.winners.find({}).sort("endedAt", -1).limit(50)
    winners = [_serialize(w) async for w in cursor]
    return {"winners": winners}


# ---------- Dev ----------
@api.post("/dev/force-crash")
async def dev_force_crash():
    await ensure_state()
    await db.raffle_state.update_one(
        {"_id": "singleton"},
        {
            "$set": {
                "nextRoundEndsAt": datetime.fromtimestamp(
                    datetime.now(timezone.utc).timestamp() - 1, tz=timezone.utc
                )
            }
        },
    )
    w = await _try_advance_round()
    return {"ok": True, "winner": w}


# ---------- Admin auth helper ----------
class MarkPaidBody(BaseModel):
    winnerId: str
    txHash: Optional[str] = None


class WinnerIdBody(BaseModel):
    winnerId: str


def _check_admin(request: Request):
    key = request.headers.get("x-admin-key")
    if not ADMIN_PASSWORD or key != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="unauthorized")


@api.post("/admin/ping")
async def admin_ping(request: Request):
    _check_admin(request)
    return {"ok": True}


@api.post("/admin/winners")
async def admin_winners(request: Request):
    _check_admin(request)
    cursor = db.winners.find({}).sort("endedAt", -1).limit(200)
    winners = [_serialize(w) async for w in cursor]
    return {"winners": winners}


@api.post("/admin/mark-paid")
async def admin_mark_paid(body: MarkPaidBody, request: Request):
    _check_admin(request)
    tx = (body.txHash or "").strip() or None
    result = await db.winners.find_one_and_update(
        {"id": body.winnerId},
        {"$set": {"paid": True, "paidAt": datetime.now(timezone.utc), "txHash": tx}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="winner not found")
    return {"ok": True, "winner": _serialize(result)}


@api.post("/admin/unmark-paid")
async def admin_unmark_paid(body: WinnerIdBody, request: Request):
    _check_admin(request)
    await db.winners.update_one(
        {"id": body.winnerId},
        {"$set": {"paid": False, "paidAt": None, "txHash": None}},
    )
    return {"ok": True}


@api.post("/admin/start")
async def admin_start(request: Request):
    """Start the raffle system — sets systemStatus='running' and initializes countdown."""
    _check_admin(request)
    await ensure_state()
    now = datetime.now(timezone.utc)
    next_end = datetime.fromtimestamp(
        now.timestamp() + RAFFLE_INTERVAL_MS / 1000, tz=timezone.utc
    )
    await db.raffle_state.update_one(
        {"_id": "singleton"},
        {
            "$set": {
                "systemStatus": "running",
                "nextRoundEndsAt": next_end,
                "startedAt": now,
            },
            "$inc": {"roundNumber": 1},
        },
    )
    st = await db.raffle_state.find_one({"_id": "singleton"})
    return {
        "ok": True,
        "systemStatus": st.get("systemStatus"),
        "roundNumber": st.get("roundNumber"),
        "nextRoundEndsAt": st["nextRoundEndsAt"].isoformat()
        if isinstance(st.get("nextRoundEndsAt"), datetime)
        else st.get("nextRoundEndsAt"),
    }


@api.post("/admin/reset")
async def admin_reset(request: Request):
    """Reset the raffle — wipes all winners + sets system to stopped."""
    _check_admin(request)
    await db.winners.delete_many({})
    await db.raffle_state.update_one(
        {"_id": "singleton"},
        {
            "$set": {
                "systemStatus": "stopped",
                "nextRoundEndsAt": None,
                "roundNumber": 0,
                "startedAt": None,
            }
        },
        upsert=True,
    )
    return {"ok": True, "systemStatus": "stopped"}


# ---------- Wire up ----------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def _shutdown():
    client.close()
