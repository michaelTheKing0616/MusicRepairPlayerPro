"""
Quick API testing script
"""
import requests
import json

BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/v1"

# Test credentials
TEST_USERS = {
    "admin": {
        "email": "admin@test.com",
        "password": "admin123",
    },
    "user": {
        "email": "user@test.com",
        "password": "user123",
    },
    "premium": {
        "email": "premium@test.com",
        "password": "premium123",
    },
}


def test_login(email: str, password: str):
    """Test login endpoint"""
    print(f"\n🔐 Testing login for {email}...")
    response = requests.post(
        f"{API_BASE}/auth/login",
        json={"email": email, "password": password},
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Login successful!")
        print(f"   Access Token: {data['access_token'][:50]}...")
        return data["access_token"]
    else:
        print(f"❌ Login failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return None


def test_get_user(token: str):
    """Test get current user endpoint"""
    print(f"\n👤 Getting user info...")
    response = requests.get(
        f"{API_BASE}/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    
    if response.status_code == 200:
        user = response.json()
        print(f"✅ User info retrieved!")
        print(f"   Email: {user['email']}")
        print(f"   Name: {user['name']}")
        print(f"   Premium: {user['is_premium']}")
        return user
    else:
        print(f"❌ Failed: {response.status_code}")
        return None


def test_health():
    """Test health endpoint"""
    print("\n🏥 Testing health endpoint...")
    response = requests.get(f"{BASE_URL}/health")
    
    if response.status_code == 200:
        print(f"✅ API is healthy!")
        print(f"   Status: {response.json()}")
        return True
    else:
        print(f"❌ Health check failed: {response.status_code}")
        return False


if __name__ == "__main__":
    print("🧪 MusicRepairApp API Test Script")
    print("=" * 60)
    
    # Test health
    if not test_health():
        print("\n❌ API is not running. Please start the server first:")
        print("   uvicorn app.main:app --reload")
        exit(1)
    
    # Test login for each user
    tokens = {}
    for user_type, credentials in TEST_USERS.items():
        token = test_login(credentials["email"], credentials["password"])
        if token:
            tokens[user_type] = token
            test_get_user(token)
    
    if tokens:
        print("\n✅ All tests passed!")
        print("\n📝 You can use these tokens for API testing:")
        for user_type, token in tokens.items():
            print(f"\n{user_type.upper()}:")
            print(f'  export TOKEN="{token}"')
            print(f'  curl -H "Authorization: Bearer $TOKEN" {API_BASE}/auth/me')
    else:
        print("\n❌ No tokens obtained. Please check:")
        print("   1. Database is seeded (run: python scripts/seed_db.py)")
        print("   2. Server is running")
        print("   3. Database connection is correct")

