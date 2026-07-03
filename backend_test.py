"""
Comprehensive backend test for Ansdrop FastAPI lifecycle.
Tests the complete flow: state, admin auth, start, crash, winners, mark-paid, reset.
"""
import requests
import time
from datetime import datetime, timezone

# Configuration
BASE_URL = "https://bro-clone-preview.preview.emergentagent.com/api"
ADMIN_PASSWORD = "ansdrop123"
ADMIN_HEADERS = {"x-admin-key": ADMIN_PASSWORD}

def log_step(step_num, description):
    print(f"\n{'='*80}")
    print(f"STEP {step_num}: {description}")
    print('='*80)

def log_result(success, message):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")

def log_detail(key, value):
    print(f"  → {key}: {value}")

# Test results tracking
results = {
    "passed": [],
    "failed": [],
    "warnings": []
}

def record_result(step, success, message):
    if success:
        results["passed"].append(f"Step {step}: {message}")
    else:
        results["failed"].append(f"Step {step}: {message}")
    log_result(success, message)

# ============================================================================
# STEP 1: Test root endpoint
# ============================================================================
log_step(1, "GET /api/ — should return {\"message\": \"Ansdrop API\"}")
try:
    resp = requests.get(f"{BASE_URL}/", timeout=10)
    data = resp.json()
    if resp.status_code == 200 and data.get("message") == "Ansdrop API":
        record_result(1, True, "Root endpoint returned correct message")
    else:
        record_result(1, False, f"Unexpected response: {resp.status_code} {data}")
except Exception as e:
    record_result(1, False, f"Exception: {e}")

# ============================================================================
# STEP 2: Test initial state after fresh reset
# ============================================================================
log_step(2, "GET /api/state — verify initial state (stopped, roundNumber=0, etc.)")
try:
    resp = requests.get(f"{BASE_URL}/state", timeout=10)
    state = resp.json()
    
    log_detail("systemStatus", state.get("systemStatus"))
    log_detail("roundNumber", state.get("roundNumber"))
    log_detail("nextRoundEndsAt", state.get("nextRoundEndsAt"))
    log_detail("recentWinners length", len(state.get("recentWinners", [])))
    log_detail("justPicked", state.get("justPicked"))
    log_detail("intervalMs", state.get("intervalMs"))
    log_detail("minEligibleHold", state.get("minEligibleHold"))
    log_detail("eligibleCount", state.get("eligibleCount"))
    log_detail("totalHolders", state.get("totalHolders"))
    log_detail("holderSource", state.get("holderSource"))
    
    checks = []
    if state.get("systemStatus") == "stopped":
        checks.append("systemStatus is 'stopped'")
    else:
        checks.append(f"❌ systemStatus is '{state.get('systemStatus')}' (expected 'stopped')")
    
    if state.get("nextRoundEndsAt") is None:
        checks.append("nextRoundEndsAt is null")
    else:
        checks.append(f"❌ nextRoundEndsAt is '{state.get('nextRoundEndsAt')}' (expected null)")
    
    if state.get("roundNumber") == 0:
        checks.append("roundNumber is 0")
    else:
        checks.append(f"❌ roundNumber is {state.get('roundNumber')} (expected 0)")
    
    if isinstance(state.get("recentWinners"), list):
        checks.append(f"recentWinners is array (length: {len(state.get('recentWinners', []))})")
    else:
        checks.append(f"❌ recentWinners is not an array")
    
    if state.get("justPicked") is None:
        checks.append("justPicked is null")
    else:
        checks.append(f"⚠️ justPicked is not null: {state.get('justPicked')}")
    
    if state.get("intervalMs") == 120000:
        checks.append("intervalMs is 120000")
    else:
        checks.append(f"⚠️ intervalMs is {state.get('intervalMs')} (expected 120000)")
    
    if state.get("minEligibleHold") == 50000:
        checks.append("minEligibleHold is 50000")
    else:
        checks.append(f"⚠️ minEligibleHold is {state.get('minEligibleHold')} (expected 50000)")
    
    # Check required fields exist
    required_fields = ["eligibleCount", "totalHolders", "holderSource"]
    for field in required_fields:
        if field in state:
            checks.append(f"{field} exists")
        else:
            checks.append(f"❌ {field} missing")
    
    all_passed = all("❌" not in check for check in checks)
    for check in checks:
        print(f"  → {check}")
    
    if all_passed:
        record_result(2, True, "Initial state verified correctly")
    else:
        record_result(2, False, "Initial state has issues (see details above)")
        
except Exception as e:
    record_result(2, False, f"Exception: {e}")

# ============================================================================
# STEP 3: Test holders endpoint
# ============================================================================
log_step(3, "GET /api/holders?limit=10 — returns {count, minHold, holders, source}")
try:
    resp = requests.get(f"{BASE_URL}/holders?limit=10", timeout=10)
    data = resp.json()
    
    log_detail("count", data.get("count"))
    log_detail("minHold", data.get("minHold"))
    log_detail("holders length", len(data.get("holders", [])))
    log_detail("source", data.get("source"))
    
    checks = []
    if "count" in data:
        checks.append(f"count field exists: {data['count']}")
    else:
        checks.append("❌ count field missing")
    
    if "minHold" in data:
        checks.append(f"minHold field exists: {data['minHold']}")
    else:
        checks.append("❌ minHold field missing")
    
    if "holders" in data and isinstance(data["holders"], list):
        checks.append(f"holders is array with {len(data['holders'])} items")
    else:
        checks.append("❌ holders field missing or not array")
    
    if "source" in data:
        checks.append(f"source field exists: {data['source']}")
    else:
        checks.append("❌ source field missing")
    
    all_passed = all("❌" not in check for check in checks)
    for check in checks:
        print(f"  → {check}")
    
    if all_passed:
        record_result(3, True, "Holders endpoint returned correct structure")
    else:
        record_result(3, False, "Holders endpoint has issues")
        
except Exception as e:
    record_result(3, False, f"Exception: {e}")

# ============================================================================
# STEP 4: Test admin auth
# ============================================================================
log_step(4, "Admin auth: POST /api/admin/ping with/without header")

# 4a: Without header (should be 401)
try:
    resp = requests.post(f"{BASE_URL}/admin/ping", timeout=10)
    if resp.status_code == 401:
        record_result("4a", True, "Ping without header returned 401")
    else:
        record_result("4a", False, f"Ping without header returned {resp.status_code} (expected 401)")
except Exception as e:
    record_result("4a", False, f"Exception: {e}")

# 4b: With valid header (should be 200)
try:
    resp = requests.post(f"{BASE_URL}/admin/ping", headers=ADMIN_HEADERS, timeout=10)
    data = resp.json()
    if resp.status_code == 200 and data.get("ok") is True:
        record_result("4b", True, "Ping with valid header returned 200 {ok: true}")
    else:
        record_result("4b", False, f"Ping with valid header returned {resp.status_code} {data}")
except Exception as e:
    record_result("4b", False, f"Exception: {e}")

# 4c: With wrong header (should be 401)
try:
    resp = requests.post(f"{BASE_URL}/admin/ping", headers={"x-admin-key": "wrongpassword"}, timeout=10)
    if resp.status_code == 401:
        record_result("4c", True, "Ping with wrong header returned 401")
    else:
        record_result("4c", False, f"Ping with wrong header returned {resp.status_code} (expected 401)")
except Exception as e:
    record_result("4c", False, f"Exception: {e}")

# ============================================================================
# STEP 5: Test admin start
# ============================================================================
log_step(5, "POST /api/admin/start — should set systemStatus=running and nextRoundEndsAt")
try:
    resp = requests.post(f"{BASE_URL}/admin/start", headers=ADMIN_HEADERS, timeout=10)
    data = resp.json()
    
    log_detail("ok", data.get("ok"))
    log_detail("systemStatus", data.get("systemStatus"))
    log_detail("roundNumber", data.get("roundNumber"))
    log_detail("nextRoundEndsAt", data.get("nextRoundEndsAt"))
    
    checks = []
    if data.get("ok") is True:
        checks.append("ok is true")
    else:
        checks.append(f"❌ ok is {data.get('ok')}")
    
    if data.get("systemStatus") == "running":
        checks.append("systemStatus is 'running'")
    else:
        checks.append(f"❌ systemStatus is '{data.get('systemStatus')}' (expected 'running')")
    
    if data.get("nextRoundEndsAt"):
        # Verify it's in the future
        try:
            next_end = datetime.fromisoformat(data["nextRoundEndsAt"].replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            if next_end > now:
                checks.append(f"nextRoundEndsAt is in the future")
            else:
                checks.append(f"❌ nextRoundEndsAt is not in the future")
        except:
            checks.append(f"⚠️ nextRoundEndsAt format issue: {data.get('nextRoundEndsAt')}")
    else:
        checks.append(f"❌ nextRoundEndsAt is null or missing")
    
    all_passed = all("❌" not in check for check in checks)
    for check in checks:
        print(f"  → {check}")
    
    if all_passed:
        record_result(5, True, "Start endpoint set system to running")
    else:
        record_result(5, False, "Start endpoint has issues")
    
    # Verify state reflects the change
    print("\n  Verifying GET /api/state reflects running status...")
    resp_state = requests.get(f"{BASE_URL}/state", timeout=10)
    state = resp_state.json()
    
    log_detail("state.systemStatus", state.get("systemStatus"))
    log_detail("state.nextRoundEndsAt", state.get("nextRoundEndsAt"))
    
    if state.get("systemStatus") == "running" and state.get("nextRoundEndsAt"):
        print("  → ✅ State correctly shows running with nextRoundEndsAt")
    else:
        print(f"  → ❌ State not updated correctly: systemStatus={state.get('systemStatus')}, nextRoundEndsAt={state.get('nextRoundEndsAt')}")
        record_result(5, False, "State not updated after start")
        
except Exception as e:
    record_result(5, False, f"Exception: {e}")

# ============================================================================
# STEP 6: Test force-crash
# ============================================================================
log_step(6, "POST /api/dev/force-crash — forces round to end and picks winner")
try:
    resp = requests.post(f"{BASE_URL}/dev/force-crash", timeout=10)
    data = resp.json()
    
    log_detail("ok", data.get("ok"))
    winner = data.get("winner")
    
    if winner:
        log_detail("winner.id", winner.get("id"))
        log_detail("winner.roundNumber", winner.get("roundNumber"))
        log_detail("winner.address", winner.get("address"))
        log_detail("winner.crashPoint", winner.get("crashPoint"))
        log_detail("winner.tokensWon", winner.get("tokensWon"))
        log_detail("winner.baseReward", winner.get("baseReward"))
        log_detail("winner.paid", winner.get("paid"))
        
        checks = []
        required_fields = ["id", "roundNumber", "address", "crashPoint", "tokensWon", "baseReward", "paid"]
        for field in required_fields:
            if field in winner:
                checks.append(f"{field} exists: {winner[field]}")
            else:
                checks.append(f"❌ {field} missing")
        
        if winner.get("paid") is False:
            checks.append("paid is false (correct)")
        else:
            checks.append(f"❌ paid is {winner.get('paid')} (expected false)")
        
        all_passed = all("❌" not in check for check in checks)
        for check in checks:
            print(f"  → {check}")
        
        if all_passed:
            record_result(6, True, "Force-crash created winner with correct fields")
            # Store winner ID for later tests
            global WINNER_ID
            WINNER_ID = winner.get("id")
        else:
            record_result(6, False, "Force-crash winner has issues")
    else:
        record_result(6, False, "Force-crash did not return winner object")
    
    # Verify state shows recentWinners
    print("\n  Verifying GET /api/state shows recentWinners...")
    resp_state = requests.get(f"{BASE_URL}/state", timeout=10)
    state = resp_state.json()
    recent = state.get("recentWinners", [])
    
    log_detail("recentWinners length", len(recent))
    if len(recent) >= 1:
        print("  → ✅ recentWinners has at least 1 entry")
    else:
        print("  → ❌ recentWinners is empty")
        record_result(6, False, "recentWinners not updated after crash")
        
except Exception as e:
    record_result(6, False, f"Exception: {e}")

# ============================================================================
# STEP 7: Test admin winners endpoint
# ============================================================================
log_step(7, "POST /api/admin/winners — returns list of winners")
try:
    resp = requests.post(f"{BASE_URL}/admin/winners", headers=ADMIN_HEADERS, timeout=10)
    data = resp.json()
    
    winners = data.get("winners", [])
    log_detail("winners length", len(winners))
    
    if isinstance(winners, list) and len(winners) >= 1:
        record_result(7, True, f"Admin winners returned {len(winners)} winner(s)")
        log_detail("First winner ID", winners[0].get("id"))
    else:
        record_result(7, False, "Admin winners returned empty or invalid list")
        
except Exception as e:
    record_result(7, False, f"Exception: {e}")

# ============================================================================
# STEP 8: Test mark-paid
# ============================================================================
log_step(8, "POST /api/admin/mark-paid — mark winner as paid")
try:
    if 'WINNER_ID' not in globals():
        # Try to get a winner ID from the winners list
        resp = requests.post(f"{BASE_URL}/admin/winners", headers=ADMIN_HEADERS, timeout=10)
        winners = resp.json().get("winners", [])
        if winners:
            WINNER_ID = winners[0].get("id")
        else:
            raise Exception("No winner ID available for testing")
    
    payload = {"winnerId": WINNER_ID, "txHash": "testTx123"}
    resp = requests.post(f"{BASE_URL}/admin/mark-paid", headers=ADMIN_HEADERS, json=payload, timeout=10)
    data = resp.json()
    
    log_detail("ok", data.get("ok"))
    winner = data.get("winner")
    
    if winner:
        log_detail("winner.paid", winner.get("paid"))
        log_detail("winner.txHash", winner.get("txHash"))
        
        checks = []
        if data.get("ok") is True:
            checks.append("ok is true")
        else:
            checks.append(f"❌ ok is {data.get('ok')}")
        
        if winner.get("paid") is True:
            checks.append("paid is true")
        else:
            checks.append(f"❌ paid is {winner.get('paid')} (expected true)")
        
        if winner.get("txHash") == "testTx123":
            checks.append("txHash is 'testTx123'")
        else:
            checks.append(f"❌ txHash is '{winner.get('txHash')}' (expected 'testTx123')")
        
        all_passed = all("❌" not in check for check in checks)
        for check in checks:
            print(f"  → {check}")
        
        if all_passed:
            record_result(8, True, "Mark-paid updated winner correctly")
        else:
            record_result(8, False, "Mark-paid has issues")
    else:
        record_result(8, False, "Mark-paid did not return winner object")
        
except Exception as e:
    record_result(8, False, f"Exception: {e}")

# ============================================================================
# STEP 9: Test unmark-paid
# ============================================================================
log_step(9, "POST /api/admin/unmark-paid — unmark winner as paid")
try:
    if 'WINNER_ID' not in globals():
        raise Exception("No winner ID available for testing")
    
    payload = {"winnerId": WINNER_ID}
    resp = requests.post(f"{BASE_URL}/admin/unmark-paid", headers=ADMIN_HEADERS, json=payload, timeout=10)
    data = resp.json()
    
    log_detail("ok", data.get("ok"))
    
    if data.get("ok") is True:
        # Verify by checking winners list
        resp_winners = requests.post(f"{BASE_URL}/admin/winners", headers=ADMIN_HEADERS, timeout=10)
        winners = resp_winners.json().get("winners", [])
        target_winner = next((w for w in winners if w.get("id") == WINNER_ID), None)
        
        if target_winner:
            log_detail("winner.paid", target_winner.get("paid"))
            if target_winner.get("paid") is False:
                record_result(9, True, "Unmark-paid set paid to false")
            else:
                record_result(9, False, f"Unmark-paid did not set paid to false (paid={target_winner.get('paid')})")
        else:
            record_result(9, False, "Could not find winner to verify unmark-paid")
    else:
        record_result(9, False, f"Unmark-paid returned ok={data.get('ok')}")
        
except Exception as e:
    record_result(9, False, f"Exception: {e}")

# ============================================================================
# STEP 10: Test admin reset
# ============================================================================
log_step(10, "POST /api/admin/reset — wipes winners and sets systemStatus=stopped")
try:
    resp = requests.post(f"{BASE_URL}/admin/reset", headers=ADMIN_HEADERS, timeout=10)
    data = resp.json()
    
    log_detail("ok", data.get("ok"))
    log_detail("systemStatus", data.get("systemStatus"))
    
    checks = []
    if data.get("ok") is True:
        checks.append("ok is true")
    else:
        checks.append(f"❌ ok is {data.get('ok')}")
    
    if data.get("systemStatus") == "stopped":
        checks.append("systemStatus is 'stopped'")
    else:
        checks.append(f"❌ systemStatus is '{data.get('systemStatus')}' (expected 'stopped')")
    
    all_passed = all("❌" not in check for check in checks)
    for check in checks:
        print(f"  → {check}")
    
    # Verify state reflects reset
    print("\n  Verifying GET /api/state reflects reset...")
    resp_state = requests.get(f"{BASE_URL}/state", timeout=10)
    state = resp_state.json()
    
    log_detail("state.systemStatus", state.get("systemStatus"))
    log_detail("state.roundNumber", state.get("roundNumber"))
    log_detail("state.nextRoundEndsAt", state.get("nextRoundEndsAt"))
    log_detail("state.recentWinners length", len(state.get("recentWinners", [])))
    
    state_checks = []
    if state.get("systemStatus") == "stopped":
        state_checks.append("systemStatus is 'stopped'")
    else:
        state_checks.append(f"❌ systemStatus is '{state.get('systemStatus')}'")
    
    if state.get("roundNumber") == 0:
        state_checks.append("roundNumber is 0")
    else:
        state_checks.append(f"❌ roundNumber is {state.get('roundNumber')}")
    
    if state.get("nextRoundEndsAt") is None:
        state_checks.append("nextRoundEndsAt is null")
    else:
        state_checks.append(f"❌ nextRoundEndsAt is '{state.get('nextRoundEndsAt')}'")
    
    if len(state.get("recentWinners", [])) == 0:
        state_checks.append("recentWinners is empty array")
    else:
        state_checks.append(f"❌ recentWinners has {len(state.get('recentWinners', []))} items (expected 0)")
    
    all_state_passed = all("❌" not in check for check in state_checks)
    for check in state_checks:
        print(f"  → {check}")
    
    if all_passed and all_state_passed:
        record_result(10, True, "Reset wiped winners and set system to stopped")
    else:
        record_result(10, False, "Reset has issues (see details above)")
        
except Exception as e:
    record_result(10, False, f"Exception: {e}")

# ============================================================================
# STEP 11: Verify state doesn't advance after reset
# ============================================================================
log_step(11, "After reset, verify GET /api/state does NOT advance rounds")
try:
    # Get state twice with a small delay
    resp1 = requests.get(f"{BASE_URL}/state", timeout=10)
    state1 = resp1.json()
    
    time.sleep(2)
    
    resp2 = requests.get(f"{BASE_URL}/state", timeout=10)
    state2 = resp2.json()
    
    log_detail("First call - justPicked", state1.get("justPicked"))
    log_detail("First call - roundNumber", state1.get("roundNumber"))
    log_detail("Second call - justPicked", state2.get("justPicked"))
    log_detail("Second call - roundNumber", state2.get("roundNumber"))
    
    checks = []
    if state1.get("justPicked") is None:
        checks.append("First call: justPicked is null")
    else:
        checks.append(f"❌ First call: justPicked is not null")
    
    if state2.get("justPicked") is None:
        checks.append("Second call: justPicked is null")
    else:
        checks.append(f"❌ Second call: justPicked is not null")
    
    if state1.get("roundNumber") == 0 and state2.get("roundNumber") == 0:
        checks.append("roundNumber stayed at 0 (no advancement)")
    else:
        checks.append(f"❌ roundNumber changed: {state1.get('roundNumber')} → {state2.get('roundNumber')}")
    
    all_passed = all("❌" not in check for check in checks)
    for check in checks:
        print(f"  → {check}")
    
    if all_passed:
        record_result(11, True, "State does not advance rounds while stopped")
    else:
        record_result(11, False, "State advanced rounds while stopped (should not)")
        
except Exception as e:
    record_result(11, False, f"Exception: {e}")

# ============================================================================
# FINAL SUMMARY
# ============================================================================
print("\n" + "="*80)
print("FINAL TEST SUMMARY")
print("="*80)

print(f"\n✅ PASSED: {len(results['passed'])}")
for item in results['passed']:
    print(f"  • {item}")

if results['failed']:
    print(f"\n❌ FAILED: {len(results['failed'])}")
    for item in results['failed']:
        print(f"  • {item}")
else:
    print(f"\n❌ FAILED: 0")

if results['warnings']:
    print(f"\n⚠️  WARNINGS: {len(results['warnings'])}")
    for item in results['warnings']:
        print(f"  • {item}")

print("\n" + "="*80)
if not results['failed']:
    print("🎉 ALL TESTS PASSED!")
else:
    print(f"⚠️  {len(results['failed'])} TEST(S) FAILED")
print("="*80)
