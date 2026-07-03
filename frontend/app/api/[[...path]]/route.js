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
const SUPPORT_DEPOSIT_WALLET = process.env.SUPPORT_DEPOSIT_WALLET || ''
const TIP_WALLET = process.env.TIP_WALLET || SUPPORT_DEPOSIT_WALLET

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

// ---------- Per-mint holder cache for community projects ----------
const _projectHolderCache = new Map() // mint -> { at, holders }

async function fetchHoldersForMint(mint, decimals) {
  if (!USE_REAL_HOLDERS) return null
  const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
  const ownerTotals = new Map()
  let page = 1
  const limit = 1000
  const maxPages = 20
  while (page <= maxPages) {
    const body = {
      jsonrpc: '2.0',
      id: 'ansdrop-project',
      method: 'getTokenAccounts',
      params: { mint, page, limit },
    }
    let json
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) return null
      json = await res.json()
    } catch (e) {
      return null
    }
    if (json?.error) return null
    const accs = json?.result?.token_accounts || []
    if (accs.length === 0) break
    for (const a of accs) {
      const amt = BigInt(a.amount || 0)
      if (amt <= 0n) continue
      const owner = a.owner
      if (!owner) continue
      ownerTotals.set(owner, (ownerTotals.get(owner) || 0n) + amt)
    }
    if (accs.length < limit) break
    page++
  }
  const scale = 10 ** decimals
  const holders = []
  for (const [owner, raw] of ownerTotals.entries()) {
    holders.push({ address: owner, balance: Number(raw) / scale })
  }
  holders.sort((a, b) => b.balance - a.balance)
  return holders
}

async function getProjectHolders(mint, decimals) {
  const now = Date.now()
  const cached = _projectHolderCache.get(mint)
  if (cached && now - cached.at < HELIUS_CACHE_TTL_MS) return cached
  const real = await fetchHoldersForMint(mint, decimals)
  const holders = real && real.length > 0 ? real : []
  const entry = { at: now, holders, source: real && real.length > 0 ? 'helius' : 'empty' }
  _projectHolderCache.set(mint, entry)
  return entry
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

// ---------- PROJECT (community-drop) helpers ----------
function makeSlug(name) {
  const base = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  const suffix = crypto.randomBytes(3).toString('hex')
  return (base || 'drop') + '-' + suffix
}

function makeAdminKey() {
  return crypto.randomBytes(16).toString('hex')
}

function projectStateId(slug) {
  return 'project:' + slug
}

async function ensureProjectState(db, project) {
  const stateId = projectStateId(project.slug)
  const st = await db.collection('raffle_state').findOne({ _id: stateId })
  if (!st) {
    const seed = newSeed()
    const doc = {
      _id: stateId,
      projectSlug: project.slug,
      systemStatus: 'stopped',
      nextRoundEndsAt: null,
      roundNumber: 0,
      intervalMs: project.intervalMs || ROUND_INTERVAL_MS,
      startedAt: null,
      seed,
      seedCommit: sha256hex(seed),
    }
    await db.collection('raffle_state').insertOne(doc)
    return doc
  }
  return st
}

async function tryAdvanceProjectRound(db, project) {
  const now = new Date()
  const nextSeedValue = newSeed()
  const nextCommitValue = sha256hex(nextSeedValue)
  const intervalMs = project.intervalMs || ROUND_INTERVAL_MS

  const prev = await db.collection('raffle_state').findOneAndUpdate(
    {
      _id: projectStateId(project.slug),
      systemStatus: 'running',
      nextRoundEndsAt: { $lte: now, $ne: null },
    },
    {
      $set: {
        nextRoundEndsAt: new Date(Date.now() + intervalMs),
        seed: nextSeedValue,
        seedCommit: nextCommitValue,
      },
      $inc: { roundNumber: 1 },
    },
    { returnDocument: 'before' }
  )
  const claimed = prev && (prev.value || prev)
  if (!claimed || !claimed._id) return null

  const { holders } = await getProjectHolders(project.mint, project.decimals || 6)
  const eligible = holders.filter((h) => h.balance >= project.minHold)
  if (eligible.length === 0) return null

  const roundSeed = claimed.seed
  const roundCommit = claimed.seedCommit
  const thisRoundNumber = claimed.roundNumber

  const winnerRand = seedRandom(roundSeed, `winner:${thisRoundNumber}`)
  const winner = eligible[Math.floor(winnerRand * eligible.length)]
  const crashRand = seedRandom(roundSeed, `crash:${thisRoundNumber}`)
  const crashPoint = generateCrashPointFromRand(crashRand)
  const tokensWon = Math.floor(project.baseReward * crashPoint)

  const winnerDoc = {
    id: uuidv4(),
    projectSlug: project.slug,
    roundNumber: thisRoundNumber,
    address: winner.address,
    balance: winner.balance,
    crashPoint: parseFloat(crashPoint.toFixed(2)),
    tokensWon,
    baseReward: project.baseReward,
    endedAt: new Date(),
    settledAt: claimed.nextRoundEndsAt,
    paid: false,
    paidAt: null,
    txHash: null,
    seedCommit: roundCommit,
    revealedSeed: roundSeed,
    eligibleCount: eligible.length,
    winnerIndex: Math.floor(winnerRand * eligible.length),
  }
  await db.collection('winners').insertOne(winnerDoc)
  return winnerDoc
}

async function handleGetProjectState(db, project) {
  const initial = await ensureProjectState(db, project)
  let justPicked = null
  if (initial.systemStatus === 'running') {
    for (let i = 0; i < 5; i++) {
      const w = await tryAdvanceProjectRound(db, project)
      if (!w) break
      justPicked = w
    }
  }
  const state = await db.collection('raffle_state').findOne({ _id: projectStateId(project.slug) })
  const recent = await db
    .collection('winners')
    .find({ projectSlug: project.slug }, { projection: { _id: 0 } })
    .sort({ endedAt: -1 })
    .limit(10)
    .toArray()

  const { holders: allHolders, source } = await getProjectHolders(project.mint, project.decimals || 6)
  const eligible = allHolders.filter((h) => h.balance >= project.minHold)
  const totalHolders = allHolders.length
  const totalEligibleBalance = eligible.reduce((s, h) => s + h.balance, 0)

  const distAgg = await db
    .collection('winners')
    .aggregate([
      { $match: { projectSlug: project.slug } },
      { $group: { _id: null, total: { $sum: '$tokensWon' }, count: { $sum: 1 } } },
    ])
    .toArray()
  const totalDistributed = distAgg[0]?.total || 0
  const winnersCount = distAgg[0]?.count || 0

  return {
    systemStatus: state.systemStatus || 'stopped',
    mint: project.mint,
    minEligibleHold: project.minHold,
    intervalMs: project.intervalMs || ROUND_INTERVAL_MS,
    now: Date.now(),
    nextRoundEndsAt: state.nextRoundEndsAt,
    roundNumber: state.roundNumber,
    eligibleCount: eligible.length,
    totalHolders,
    totalEligibleBalance,
    baseReward: project.baseReward,
    maxCrashPoint: MAX_CRASH_POINT,
    seedCommit: state.seedCommit || null,
    recentWinners: recent,
    justPicked,
    holderSource: source,
    totalDistributed,
    winnersCount,
    // Community-drop meta
    slug: project.slug,
    name: project.name,
    ticker: project.ticker,
    supporterName: project.supporterName || null,
    supporterHandle: project.supporterHandle || null,
    supporterMessage: project.supporterMessage || null,
    depositWallet: SUPPORT_DEPOSIT_WALLET,
    tipWallet: TIP_WALLET,
    depositTx: project.depositTx || null,
  }
}

function stripProjectSecrets(p) {
  if (!p) return null
  const { _id, adminKey, ...rest } = p
  return rest
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

    // ---------- PROJECTS (community drops) ----------
    if (route === 'projects') {
      const items = await db
        .collection('projects')
        .find({}, { projection: { adminKey: 0 } })
        .sort({ createdAt: -1 })
        .toArray()
      return NextResponse.json({
        projects: items.map(stripProjectSecrets),
        depositWallet: SUPPORT_DEPOSIT_WALLET,
        tipWallet: TIP_WALLET,
      })
    }
    if (route.startsWith('projects/')) {
      const parts = route.split('/')
      const slug = parts[1]
      const sub = parts.slice(2).join('/')
      const project = await db.collection('projects').findOne({ slug })
      if (!project) {
        return NextResponse.json({ error: 'project not found' }, { status: 404 })
      }
      if (!sub || sub === '') {
        return NextResponse.json({ project: stripProjectSecrets(project) })
      }
      if (sub === 'state') {
        const data = await handleGetProjectState(db, project)
        return NextResponse.json(data)
      }
      if (sub === 'winners') {
        const winners = await db
          .collection('winners')
          .find({ projectSlug: slug }, { projection: { _id: 0 } })
          .sort({ endedAt: -1 })
          .limit(50)
          .toArray()
        return NextResponse.json({ winners })
      }
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

    // ---------- PROJECTS (community drops) ----------
    // Create a new supported community drop (open, no auth).
    if (route === 'projects') {
      const body = await request.json().catch(() => ({}))
      const name = String(body.name || '').trim()
      const ticker = String(body.ticker || '').trim().toUpperCase()
      const mint = String(body.mint || '').trim()
      const decimals = parseInt(body.decimals || 6, 10)
      const minHold = parseFloat(body.minHold || 0)
      const baseReward = parseFloat(body.baseReward || 0)
      const totalPool = parseFloat(body.totalPool || 0)
      const intervalMs = Math.max(30000, parseInt(body.intervalMs || ROUND_INTERVAL_MS, 10))
      const supporterName = String(body.supporterName || '').slice(0, 60)
      const supporterHandle = String(body.supporterHandle || '').slice(0, 60)
      const supporterMessage = String(body.supporterMessage || '').slice(0, 400)
      const logoUrl = String(body.logoUrl || '').slice(0, 400)
      const tipSol = parseFloat(body.tipSol || 0)

      if (!name || name.length < 2) {
        return NextResponse.json({ error: 'name is required' }, { status: 400 })
      }
      if (!ticker || ticker.length < 1) {
        return NextResponse.json({ error: 'ticker is required' }, { status: 400 })
      }
      if (!mint || mint.length < 32) {
        return NextResponse.json({ error: 'valid mint address is required' }, { status: 400 })
      }
      if (!(minHold > 0)) {
        return NextResponse.json({ error: 'minHold must be > 0' }, { status: 400 })
      }
      if (!(baseReward > 0)) {
        return NextResponse.json({ error: 'baseReward must be > 0' }, { status: 400 })
      }

      const slug = makeSlug(name + '-' + ticker)
      const adminKey = makeAdminKey()
      const project = {
        slug,
        name,
        ticker,
        mint,
        decimals,
        minHold,
        baseReward,
        totalPool,
        intervalMs,
        supporterName,
        supporterHandle,
        supporterMessage,
        logoUrl,
        tipSol,
        adminKey,
        createdAt: new Date(),
        depositTx: null,
      }
      await db.collection('projects').insertOne(project)
      return NextResponse.json({
        ok: true,
        slug,
        adminKey,
        depositWallet: SUPPORT_DEPOSIT_WALLET,
        tipWallet: TIP_WALLET,
        publicUrl: `/drops/${slug}`,
        adminUrl: `/drops/${slug}/admin`,
      })
    }

    if (route.startsWith('projects/')) {
      const parts = route.split('/')
      const slug = parts[1]
      const sub = parts.slice(2).join('/')
      const project = await db.collection('projects').findOne({ slug })
      if (!project) {
        return NextResponse.json({ error: 'project not found' }, { status: 404 })
      }

      // Dev-only helper
      if (sub === 'dev/force-crash') {
        await db.collection('raffle_state').updateOne(
          { _id: projectStateId(slug) },
          { $set: { nextRoundEndsAt: new Date(Date.now() - 1000) } },
          { upsert: false }
        )
        const w = await tryAdvanceProjectRound(db, project)
        return NextResponse.json({ ok: true, winner: w })
      }

      // Admin actions: header x-admin-key must match project.adminKey
      if (sub.startsWith('admin/')) {
        const key = request.headers.get('x-admin-key')
        if (!key || key !== project.adminKey) {
          return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
        }
        const action = sub.slice('admin/'.length)

        if (action === 'ping') return NextResponse.json({ ok: true })

        if (action === 'start') {
          await ensureProjectState(db, project)
          const s = newSeed()
          await db.collection('raffle_state').updateOne(
            { _id: projectStateId(slug) },
            {
              $set: {
                systemStatus: 'running',
                nextRoundEndsAt: new Date(Date.now() + (project.intervalMs || ROUND_INTERVAL_MS)),
                startedAt: new Date(),
                seed: s,
                seedCommit: sha256hex(s),
              },
              $inc: { roundNumber: 1 },
            }
          )
          const st = await db.collection('raffle_state').findOne({ _id: projectStateId(slug) })
          return NextResponse.json({
            ok: true,
            systemStatus: st.systemStatus,
            roundNumber: st.roundNumber,
            nextRoundEndsAt: st.nextRoundEndsAt,
            seedCommit: st.seedCommit,
          })
        }

        if (action === 'reset') {
          await db.collection('winners').deleteMany({ projectSlug: slug })
          const s = newSeed()
          await db.collection('raffle_state').updateOne(
            { _id: projectStateId(slug) },
            {
              $set: {
                projectSlug: slug,
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

        if (action === 'winners') {
          const winners = await db
            .collection('winners')
            .find({ projectSlug: slug }, { projection: { _id: 0 } })
            .sort({ endedAt: -1 })
            .limit(200)
            .toArray()
          return NextResponse.json({ winners })
        }

        const body = await request.json().catch(() => ({}))
        if (action === 'mark-paid') {
          const winnerId = body.winnerId
          const txHash = body.txHash ? String(body.txHash).trim() : null
          if (!winnerId) {
            return NextResponse.json({ error: 'winnerId required' }, { status: 400 })
          }
          const res = await db.collection('winners').findOneAndUpdate(
            { id: winnerId, projectSlug: slug },
            { $set: { paid: true, paidAt: new Date(), txHash } },
            { returnDocument: 'after' }
          )
          const doc = res && (res.value || res)
          if (!doc || !doc.id) {
            return NextResponse.json({ error: 'winner not found' }, { status: 404 })
          }
          const { _id, ...rest } = doc
          return NextResponse.json({ ok: true, winner: rest })
        }

        if (action === 'unmark-paid') {
          const winnerId = body.winnerId
          if (!winnerId) {
            return NextResponse.json({ error: 'winnerId required' }, { status: 400 })
          }
          await db.collection('winners').updateOne(
            { id: winnerId, projectSlug: slug },
            { $set: { paid: false, paidAt: null, txHash: null } }
          )
          return NextResponse.json({ ok: true })
        }

        if (action === 'set-deposit-tx') {
          const tx = body.depositTx ? String(body.depositTx).trim() : null
          await db.collection('projects').updateOne(
            { slug },
            { $set: { depositTx: tx } }
          )
          return NextResponse.json({ ok: true, depositTx: tx })
        }
      }
    }

    return NextResponse.json({ error: 'not found' }, { status: 404 })
  } catch (e) {
    console.error('POST error', e)
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 })
  }
}
