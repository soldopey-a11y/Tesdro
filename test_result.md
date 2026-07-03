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
  test_sequence: 2
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Bugfix: `nextRoundEndsAt` (and every other datetime field) was serialized without
      timezone info, so browsers parsed it as local time and the countdown was off by
      the client's timezone offset. Added an `_iso_utc` helper that always emits UTC
      ISO strings with a trailing `Z`. Please retest:
        1. GET /api/state — verify `nextRoundEndsAt`, `recentWinners[*].endedAt`,
           `recentWinners[*].settledAt`, `recentWinners[*].paidAt` (when set) all end
           with 'Z' AND represent a time in the future relative to the returned `now`
           (for nextRoundEndsAt when running).
        2. POST /api/admin/start — response `nextRoundEndsAt` also ends with 'Z' and is
           roughly `now + 120000` ms in the future.
        3. Sanity: parse the returned `nextRoundEndsAt` as ISO and confirm that
           `(nextRoundEndsAt - now)` is between 0 and intervalMs (120000ms) inclusive.
      All other endpoints should still behave as before.
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
