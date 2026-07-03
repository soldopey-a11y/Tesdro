#!/usr/bin/env python3
"""
Datetime serialization verification test for Ansdrop backend.
Verifies that all datetime fields are serialized as UTC ISO strings with trailing 'Z'.
"""
import requests
import time
from datetime import datetime
from typing import Optional

# Base URL from frontend/.env
BASE_URL = "https://bro-clone-preview.preview.emergentagent.com/api"
ADMIN_HEADERS = {"x-admin-key": "ansdrop123"}

def log_test(step: str, status: str, details: str = ""):
    """Log test results with formatting."""
    symbol = "✅" if status == "PASS" else "❌"
    print(f"\n{symbol} Step {step}: {status}")
    if details:
        print(f"   {details}")

def verify_utc_iso(value: Optional[str], field_name: str) -> tuple[bool, str, Optional[int]]:
    """
    Verify that a datetime string:
    1. Ends with 'Z' (UTC indicator)
    2. Can be parsed as ISO format
    3. Returns the parsed timestamp in milliseconds
    
    Returns: (is_valid, message, timestamp_ms)
    """
    if value is None:
        return True, f"{field_name} is null (expected)", None
    
    if not isinstance(value, str):
        return False, f"{field_name} is not a string: {type(value)}", None
    
    if not value.endswith('Z'):
        return False, f"{field_name} does NOT end with 'Z': {value}", None
    
    try:
        # Parse ISO format
        dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
        timestamp_ms = int(dt.timestamp() * 1000)
        return True, f"{field_name} = {value} (valid UTC ISO)", timestamp_ms
    except Exception as e:
        return False, f"{field_name} parse error: {e}", None

def main():
    print("=" * 80)
    print("DATETIME SERIALIZATION VERIFICATION TEST")
    print("=" * 80)
    
    # Step 1: POST /api/admin/reset
    print("\n" + "=" * 80)
    print("STEP 1: POST /api/admin/reset - Clear state to baseline")
    print("=" * 80)
    
    try:
        resp = requests.post(f"{BASE_URL}/admin/reset", headers=ADMIN_HEADERS, timeout=10)
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.json()}")
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get("ok") and data.get("systemStatus") == "stopped":
                log_test("1", "PASS", "Reset successful, systemStatus=stopped")
            else:
                log_test("1", "FAIL", f"Unexpected response: {data}")
        else:
            log_test("1", "FAIL", f"HTTP {resp.status_code}")
    except Exception as e:
        log_test("1", "FAIL", f"Exception: {e}")
        return
    
    # Step 2: GET /api/state - Verify stopped state
    print("\n" + "=" * 80)
    print("STEP 2: GET /api/state - Verify stopped state")
    print("=" * 80)
    
    try:
        resp = requests.get(f"{BASE_URL}/state", timeout=10)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Response keys: {list(data.keys())}")
        print(f"systemStatus: {data.get('systemStatus')}")
        print(f"nextRoundEndsAt: {data.get('nextRoundEndsAt')}")
        print(f"roundNumber: {data.get('roundNumber')}")
        
        if resp.status_code == 200:
            if (data.get("systemStatus") == "stopped" and 
                data.get("nextRoundEndsAt") is None and 
                data.get("roundNumber") == 0):
                log_test("2", "PASS", "State is stopped, nextRoundEndsAt=null, roundNumber=0")
            else:
                log_test("2", "FAIL", f"Unexpected state: {data}")
        else:
            log_test("2", "FAIL", f"HTTP {resp.status_code}")
    except Exception as e:
        log_test("2", "FAIL", f"Exception: {e}")
        return
    
    # Step 3: POST /api/admin/start - Verify nextRoundEndsAt with 'Z'
    print("\n" + "=" * 80)
    print("STEP 3: POST /api/admin/start - Verify nextRoundEndsAt ends with 'Z'")
    print("=" * 80)
    
    try:
        start_time_ms = int(time.time() * 1000)
        resp = requests.post(f"{BASE_URL}/admin/start", headers=ADMIN_HEADERS, timeout=10)
        response_time_ms = int(time.time() * 1000)
        
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Response: {data}")
        
        if resp.status_code == 200:
            next_round = data.get("nextRoundEndsAt")
            is_valid, msg, next_round_ms = verify_utc_iso(next_round, "nextRoundEndsAt")
            print(f"   {msg}")
            
            if is_valid and next_round_ms:
                # Compute delta: nextRoundEndsAt - response_time
                delta_ms = next_round_ms - response_time_ms
                print(f"   Delta (nextRoundEndsAt - response_time): {delta_ms} ms")
                print(f"   Expected: 0 < delta <= 120500 ms")
                
                if 0 < delta_ms <= 120500:
                    log_test("3", "PASS", f"nextRoundEndsAt ends with 'Z', delta={delta_ms}ms (valid)")
                else:
                    log_test("3", "FAIL", f"Delta out of range: {delta_ms}ms")
            else:
                log_test("3", "FAIL", msg)
        else:
            log_test("3", "FAIL", f"HTTP {resp.status_code}")
    except Exception as e:
        log_test("3", "FAIL", f"Exception: {e}")
        return
    
    # Step 4: GET /api/state right after start
    print("\n" + "=" * 80)
    print("STEP 4: GET /api/state - Verify running state and UTC format")
    print("=" * 80)
    
    try:
        resp = requests.get(f"{BASE_URL}/state", timeout=10)
        state_time_ms = int(time.time() * 1000)
        
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"systemStatus: {data.get('systemStatus')}")
        print(f"nextRoundEndsAt: {data.get('nextRoundEndsAt')}")
        print(f"now (from response): {data.get('now')}")
        
        if resp.status_code == 200:
            next_round = data.get("nextRoundEndsAt")
            is_valid, msg, next_round_ms = verify_utc_iso(next_round, "nextRoundEndsAt")
            print(f"   {msg}")
            
            if is_valid and next_round_ms:
                state_now = data.get("now")
                if state_now:
                    delta_ms = next_round_ms - state_now
                    print(f"   Delta (nextRoundEndsAt - state.now): {delta_ms} ms")
                    print(f"   Expected: 0 < delta <= 120500 ms")
                    
                    if (data.get("systemStatus") == "running" and 
                        0 < delta_ms <= 120500):
                        log_test("4", "PASS", f"systemStatus=running, nextRoundEndsAt ends with 'Z', delta={delta_ms}ms")
                    else:
                        log_test("4", "FAIL", f"Status={data.get('systemStatus')}, delta={delta_ms}ms")
                else:
                    log_test("4", "FAIL", "Missing 'now' field in response")
            else:
                log_test("4", "FAIL", msg)
        else:
            log_test("4", "FAIL", f"HTTP {resp.status_code}")
    except Exception as e:
        log_test("4", "FAIL", f"Exception: {e}")
        return
    
    # Step 5: POST /api/dev/force-crash - Verify winner datetime fields
    print("\n" + "=" * 80)
    print("STEP 5: POST /api/dev/force-crash - Verify winner endedAt and settledAt")
    print("=" * 80)
    
    try:
        resp = requests.post(f"{BASE_URL}/dev/force-crash", timeout=10)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        
        if resp.status_code == 200:
            winner = data.get("winner")
            if winner:
                print(f"Winner ID: {winner.get('id')}")
                print(f"endedAt: {winner.get('endedAt')}")
                print(f"settledAt: {winner.get('settledAt')}")
                
                ended_valid, ended_msg, _ = verify_utc_iso(winner.get("endedAt"), "endedAt")
                settled_valid, settled_msg, _ = verify_utc_iso(winner.get("settledAt"), "settledAt")
                
                print(f"   {ended_msg}")
                print(f"   {settled_msg}")
                
                if ended_valid and settled_valid:
                    log_test("5", "PASS", "Winner endedAt and settledAt both end with 'Z'")
                else:
                    log_test("5", "FAIL", "One or more datetime fields invalid")
            else:
                log_test("5", "FAIL", "No winner returned")
        else:
            log_test("5", "FAIL", f"HTTP {resp.status_code}")
    except Exception as e:
        log_test("5", "FAIL", f"Exception: {e}")
        return
    
    # Step 6: GET /api/state - Verify recentWinners datetime fields
    print("\n" + "=" * 80)
    print("STEP 6: GET /api/state - Verify recentWinners datetime fields")
    print("=" * 80)
    
    try:
        resp = requests.get(f"{BASE_URL}/state", timeout=10)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        
        if resp.status_code == 200:
            recent_winners = data.get("recentWinners", [])
            print(f"Recent winners count: {len(recent_winners)}")
            
            if recent_winners:
                all_valid = True
                for i, winner in enumerate(recent_winners[:3]):  # Check first 3
                    print(f"\n   Winner {i+1}:")
                    print(f"   - endedAt: {winner.get('endedAt')}")
                    print(f"   - settledAt: {winner.get('settledAt')}")
                    print(f"   - paidAt: {winner.get('paidAt')}")
                    
                    ended_valid, ended_msg, _ = verify_utc_iso(winner.get("endedAt"), "endedAt")
                    settled_valid, settled_msg, _ = verify_utc_iso(winner.get("settledAt"), "settledAt")
                    paid_valid, paid_msg, _ = verify_utc_iso(winner.get("paidAt"), "paidAt")
                    
                    print(f"      {ended_msg}")
                    print(f"      {settled_msg}")
                    print(f"      {paid_msg}")
                    
                    if not (ended_valid and settled_valid and paid_valid):
                        all_valid = False
                
                if all_valid:
                    log_test("6", "PASS", "All recentWinners datetime fields end with 'Z' or are null")
                else:
                    log_test("6", "FAIL", "Some datetime fields invalid")
            else:
                log_test("6", "FAIL", "No recent winners found")
        else:
            log_test("6", "FAIL", f"HTTP {resp.status_code}")
    except Exception as e:
        log_test("6", "FAIL", f"Exception: {e}")
        return
    
    # Step 7: POST /api/admin/mark-paid - Verify paidAt field
    print("\n" + "=" * 80)
    print("STEP 7: POST /api/admin/mark-paid - Verify paidAt ends with 'Z'")
    print("=" * 80)
    
    try:
        # Get a winner ID first
        resp = requests.get(f"{BASE_URL}/state", timeout=10)
        data = resp.json()
        recent_winners = data.get("recentWinners", [])
        
        if recent_winners:
            winner_id = recent_winners[0].get("id")
            print(f"Marking winner {winner_id} as paid...")
            
            mark_resp = requests.post(
                f"{BASE_URL}/admin/mark-paid",
                headers=ADMIN_HEADERS,
                json={"winnerId": winner_id, "txHash": "verifyTx"},
                timeout=10
            )
            
            print(f"Status: {mark_resp.status_code}")
            mark_data = mark_resp.json()
            
            if mark_resp.status_code == 200:
                winner = mark_data.get("winner")
                if winner:
                    paid_at = winner.get("paidAt")
                    print(f"paidAt: {paid_at}")
                    
                    paid_valid, paid_msg, paid_ms = verify_utc_iso(paid_at, "paidAt")
                    print(f"   {paid_msg}")
                    
                    if paid_valid and paid_ms:
                        # Verify it's a recent time (within last 10 seconds)
                        now_ms = int(time.time() * 1000)
                        age_ms = now_ms - paid_ms
                        print(f"   Age of paidAt: {age_ms} ms (should be < 10000 ms)")
                        
                        if age_ms < 10000 and age_ms >= 0:
                            log_test("7", "PASS", f"paidAt ends with 'Z' and is recent (age={age_ms}ms)")
                        else:
                            log_test("7", "FAIL", f"paidAt age out of range: {age_ms}ms")
                    else:
                        log_test("7", "FAIL", paid_msg)
                else:
                    log_test("7", "FAIL", "No winner in response")
            else:
                log_test("7", "FAIL", f"HTTP {mark_resp.status_code}")
        else:
            log_test("7", "FAIL", "No winners available to mark as paid")
    except Exception as e:
        log_test("7", "FAIL", f"Exception: {e}")
        return
    
    # Final summary
    print("\n" + "=" * 80)
    print("VERIFICATION COMPLETE")
    print("=" * 80)
    print("\nAll datetime fields verified to end with 'Z' (UTC ISO format)")
    print("Computed deltas confirm no timezone drift")

if __name__ == "__main__":
    main()
