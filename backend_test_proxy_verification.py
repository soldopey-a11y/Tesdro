#!/usr/bin/env python3
"""
Comprehensive backend verification after Next.js migration.
Tests the FastAPI proxy forwarding to Next.js API routes.

This test verifies the critical countdown timing issue reported by the user.
"""
import requests
import time
from datetime import datetime
from typing import Optional, Dict, Any

# External URL - exercises both ingress and proxy
BASE_URL = "https://bro-clone-preview.preview.emergentagent.com/api"
ADMIN_HEADERS = {"x-admin-key": "ansdrop123"}

class TestResult:
    def __init__(self):
        self.passed = []
        self.failed = []
        self.raw_values = {}
    
    def log_pass(self, step: str, message: str):
        self.passed.append(f"Step {step}: {message}")
        print(f"✅ Step {step}: PASS - {message}")
    
    def log_fail(self, step: str, message: str):
        self.failed.append(f"Step {step}: {message}")
        print(f"❌ Step {step}: FAIL - {message}")
    
    def store_raw(self, key: str, value: Any):
        self.raw_values[key] = value
        print(f"   📊 {key}: {value}")

def parse_iso_to_ms(iso_string: str) -> Optional[int]:
    """Parse ISO datetime string to milliseconds timestamp."""
    try:
        dt = datetime.fromisoformat(iso_string.replace('Z', '+00:00'))
        return int(dt.timestamp() * 1000)
    except Exception as e:
        print(f"   ⚠️  Parse error: {e}")
        return None

def main():
    result = TestResult()
    
    print("=" * 80)
    print("ANSDROP BACKEND VERIFICATION - POST NEXT.JS MIGRATION")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Testing through external URL (exercises ingress + proxy)")
    print("=" * 80)
    
    # ========================================================================
    # STEP 1: POST /api/admin/reset
    # ========================================================================
    print("\n" + "=" * 80)
    print("STEP 1: POST /api/admin/reset")
    print("=" * 80)
    
    try:
        resp = requests.post(f"{BASE_URL}/admin/reset", headers=ADMIN_HEADERS, timeout=10)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Response: {data}")
        
        if resp.status_code == 200 and data.get("ok") and data.get("systemStatus") == "stopped":
            result.log_pass("1", "Reset successful, systemStatus=stopped")
        else:
            result.log_fail("1", f"Expected ok=true and systemStatus=stopped, got: {data}")
    except Exception as e:
        result.log_fail("1", f"Exception: {e}")
        return result
    
    # ========================================================================
    # STEP 2: GET /api/state - Verify stopped state
    # ========================================================================
    print("\n" + "=" * 80)
    print("STEP 2: GET /api/state - Verify stopped state")
    print("=" * 80)
    
    try:
        resp = requests.get(f"{BASE_URL}/state", timeout=10)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        
        result.store_raw("state_after_reset", {
            "systemStatus": data.get("systemStatus"),
            "nextRoundEndsAt": data.get("nextRoundEndsAt"),
            "roundNumber": data.get("roundNumber"),
            "recentWinners": len(data.get("recentWinners", []))
        })
        
        if (resp.status_code == 200 and 
            data.get("systemStatus") == "stopped" and 
            data.get("nextRoundEndsAt") is None and 
            data.get("roundNumber") == 0 and
            len(data.get("recentWinners", [])) == 0):
            result.log_pass("2", "State correct: stopped, nextRoundEndsAt=null, roundNumber=0, recentWinners=[]")
        else:
            result.log_fail("2", f"Unexpected state: {data}")
    except Exception as e:
        result.log_fail("2", f"Exception: {e}")
        return result
    
    # ========================================================================
    # STEP 3: POST /api/admin/ping - Test auth
    # ========================================================================
    print("\n" + "=" * 80)
    print("STEP 3: POST /api/admin/ping - Test authentication")
    print("=" * 80)
    
    auth_tests = []
    
    # 3a: No header
    try:
        resp = requests.post(f"{BASE_URL}/admin/ping", timeout=10)
        print(f"Without header - Status: {resp.status_code}")
        if resp.status_code == 401:
            auth_tests.append(True)
            print("   ✓ Correctly rejected (401)")
        else:
            auth_tests.append(False)
            print(f"   ✗ Expected 401, got {resp.status_code}")
    except Exception as e:
        auth_tests.append(False)
        print(f"   ✗ Exception: {e}")
    
    # 3b: Wrong key
    try:
        resp = requests.post(f"{BASE_URL}/admin/ping", headers={"x-admin-key": "wrongkey"}, timeout=10)
        print(f"With wrong key - Status: {resp.status_code}")
        if resp.status_code == 401:
            auth_tests.append(True)
            print("   ✓ Correctly rejected (401)")
        else:
            auth_tests.append(False)
            print(f"   ✗ Expected 401, got {resp.status_code}")
    except Exception as e:
        auth_tests.append(False)
        print(f"   ✗ Exception: {e}")
    
    # 3c: Correct key
    try:
        resp = requests.post(f"{BASE_URL}/admin/ping", headers=ADMIN_HEADERS, timeout=10)
        print(f"With correct key - Status: {resp.status_code}")
        data = resp.json()
        print(f"Response: {data}")
        if resp.status_code == 200 and data.get("ok"):
            auth_tests.append(True)
            print("   ✓ Correctly accepted (200, ok=true)")
        else:
            auth_tests.append(False)
            print(f"   ✗ Expected 200 with ok=true, got {resp.status_code}: {data}")
    except Exception as e:
        auth_tests.append(False)
        print(f"   ✗ Exception: {e}")
    
    if all(auth_tests):
        result.log_pass("3", "Auth working: no header→401, wrong key→401, correct key→200")
    else:
        result.log_fail("3", f"Auth issues detected: {auth_tests}")
    
    # ========================================================================
    # STEP 4: POST /api/admin/start - CRITICAL COUNTDOWN TEST
    # ========================================================================
    print("\n" + "=" * 80)
    print("STEP 4: POST /api/admin/start - CRITICAL COUNTDOWN TIMING TEST")
    print("=" * 80)
    
    try:
        before_ms = int(time.time() * 1000)
        resp = requests.post(f"{BASE_URL}/admin/start", headers=ADMIN_HEADERS, timeout=10)
        after_ms = int(time.time() * 1000)
        
        print(f"Status: {resp.status_code}")
        data = resp.json()
        print(f"Response: {data}")
        
        if resp.status_code == 200:
            next_round_str = data.get("nextRoundEndsAt")
            result.store_raw("nextRoundEndsAt_from_start", next_round_str)
            
            # Get state.now for accurate delta calculation
            state_resp = requests.get(f"{BASE_URL}/state", timeout=10)
            state_data = state_resp.json()
            state_now_ms = state_data.get("now")
            
            result.store_raw("state.now_after_start", state_now_ms)
            
            if next_round_str and state_now_ms:
                next_round_ms = parse_iso_to_ms(next_round_str)
                
                if next_round_ms:
                    delta_ms = next_round_ms - state_now_ms
                    result.store_raw("delta_ms_computed", delta_ms)
                    
                    print(f"\n   🔍 COUNTDOWN VERIFICATION:")
                    print(f"   nextRoundEndsAt (ISO): {next_round_str}")
                    print(f"   nextRoundEndsAt (ms):  {next_round_ms}")
                    print(f"   state.now (ms):        {state_now_ms}")
                    print(f"   delta_ms:              {delta_ms}")
                    print(f"   Expected range:        0 < delta_ms <= 120500")
                    
                    if (data.get("ok") and 
                        data.get("systemStatus") == "running" and
                        0 < delta_ms <= 120500):
                        result.log_pass("4", f"Start successful: systemStatus=running, nextRoundEndsAt valid, delta_ms={delta_ms} (in range)")
                    else:
                        result.log_fail("4", f"Delta out of range or status wrong: delta_ms={delta_ms}, status={data.get('systemStatus')}")
                else:
                    result.log_fail("4", f"Could not parse nextRoundEndsAt: {next_round_str}")
            else:
                result.log_fail("4", f"Missing nextRoundEndsAt or state.now")
        else:
            result.log_fail("4", f"HTTP {resp.status_code}")
    except Exception as e:
        result.log_fail("4", f"Exception: {e}")
        return result
    
    # ========================================================================
    # STEP 5: GET /api/state - Verify running state
    # ========================================================================
    print("\n" + "=" * 80)
    print("STEP 5: GET /api/state - Verify running state and countdown")
    print("=" * 80)
    
    try:
        resp = requests.get(f"{BASE_URL}/state", timeout=10)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        
        next_round_str = data.get("nextRoundEndsAt")
        state_now_ms = data.get("now")
        
        result.store_raw("state_running", {
            "systemStatus": data.get("systemStatus"),
            "nextRoundEndsAt": next_round_str,
            "now": state_now_ms
        })
        
        if next_round_str and state_now_ms:
            next_round_ms = parse_iso_to_ms(next_round_str)
            if next_round_ms:
                delta_ms = next_round_ms - state_now_ms
                result.store_raw("delta_ms_from_state", delta_ms)
                
                print(f"   delta_ms: {delta_ms}")
                
                if (resp.status_code == 200 and
                    data.get("systemStatus") == "running" and
                    0 < delta_ms <= 120500):
                    result.log_pass("5", f"State running correctly, delta_ms={delta_ms} (valid)")
                else:
                    result.log_fail("5", f"Status or delta invalid: status={data.get('systemStatus')}, delta={delta_ms}")
            else:
                result.log_fail("5", f"Could not parse nextRoundEndsAt")
        else:
            result.log_fail("5", f"Missing nextRoundEndsAt or now")
    except Exception as e:
        result.log_fail("5", f"Exception: {e}")
        return result
    
    # ========================================================================
    # STEP 6: POST /api/dev/force-crash
    # ========================================================================
    print("\n" + "=" * 80)
    print("STEP 6: POST /api/dev/force-crash")
    print("=" * 80)
    
    winner_id = None
    try:
        resp = requests.post(f"{BASE_URL}/dev/force-crash", timeout=10)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        
        if resp.status_code == 200:
            winner = data.get("winner")
            if winner:
                winner_id = winner.get("id")
                result.store_raw("winner_from_crash", {
                    "id": winner_id,
                    "roundNumber": winner.get("roundNumber"),
                    "address": winner.get("address"),
                    "crashPoint": winner.get("crashPoint"),
                    "tokensWon": winner.get("tokensWon"),
                    "baseReward": winner.get("baseReward"),
                    "paid": winner.get("paid"),
                    "endedAt": winner.get("endedAt")
                })
                
                required_fields = ["id", "roundNumber", "address", "crashPoint", "tokensWon", "baseReward", "paid", "endedAt"]
                missing = [f for f in required_fields if f not in winner]
                
                if not missing and winner.get("paid") == False:
                    result.log_pass("6", f"Winner created with all required fields, paid=false, id={winner_id}")
                else:
                    result.log_fail("6", f"Missing fields: {missing} or paid != false")
            else:
                result.log_fail("6", "No winner in response")
        else:
            result.log_fail("6", f"HTTP {resp.status_code}")
    except Exception as e:
        result.log_fail("6", f"Exception: {e}")
        return result
    
    # ========================================================================
    # STEP 7: GET /api/state - Verify recentWinners
    # ========================================================================
    print("\n" + "=" * 80)
    print("STEP 7: GET /api/state - Verify recentWinners")
    print("=" * 80)
    
    try:
        resp = requests.get(f"{BASE_URL}/state", timeout=10)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        
        recent_winners = data.get("recentWinners", [])
        result.store_raw("recentWinners_count", len(recent_winners))
        
        if resp.status_code == 200 and len(recent_winners) >= 1:
            result.log_pass("7", f"recentWinners has {len(recent_winners)} winner(s)")
        else:
            result.log_fail("7", f"Expected at least 1 winner, got {len(recent_winners)}")
    except Exception as e:
        result.log_fail("7", f"Exception: {e}")
        return result
    
    # ========================================================================
    # STEP 8: POST /api/admin/mark-paid
    # ========================================================================
    print("\n" + "=" * 80)
    print("STEP 8: POST /api/admin/mark-paid")
    print("=" * 80)
    
    if not winner_id:
        result.log_fail("8", "No winner_id from step 6")
    else:
        try:
            resp = requests.post(
                f"{BASE_URL}/admin/mark-paid",
                headers=ADMIN_HEADERS,
                json={"winnerId": winner_id, "txHash": "verifyProxy"},
                timeout=10
            )
            print(f"Status: {resp.status_code}")
            data = resp.json()
            
            if resp.status_code == 200:
                winner = data.get("winner")
                if winner and winner.get("paid") == True and winner.get("txHash") == "verifyProxy":
                    result.store_raw("mark_paid_winner", {
                        "id": winner.get("id"),
                        "paid": winner.get("paid"),
                        "txHash": winner.get("txHash")
                    })
                    result.log_pass("8", f"Winner marked as paid, txHash=verifyProxy")
                else:
                    result.log_fail("8", f"Expected paid=true and txHash=verifyProxy, got: {winner}")
            else:
                result.log_fail("8", f"HTTP {resp.status_code}")
        except Exception as e:
            result.log_fail("8", f"Exception: {e}")
    
    # ========================================================================
    # STEP 9: POST /api/admin/unmark-paid
    # ========================================================================
    print("\n" + "=" * 80)
    print("STEP 9: POST /api/admin/unmark-paid")
    print("=" * 80)
    
    if not winner_id:
        result.log_fail("9", "No winner_id from step 6")
    else:
        try:
            resp = requests.post(
                f"{BASE_URL}/admin/unmark-paid",
                headers=ADMIN_HEADERS,
                json={"winnerId": winner_id},
                timeout=10
            )
            print(f"Status: {resp.status_code}")
            data = resp.json()
            
            if resp.status_code == 200:
                winner = data.get("winner")
                if winner and winner.get("paid") == False:
                    result.store_raw("unmark_paid_winner", {
                        "id": winner.get("id"),
                        "paid": winner.get("paid")
                    })
                    result.log_pass("9", f"Winner unmarked, paid=false")
                else:
                    result.log_fail("9", f"Expected paid=false, got: {winner}")
            else:
                result.log_fail("9", f"HTTP {resp.status_code}")
        except Exception as e:
            result.log_fail("9", f"Exception: {e}")
    
    # ========================================================================
    # STEP 10: POST /api/admin/reset - Final cleanup
    # ========================================================================
    print("\n" + "=" * 80)
    print("STEP 10: POST /api/admin/reset - Final cleanup")
    print("=" * 80)
    
    try:
        resp = requests.post(f"{BASE_URL}/admin/reset", headers=ADMIN_HEADERS, timeout=10)
        print(f"Status: {resp.status_code}")
        data = resp.json()
        
        # Verify state after reset
        state_resp = requests.get(f"{BASE_URL}/state", timeout=10)
        state_data = state_resp.json()
        
        result.store_raw("state_after_final_reset", {
            "systemStatus": state_data.get("systemStatus"),
            "recentWinners": len(state_data.get("recentWinners", []))
        })
        
        if (resp.status_code == 200 and 
            data.get("systemStatus") == "stopped" and
            len(state_data.get("recentWinners", [])) == 0):
            result.log_pass("10", "Reset successful, winners wiped, systemStatus=stopped")
        else:
            result.log_fail("10", f"Reset incomplete: {data}, state: {state_data}")
    except Exception as e:
        result.log_fail("10", f"Exception: {e}")
    
    return result

if __name__ == "__main__":
    print("\n")
    result = main()
    
    # ========================================================================
    # FINAL SUMMARY
    # ========================================================================
    print("\n" + "=" * 80)
    print("FINAL SUMMARY")
    print("=" * 80)
    
    print(f"\n✅ PASSED: {len(result.passed)}")
    for p in result.passed:
        print(f"   {p}")
    
    print(f"\n❌ FAILED: {len(result.failed)}")
    for f in result.failed:
        print(f"   {f}")
    
    print("\n" + "=" * 80)
    print("RAW VALUES FOR COUNTDOWN VERIFICATION")
    print("=" * 80)
    for key, value in result.raw_values.items():
        print(f"{key}: {value}")
    
    print("\n" + "=" * 80)
    if len(result.failed) == 0:
        print("✅ ALL TESTS PASSED - BACKEND VERIFIED")
    else:
        print("❌ SOME TESTS FAILED - SEE DETAILS ABOVE")
    print("=" * 80)
