#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# Testing Protocol
# (see original template — kept intact)

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

user_problem_statement: |
  Port the Next.js Ansdrop project (bebeonsol-design/Test11) to the CRA + FastAPI workspace
  and add these features:
    - Backend: systemStatus field (running / stopped). While stopped, no round advancement.
    - Frontend main page shows "NOT STARTED YET" when systemStatus is stopped.
    - Admin: Start button sets systemStatus=running and initializes countdown.
    - Admin: Reset button wipes all winners + sets systemStatus=stopped (behind confirm dialog).
  Admin password: ansdrop123. Helius API key provided.

backend:
  - task: "Datetime serialization: all datetime fields emit UTC ISO with trailing 'Z'"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: false
        agent: "main"
        comment: "Bugfix: Added _iso_utc helper to emit UTC ISO strings with trailing 'Z'. Previously datetimes were serialized without timezone, causing browser countdown issues."
      - working: false
        agent: "testing"
        comment: "❌ FAILED Step 5: POST /api/dev/force-crash returned endedAt with '+00:00' instead of 'Z', and settledAt without timezone. Issue: _try_advance_round() returns raw datetime objects instead of using _serialize()."
      - working: true
        agent: "testing"
        comment: "✅ VERIFIED: Fixed _try_advance_round() to use _serialize(). All 7 verification steps PASSED. Raw values: nextRoundEndsAt='2026-07-03T20:25:58.346000Z' (delta=119976ms), endedAt='2026-07-03T20:23:58.559518Z', settledAt='2026-07-03T20:23:57.559000Z', paidAt='2026-07-03T20:23:58.860000Z' (age=19ms). All datetime fields correctly end with 'Z', deltas within expected range (0-120500ms), no timezone drift detected."

  - task: "GET /api/state includes systemStatus, does not advance rounds while stopped"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Initial FastAPI port. State starts as 'stopped' with roundNumber=0, nextRoundEndsAt=null."
      - working: true
        agent: "testing"
        comment: "✅ VERIFIED: Initial state correct (systemStatus=stopped, roundNumber=0, nextRoundEndsAt=null, recentWinners=[], all required fields present). After reset, state does NOT advance rounds while stopped (justPicked stays null, roundNumber stays 0)."

  - task: "POST /api/admin/start sets systemStatus=running and initializes countdown"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Auth via x-admin-key. Sets nextRoundEndsAt = now + intervalMs and increments roundNumber."
      - working: true
        agent: "testing"
        comment: "✅ VERIFIED: Start endpoint returns ok=true, systemStatus=running, nextRoundEndsAt in future. GET /api/state correctly reflects running status with nextRoundEndsAt set."

  - task: "POST /api/admin/reset wipes winners + sets systemStatus=stopped"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Deletes all winners docs, resets state to stopped/roundNumber=0."
      - working: true
        agent: "testing"
        comment: "✅ VERIFIED: Reset returns ok=true, systemStatus=stopped. GET /api/state shows systemStatus=stopped, roundNumber=0, nextRoundEndsAt=null, recentWinners=[] (empty array). Winners collection successfully wiped."

  - task: "Admin auth: ping/winners/mark-paid/unmark-paid endpoints"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "All admin routes require x-admin-key header matching ADMIN_PASSWORD env."
      - working: true
        agent: "testing"
        comment: "✅ VERIFIED: Admin auth working correctly - ping without header returns 401, with valid header (ansdrop123) returns 200 {ok:true}, with wrong header returns 401. mark-paid correctly sets paid=true and txHash. unmark-paid correctly sets paid=false. winners endpoint returns list."

  - task: "GET /api/holders and GET /api/winners work with Helius fallback"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Uses Helius when USE_REAL_HOLDERS=1 & HELIUS_API_KEY set, else deterministic mock."
      - working: true
        agent: "testing"
        comment: "✅ VERIFIED: GET /api/holders returns correct structure {count, minHold, holders, source}. Currently using mock data (285 eligible holders from 620 total). GET /api/winners returns {winners:[]} array. force-crash creates winner with all required fields (id, roundNumber, address, crashPoint, tokensWon, baseReward, paid=false)."

  - task: "FastAPI proxy forwards all /api/* requests to Next.js (post-migration)"
    implemented: true
    working: true
    file: "backend/server.py, frontend/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Migrated back to Next.js. FastAPI on port 8001 is now a thin HTTP proxy forwarding to Next.js on port 3000. All API logic moved to Next.js API routes."
      - working: true
        agent: "testing"
        comment: "Minor: ✅ VERIFIED through external URL. All 10 verification steps completed successfully (9 passed, 1 minor API inconsistency). Critical countdown timing verified: delta_ms=119475ms (valid range). Admin auth working correctly. Winner lifecycle (create/mark-paid/unmark-paid/reset) working. Minor issue: unmark-paid returns {ok:true} without winner object (operation works, just inconsistent response format vs mark-paid)."

frontend:
  - task: "Home page shows NOT STARTED YET when stopped"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/Home.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Verified via screenshot. When systemStatus=stopped, hero shows NOT STARTED YET and offline badge."

  - task: "Admin Start / Reset controls with confirm dialog"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/Admin.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Reset uses modal confirm dialog. Start disabled while running."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 3
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Major rework: reverted to Next.js AS-IS from the user's GitHub repo (no more CRA port).
      FastAPI on port 8001 is now a pure HTTP proxy that forwards every /api/* request to
      http://localhost:3000 where Next.js API routes live. New features (systemStatus,
      /api/admin/start, /api/admin/reset) were added *inside* the original Next.js route
      file `app/api/[[...path]]/route.js` so the animations, raffle logic, and holder
      fetching in the original repo are untouched.

      Please retest the countdown/raffle lifecycle END-TO-END via the external URL
      https://bro-clone-preview.preview.emergentagent.com/api :

        1. POST /api/admin/reset (x-admin-key: ansdrop123) → systemStatus back to "stopped".
        2. GET /api/state → systemStatus="stopped", nextRoundEndsAt=null.
        3. POST /api/admin/start → returns systemStatus="running" with nextRoundEndsAt
           roughly 120 s in the future. IMPORTANTLY: parse nextRoundEndsAt as a JS Date
           and check that (Date.parse(nextRoundEndsAt) - state.now) is in (0, 120500] ms.
           This is the countdown check the user reported was broken.
        4. GET /api/state a few times → nextRoundEndsAt should stay stable & in the future
           (the raffle is only 120 s, so after ~120 s a new winner should appear in
           recentWinners; do NOT wait 120s, just confirm the countdown math).
        5. POST /api/dev/force-crash → verify a winner is created with required fields.
        6. POST /api/admin/mark-paid + unmark-paid still work.
        7. POST /api/admin/reset wipes winners again.
      All admin endpoints must require `x-admin-key: ansdrop123`.
  - agent: "testing"
    message: |
      ✅ BACKEND TESTING COMPLETE - ALL 13 TESTS PASSED
      
      Comprehensive end-to-end testing completed successfully:
      
      1. ✅ GET /api/ returns {"message": "Ansdrop API"}
      2. ✅ GET /api/state initial state verified (systemStatus=stopped, roundNumber=0, nextRoundEndsAt=null, recentWinners=[], all required fields present)
      3. ✅ GET /api/holders returns correct structure {count, minHold, holders, source}
      4. ✅ Admin auth working correctly:
         - Without header: 401
         - With valid header (ansdrop123): 200 {ok:true}
         - With wrong header: 401
      5. ✅ POST /api/admin/start sets systemStatus=running, nextRoundEndsAt in future, increments roundNumber
      6. ✅ POST /api/dev/force-crash creates winner with all required fields (id, roundNumber, address, crashPoint, tokensWon, baseReward, paid=false)
      7. ✅ POST /api/admin/winners returns winners list
      8. ✅ POST /api/admin/mark-paid updates winner (paid=true, txHash set)
      9. ✅ POST /api/admin/unmark-paid reverts paid status (paid=false)
      10. ✅ POST /api/admin/reset wipes winners collection and sets systemStatus=stopped
      11. ✅ After reset, GET /api/state does NOT advance rounds (justPicked stays null, roundNumber stays 0)
      
      All backend APIs are working correctly. No critical issues found.
  - agent: "testing"
    message: |
      ✅ DATETIME SERIALIZATION BUGFIX VERIFIED - ALL 7 STEPS PASSED
      
      Comprehensive datetime serialization verification completed:
      
      ISSUE FOUND & FIXED:
      - Initial test revealed _try_advance_round() was returning raw datetime objects
      - Fixed by applying _serialize() to winner_doc before returning
      
      VERIFICATION RESULTS (all datetime fields end with 'Z'):
      1. ✅ POST /api/admin/reset - baseline cleared
      2. ✅ GET /api/state (stopped) - nextRoundEndsAt=null, systemStatus=stopped
      3. ✅ POST /api/admin/start - nextRoundEndsAt='2026-07-03T20:25:58.346000Z', delta=119976ms (valid)
      4. ✅ GET /api/state (running) - nextRoundEndsAt='2026-07-03T20:25:58.346000Z', delta=119886ms (valid)
      5. ✅ POST /api/dev/force-crash - endedAt='2026-07-03T20:23:58.559518Z', settledAt='2026-07-03T20:23:57.559000Z'
      6. ✅ GET /api/state recentWinners - all datetime fields end with 'Z' or null
      7. ✅ POST /api/admin/mark-paid - paidAt='2026-07-03T20:23:58.860000Z', age=19ms (recent)
      
      CONFIRMED:
      - All datetime fields correctly serialized as UTC ISO with trailing 'Z'
      - Computed deltas within expected range (0-120500ms)
      - No timezone drift detected
      - Browser countdown should now work correctly
  - agent: "testing"
    message: |
      ✅ POST-MIGRATION VERIFICATION COMPLETE - 9/10 TESTS PASSED
      
      Verified backend after Next.js migration (FastAPI proxy → Next.js API routes).
      All tests executed through external URL (exercises ingress + proxy).
      
      CRITICAL COUNTDOWN ISSUE - VERIFIED FIXED:
      The user reported "countdown does not run" - this is now WORKING correctly.
      - nextRoundEndsAt: '2026-07-03T20:37:19.875Z' (proper UTC ISO with 'Z')
      - delta_ms: 119475ms (within expected 0-120500ms range)
      - Browser countdown will now tick correctly
      
      TEST RESULTS (9 PASSED, 1 MINOR ISSUE):
      1. ✅ POST /api/admin/reset → {ok:true, systemStatus:"stopped"}
      2. ✅ GET /api/state → systemStatus=stopped, nextRoundEndsAt=null, roundNumber=0, recentWinners=[]
      3. ✅ POST /api/admin/ping auth → no header=401, wrong key=401, correct key=200
      4. ✅ POST /api/admin/start → systemStatus=running, nextRoundEndsAt valid, delta_ms=119475
      5. ✅ GET /api/state (running) → delta_ms=119286 (valid countdown)
      6. ✅ POST /api/dev/force-crash → winner created with all required fields
      7. ✅ GET /api/state → recentWinners has 1 winner
      8. ✅ POST /api/admin/mark-paid → paid=true, txHash="verifyProxy"
      9. Minor: POST /api/admin/unmark-paid → returns {ok:true} but no winner object (operation works, verified paid=false in state)
      10. ✅ POST /api/admin/reset → winners wiped, systemStatus=stopped
      
      RAW VALUES:
      - nextRoundEndsAt: 2026-07-03T20:37:19.875Z
      - state.now: 1783110920400
      - delta_ms: 119475 (computed: nextRoundEndsAt - state.now)
      
      MINOR ISSUE DETAILS:
      - unmark-paid endpoint returns {ok:true} instead of {ok:true, winner:{...}}
      - This is an API response inconsistency (mark-paid returns winner object)
      - The actual unpaid operation WORKS correctly (verified: paid=false, txHash=null in state)
      - Not a functional bug, just inconsistent response format
