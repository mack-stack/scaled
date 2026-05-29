"""Initialize the database schema."""
from scaled.db.models import init_db

if __name__ == "__main__":
    engine = init_db()
    print(f"Database initialized: {engine.url}")
