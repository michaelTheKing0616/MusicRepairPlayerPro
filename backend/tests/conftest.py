import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Ensure SQLAlchemy async engine can be constructed during test collection.
# Some tests import API modules which import `app.core.database` (engine created at import time).
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://user:password@localhost:5432/musicrepair_test",
)
