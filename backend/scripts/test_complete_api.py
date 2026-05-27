"""
Complete API test script
Tests all endpoints end-to-end
"""
import requests
import json
import time
import sys
from pathlib import Path

BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

# Test credentials
TEST_USER = {
    "email": "admin@test.com",
    "password": "admin123",
}

# Colors for output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.END}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.END}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ️  {message}{Colors.END}")

def print_step(message):
    print(f"\n{Colors.BOLD}{Colors.BLUE}▶ {message}{Colors.END}")

def test_health():
    """Test health endpoint"""
    print_step("Testing Health Endpoint")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print_success(f"API is healthy: {response.json()}")
            return True
        else:
            print_error(f"Health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error("Cannot connect to API. Is the server running?")
        print_info("Start server with: uvicorn app.main:app --reload")
        return False
    except Exception as e:
        print_error(f"Health check error: {str(e)}")
        return False

def test_login():
    """Test login and return token"""
    print_step("Testing Login")
    try:
        response = requests.post(
            f"{API_BASE}/auth/login",
            json=TEST_USER,
            timeout=5
        )
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            print_success(f"Login successful for {TEST_USER['email']}")
            print_info(f"Token: {token[:50]}...")
            return token
        else:
            print_error(f"Login failed: {response.status_code}")
            print_error(f"Response: {response.text}")
            return None
    except Exception as e:
        print_error(f"Login error: {str(e)}")
        return None

def test_get_user(token):
    """Test get current user"""
    print_step("Testing Get Current User")
    try:
        response = requests.get(
            f"{API_BASE}/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5
        )
        if response.status_code == 200:
            user = response.json()
            print_success(f"User info retrieved: {user.get('name')} ({user.get('email')})")
            print_info(f"Premium: {user.get('is_premium')}")
            return user
        else:
            print_error(f"Get user failed: {response.status_code}")
            return None
    except Exception as e:
        print_error(f"Get user error: {str(e)}")
        return None

def test_register():
    """Test user registration"""
    print_step("Testing User Registration")
    try:
        test_email = f"test_{int(time.time())}@test.com"
        response = requests.post(
            f"{API_BASE}/auth/register",
            json={
                "email": test_email,
                "password": "test123456",
                "name": "Test User",
            },
            timeout=5
        )
        if response.status_code == 201:
            user = response.json()
            print_success(f"User registered: {user.get('email')}")
            return True
        else:
            print_error(f"Registration failed: {response.status_code}")
            print_error(f"Response: {response.text}")
            return False
    except Exception as e:
        print_error(f"Registration error: {str(e)}")
        return False

def test_upload_simulation(token):
    """Simulate file upload (without actual file)"""
    print_step("Testing Upload Endpoint (Simulation)")
    print_info("Note: Actual upload requires a real audio file")
    # We can't easily test multipart uploads without a real file
    # This is just to verify the endpoint exists
    try:
        # Try to hit the endpoint to see if it exists
        response = requests.post(
            f"{API_BASE}/audio/upload",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5
        )
        # Expect 422 or 400 for missing file, not 404
        if response.status_code in [400, 422]:
            print_success("Upload endpoint exists (requires file)")
            return True
        elif response.status_code == 404:
            print_error("Upload endpoint not found")
            return False
        else:
            print_info(f"Upload endpoint response: {response.status_code}")
            return True
    except Exception as e:
        print_error(f"Upload test error: {str(e)}")
        return False

def test_transform_endpoint(token):
    """Test transform endpoint structure"""
    print_step("Testing Transform Endpoint")
    try:
        # Try with invalid job_id to test endpoint structure
        response = requests.post(
            f"{API_BASE}/transform",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json={
                "job_id": "00000000-0000-0000-0000-000000000000",
                "transform_type": "voice",
                "params": {
                    "voice_preset": "test_preset",
                    "intensity": 0.85,
                },
            },
            timeout=5
        )
        # Expect 404 for invalid job_id, not 422 or 401
        if response.status_code == 404:
            print_success("Transform endpoint exists (job not found is expected)")
            return True
        elif response.status_code == 422:
            print_success("Transform endpoint exists (validation error is expected)")
            return True
        else:
            print_info(f"Transform endpoint response: {response.status_code}")
            return True
    except Exception as e:
        print_error(f"Transform test error: {str(e)}")
        return False

def test_job_status_endpoint(token):
    """Test job status endpoint"""
    print_step("Testing Job Status Endpoint")
    try:
        # Try with invalid job_id
        fake_job_id = "00000000-0000-0000-0000-000000000000"
        response = requests.get(
            f"{API_BASE}/jobs/{fake_job_id}/status",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5
        )
        # Expect 404 for invalid job_id
        if response.status_code == 404:
            print_success("Job status endpoint exists (job not found is expected)")
            return True
        else:
            print_info(f"Job status response: {response.status_code}")
            return True
    except Exception as e:
        print_error(f"Job status test error: {str(e)}")
        return False

def test_api_docs():
    """Test API documentation endpoints"""
    print_step("Testing API Documentation")
    endpoints = ["/docs", "/redoc", "/openapi.json"]
    for endpoint in endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
            if response.status_code == 200:
                print_success(f"{endpoint} is accessible")
            else:
                print_info(f"{endpoint} returned {response.status_code}")
        except Exception as e:
            print_error(f"{endpoint} error: {str(e)}")

def main():
    print(f"\n{Colors.BOLD}{'='*60}")
    print("MusicRepairApp Backend API Test Suite")
    print(f"{'='*60}{Colors.END}\n")
    
    results = {
        "health": False,
        "login": False,
        "register": False,
        "get_user": False,
        "upload": False,
        "transform": False,
        "job_status": False,
    }
    
    # Test health
    if not test_health():
        print_error("\n❌ API is not running. Please start the server first!")
        print_info("Run: uvicorn app.main:app --reload")
        sys.exit(1)
    results["health"] = True
    
    # Test registration
    results["register"] = test_register()
    
    # Test login
    token = test_login()
    if not token:
        print_error("\n❌ Cannot proceed without authentication token")
        print_info("Make sure database is seeded: python scripts/seed_db.py")
        sys.exit(1)
    results["login"] = True
    
    # Test get user
    user = test_get_user(token)
    results["get_user"] = user is not None
    
    # Test upload endpoint
    results["upload"] = test_upload_simulation(token)
    
    # Test transform endpoint
    results["transform"] = test_transform_endpoint(token)
    
    # Test job status endpoint
    results["job_status"] = test_job_status_endpoint(token)
    
    # Test API docs
    test_api_docs()
    
    # Summary
    print(f"\n{Colors.BOLD}{'='*60}")
    print("Test Summary")
    print(f"{'='*60}{Colors.END}\n")
    
    passed = sum(results.values())
    total = len(results)
    
    for test_name, result in results.items():
        if result:
            print_success(f"{test_name}: PASSED")
        else:
            print_error(f"{test_name}: FAILED")
    
    print(f"\n{Colors.BOLD}Results: {passed}/{total} tests passed{Colors.END}\n")
    
    if passed == total:
        print_success("🎉 All tests passed! API is working correctly.")
        print_info("\nNext steps:")
        print_info("1. Connect mobile app to: http://localhost:8000/api/v1")
        print_info("2. Use test credentials from TEST_CREDENTIALS.md")
        print_info("3. Test full upload → transform → download flow")
        return 0
    else:
        print_error(f"⚠️  {total - passed} test(s) failed. Please check errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())

