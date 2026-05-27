"""
Database seeding script for testing
Creates test users with hard-coded credentials
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core.database import Base, AsyncSessionLocal
from app.models.user import User
from app.core.security import get_password_hash
from app.core.config import settings
import uuid


async def seed_database():
    """Seed database with test users"""
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    
    # Create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Create session
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Test Users with hard-coded credentials
        
        test_users = [
            {
                "email": "admin@test.com",
                "password": "admin123",
                "name": "Admin User",
                "is_premium": True,
                "consent_audio_processing": True,
                "consent_voice_cloning": True,
                "age_verified": True,
                "consent_analytics": True,
            },
            {
                "email": "user@test.com",
                "password": "user123",
                "name": "Test User",
                "is_premium": False,
                "consent_audio_processing": True,
                "consent_voice_cloning": False,
                "age_verified": True,
                "consent_analytics": False,
            },
            {
                "email": "premium@test.com",
                "password": "premium123",
                "name": "Premium User",
                "is_premium": True,
                "consent_audio_processing": True,
                "consent_voice_cloning": True,
                "age_verified": True,
                "consent_analytics": True,
                "consent_model_training": True,
            },
        ]
        
        for user_data in test_users:
            # Check if user exists
            from sqlalchemy import select
            result = await session.execute(
                select(User).where(User.email == user_data["email"])
            )
            existing_user = result.scalar_one_or_none()
            
            if existing_user:
                print(f"User {user_data['email']} already exists, skipping...")
                continue
            
            # Create user
            password = user_data.pop("password")
            hashed_password = get_password_hash(password)
            user = User(
                id=uuid.uuid4(),
                hashed_password=hashed_password,
                **user_data,
            )
            
            session.add(user)
            print(f"✅ Created user: {user_data['email']} (Password: {password})")
        
        await session.commit()
        print("\n✅ Database seeded successfully!")
        print("\n📝 Test User Credentials:")
        print("=" * 60)
        print("\n1. Admin User (Premium)")
        print("   Email: admin@test.com")
        print("   Password: admin123")
        print("   Features: All enabled, voice cloning enabled")
        print("\n2. Regular User")
        print("   Email: user@test.com")
        print("   Password: user123")
        print("   Features: Basic features, no voice cloning")
        print("\n3. Premium User")
        print("   Email: premium@test.com")
        print("   Password: premium123")
        print("   Features: All enabled, model training consent")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed_database())

