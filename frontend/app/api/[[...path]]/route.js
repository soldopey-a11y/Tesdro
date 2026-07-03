import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'

// ---------- Config ----------
const ROUND_INTERVAL_MS = parseInt(process.env.RAFFLE_INTERVAL_MS || '60000', 10)
const DROP_MINT = process.env.DROP_MINT || 'DRoP1111111111111111111111111111111111111111'
const MIN_ELIGIBLE_HOLD = parseFloat(process.env.DROP_MIN_ELIGIBLE || '50000')
const DROP_DECIMALS = parseInt(process.env.DROP_DECIMALS || '6', 10)
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || ''
const USE_REAL_HOLDERS = process.env.USE_REAL_HOLDERS === '1' && !!HELIUS_API_KEY
const DB_NAME = process.env.DB_NAME || 'ansdrop'
const HELIUS_CACHE_TTL_MS = 120000 // 2 min
const MAX_CRASH_POINT = 100 // cap multiplier at 100x

// ---------- Provably-fair helpers ----------
function newSeed() {
  return crypto.randomBytes(32).toString('hex')
}
function sha256hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex')
}
// Deterministic [0, 1) float from (seed, tag). First 15 hex chars = 60 bits.
function seedRandom(seed, tag) {
  const h = sha256hex(seed + ':' + tag)
  return parseInt(h.slice(0, 15), 16) / Math.pow(2, 60)
}

// ---------- Mongo ----------
let client
let dbPromise
async function getDb() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    dbPromise = client.connect().then(() => client.db(DB_NAME))
  }
  return dbPromise
}

// ---------- Mock holders (fallback) ----------
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
function mockAddress(rng) {
  let s = ''
  for (let i = 0; i < 44; i++) s += B58[Math.floor(rng() * B58.length)]
  return s
}

let _mockCache = null
function getMockHolders() {
  if (_mockCache) return _mockCache
  const rng = mulberry32(1337)
  const holders = []
  const total = 620
  for (let i = 0; i < total; i++) {
    const r = rng()
    let bal
    if (r < 0.55) bal = Math.floor(rng() * 49000) + 500
    else if (r < 0.85) bal = Math.floor(rng() * 200000) + 50000
    else if (r < 0.97) bal = Math.floor(rng() * 800000) + 250000
    else bal = Math.floor(rng() * 4000000) + 1000000
    holders.push({ address: mockAddress(rng), balance: bal })
  }
  _mockCache = holders
  return holders
}

// ---------- Helius integration ----------
let _heliusCache = { at: 0, holders: null, source: 'none', totalRaw: 0 }

async function fetchHeliusHolders() {
  if (!USE_REAL_HOLDERS) return null
  const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  const ownerTotals = new Map() // owner -> BigInt raw amount
  let page = 1
  const limit = 1000
  const maxPages = 20 // safety cap = 20,000 accounts
  let totalScanned = 0

  while (page <= maxPages) {
    const body = {
      jsonrpc: '2.0',
      id: 'ansdrop',
      method: 'getTokenAccounts',
      params: { mint: DROP_MINT, page, limit },
    }
    let json
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        console.error('Helius HTTP', res.status)
        return null
      }
      json = await res.json()
    } catch (e) {
      console.error('Helius fetch error', e.message)
      return null
    }
    if (json?.error) {
      console.error('Helius rpc error', json.error)
      return null
    }
    const accs = json?.result?.token_accounts || []
    if (accs.length === 0) break
    for (const a of accs) {
      const amt = BigInt(a.amount || 0)
      if (amt <= 0n) continue
      const owner = a.owner
      if (!owner) continue
      const prev = ownerTotals.get(owner) || 0n
      ownerTotals.set(owner, prev + amt)
    }
    totalScanned += accs.length
    if (accs.length < limit) break
    page++
  }

  const scale = 10 ** DROP_DECIMALS
  const holders = []
  for (const [owner, raw] of ownerTotals.entries()) {
    // convert BigInt raw to Number (safe: pump tokens usually <1 quadrillion)
    const bal = Number(raw) / scale
    holders.push({ address: owner, balance: bal })
  }
  holders.sort((a, b) => b.balance - a.balance)
  return { holders, totalScanned }
}

async function getAllHolders() {
  const now = Date.now()
  if (_heliusCache.holders && now - _heliusCache.at < HELIUS_CACHE_TTL_MS) {
    return _heliusCache
  }
  if (USE_REAL_HOLDERS) {
    const real = await fetchHeliusHolders()
    if (real && real.holders.length > 0) {
      _heliusCache = {
        at: now,
        holders: real.holders,
        source: 'helius',
        totalRaw: real.holders.length,
      }
      return _heliusCache
    }
  }
  const mock = getMockHolders()
  _heliusCache = {
    at: now,
    holders: mock,
    source: 'mock',
    totalRaw: mock.length,
  }
  return _heliusCache
}

async function getEligibleHolders() {
  const { holders } = await getAllHolders()
  return holders.filter((h) => h.balance >= MIN_ELIGIBLE_HOLD)
}

// ---------- Round / winner logic ----------
function generateCrashPointFromRand(r) {
  // House-edge-free-ish exponential crash multiplier, capped at MAX_CRASH_POINT.
  const cp = Math.max(1.0, 0.99 / (1 - r * 0.99))
  return Math.min(cp, MAX_CRASH_POINT)
}

async function ensureState(db) {
  const state = await db.collection('raffle_state').findOne({ _id: 'singleton' })
  if (!state) {
    const seed = newSeed()
    const newState = {
      _id: 'singleton',
      systemStatus: 'stopped',
      nextRoundEndsAt: null,
      roundNumber: 0,
      intervalMs: ROUND_INTERVAL_MS,
      startedAt: null,
      seed,
      seedCommit: sha256hex(seed),
    }
    await db.collection('raffle_state').insertOne(newState)
    return newState
  }
  // Backfill for older docs
  const patch = {}
  if (state.systemStatus === undefined) patch.systemStatus = 'stopped'
  if (state.roundNumber === undefined) patch.roundNumber = 0
  if (!state.seed) {
    const s = newSeed()
    patch.seed = s
    patch.seedCommit = sha256hex(s)
  }
  if (Object.keys(patch).length > 0) {
    await db.collection('raffle_state').updateOne(
      { _id: 'singleton' },
      { $set: patch }
    )
    Object.assign(state, patch)
  }
  return state
}

// Base reward pool per round in $DROP (mock).
const BASE_REWARD_POOL = 5000

async function tryAdvanceRound(db) {
  const now = new Date()
  // Prepare a NEW seed for the NEXT round. The OLD seed (still in `prev`) is what
  // we use to derive THIS round's winner + crash — its commit was already public.
  const nextSeedValue = newSeed()
  const nextCommitValue = sha256hex(nextSeedValue)

  const prev = await db.collection('raffle_state').findOneAndUpdate(
    {
      _id: 'singleton',
      systemStatus: 'running',
      nextRoundEndsAt: { $lte: now, $ne: null },
    },
    {
      $set: {
        nextRoundEndsAt: new Date(Date.now() + ROUND_INTERVAL_MS),
        seed: nextSeedValue,
        seedCommit: nextCommitValue,
      },
      $inc: { roundNumber: 1 },
    },
    { returnDocument: 'before' }
  )
  const claimed = prev && (prev.value || prev) // driver version safety
  if (!claimed || !claimed._id) return null

  const eligible = await getEligibleHolders()
  if (eligible.length === 0) return null

  // Derive winner + crash deterministically from the revealed seed.
  const roundSeed = claimed.seed
  const roundCommit = claimed.seedCommit
  const thisRoundNumber = claimed.roundNumber

  const winnerRand = seedRandom(roundSeed, `winner:${thisRoundNumber}`)
  const winner = eligible[Math.floor(winnerRand * eligible.length)]

  const crashRand = seedRandom(roundSeed, `crash:${thisRoundNumber}`)
  const crashPoint = generateCrashPointFromRand(crashRand)
  const tokensWon = Math.floor(BASE_REWARD_POOL * crashPoint)

  const winnerDoc = {
    id: uuidv4(),
    roundNumber: thisRoundNumber,
    address: winner.address,
    balance: winner.balance,
    crashPoint: parseFloat(crashPoint.toFixed(2)),
    tokensWon,
    baseReward: BASE_REWARD_POOL,
    endedAt: new Date(),
    settledAt: claimed.nextRoundEndsAt,
    paid: false,
    paidAt: null,
    txHash: null,
    // Provably-fair audit fields
    seedCommit: roundCommit,
    revealedSeed: roundSeed,
    eligibleCount: eligible.length,
    winnerIndex: Math.floor(winnerRand * eligible.length),
  }
  await db.collection('winners').insertOne(winnerDoc)
  return winnerDoc
}

// ---------- Handlers ----------
async function handleGetState(db) {
  const initial = await ensureState(db)
  // Try to advance up to 5 rounds in a burst (only when running)
  let justPicked = null
  if (initial.systemStatus === 'running') {
    for (let i = 0; i < 5; i++) {
      const w = await tryAdvanceRound(db)
      if (!w) break
      justPicked = w // keep the most recent one
    }
  }
  const state = await db.collection('raffle_state').findOne({ _id: 'singleton' })
  const recent = await db
    .collection('winners')
    .find({}, { projection: { _id: 0 } })
    .sort({ endedAt: -1 })
    .limit(10)
    .toArray()

  const { holders: allHolders, source } = await getAllHolders()
  const eligible = allHolders.filter((h) => h.balance >= MIN_ELIGIBLE_HOLD)
  const totalHolders = allHolders.length
  const totalEligibleBalance = eligible.reduce((s, h) => s + h.balance, 0)

  // Total tokens actually distributed to winners across all completed rounds
  const distAgg = await db
    .collection('winners')
    .aggregate([{ $group: { _id: null, total: { $sum: '$tokensWon' }, count: { $sum: 1 } } }])
    .toArray()
  const totalDistributed = distAgg[0]?.total || 0
  const winnersCount = distAgg[0]?.count || 0

  return NextResponse.json({
    systemStatus: state.systemStatus || 'stopped',
    mint: DROP_MINT,
    minEligibleHold: MIN_ELIGIBLE_HOLD,
    intervalMs: ROUND_INTERVAL_MS,
    now: Date.now(),
    nextRoundEndsAt: state.nextRoundEndsAt,
    roundNumber: state.roundNumber,
    eligibleCount: eligible.length,
    totalHolders,
    totalEligibleBalance,
    baseReward: BASE_REWARD_POOL,
    maxCrashPoint: MAX_CRASH_POINT,
    seedCommit: state.seedCommit || null,
    recentWinners: recent,
    justPicked,
    holderSource: source,
    totalDistributed,
    winnersCount,
  })
}

async function handleGetHolders(db, limit) {
  const all = (await getEligibleHolders())
    .slice()
    .sort((a, b) => b.balance - a.balance)
  const top = all.slice(0, limit)
  return NextResponse.json({
    count: all.length,
    minHold: MIN_ELIGIBLE_HOLD,
    holders: top,
    source: _heliusCache.source,
  })
}

export async function GET(request, { params }) {
  try {
    const db = await getDb()
    const p = (await params).path || []
    const route = p.join('/')
    const url = new URL(request.url)

    if (!route || route === '') {
      return NextResponse.json({ message: 'Ansdrop API' })
    }
    if (route === 'state') return handleGetState(db)
    if (route === 'holders') {
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '500', 10), 5000)
      return handleGetHolders(db, limit)
    }
    if (route === 'winners') {
      const winners = await db
        .collection('winners')
        .find({}, { projection: { _id: 0 } })
        .sort({ endedAt: -1 })
        .limit(50)
        .toArray()
      return NextResponse.json({ winners })
    }
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  } catch (e) {
    console.error('GET error', e)
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 })
  }
}

export async function POST(request, { params }) {
  try {
    const db = await getDb()
    const p = (await params).path || []
    const route = p.join('/')

    // Debug/dev endpoint to force a round to end immediately.
    if (route === 'dev/force-crash') {
      await db.collection('raffle_state').updateOne(
        { _id: 'singleton' },
        { $set: { nextRoundEndsAt: new Date(Date.now() - 1000) } },
        { upsert: false }
      )
      const w = await tryAdvanceRound(db)
      return NextResponse.json({ ok: true, winner: w })
    }

    // ---------- ADMIN routes (require x-admin-key header) ----------
    if (route.startsWith('admin/')) {
      const key = request.headers.get('x-admin-key')
      if (!key || key !== (process.env.ADMIN_PASSWORD || '')) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
      }

      const body = await request.json().catch(() => ({}))

      if (route === 'admin/mark-paid') {
        const { winnerId, txHash } = body || {}
        if (!winnerId) {
          return NextResponse.json({ error: 'winnerId required' }, { status: 400 })
        }
        const r = await db.collection('winners').findOneAndUpdate(
          { id: winnerId },
          {
            $set: {
              paid: true,
              paidAt: new Date(),
              txHash: (txHash || '').trim() || null,
            },
          },
          { returnDocument: 'after' }
        )
        const doc = r?.value || r
        if (!doc || !doc.id) {
          return NextResponse.json({ error: 'winner not found' }, { status: 404 })
        }
        const { _id, ...rest } = doc
        return NextResponse.json({ ok: true, winner: rest })
      }

      if (route === 'admin/unmark-paid') {
        const { winnerId } = body || {}
        if (!winnerId) {
          return NextResponse.json({ error: 'winnerId required' }, { status: 400 })
        }
        await db.collection('winners').updateOne(
          { id: winnerId },
          { $set: { paid: false, paidAt: null, txHash: null } }
        )
        return NextResponse.json({ ok: true })
      }

      if (route === 'admin/ping') {
        // Used by admin UI to verify password
        return NextResponse.json({ ok: true })
      }

      if (route === 'admin/winners') {
        const items = await db
          .collection('winners')
          .find({}, { projection: { _id: 0 } })
          .sort({ endedAt: -1 })
          .limit(100)
          .toArray()
        return NextResponse.json({ winners: items })
      }

      if (route === 'admin/start') {
        await ensureState(db)
        const nextEnd = new Date(Date.now() + ROUND_INTERVAL_MS)
        // Fresh seed for the very next round.
        const s = newSeed()
        await db.collection('raffle_state').updateOne(
          { _id: 'singleton' },
          {
            $set: {
              systemStatus: 'running',
              nextRoundEndsAt: nextEnd,
              startedAt: new Date(),
              seed: s,
              seedCommit: sha256hex(s),
            },
            $inc: { roundNumber: 1 },
          }
        )
        const st = await db.collection('raffle_state').findOne({ _id: 'singleton' })
        return NextResponse.json({
          ok: true,
          systemStatus: st.systemStatus,
          roundNumber: st.roundNumber,
          nextRoundEndsAt: st.nextRoundEndsAt,
          seedCommit: st.seedCommit,
        })
      }

      if (route === 'admin/reset') {
        await db.collection('winners').deleteMany({})
        const s = newSeed()
        await db.collection('raffle_state').updateOne(
          { _id: 'singleton' },
          {
            $set: {
              systemStatus: 'stopped',
              nextRoundEndsAt: null,
              roundNumber: 0,
              startedAt: null,
              seed: s,
              seedCommit: sha256hex(s),
            },
          },
          { upsert: true }
        )
        return NextResponse.json({ ok: true, systemStatus: 'stopped' })
      }
    }

    return NextResponse.json({ error: 'not found' }, { status: 404 })
  } catch (e) {
    console.error('POST error', e)
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 })
  }
}
