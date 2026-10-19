import os
import tempfile
from alembic.config import Config
from alembic import command
import pytest


def test_alembic_migrations_upgrade_and_downgrade(tmp_path):
    """
    Verify that Alembic migrations run cleanly against an isolated fresh database:
    1. Upgrade head applies all migrations.
    2. Downgrade base safely rolls them back.
    """
    api_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    alembic_ini = os.path.join(api_dir, "alembic.ini")

    # Isolated test database path
    temp_db_path = tmp_path / "test_migration.db"
    sync_url = f"sqlite:///{temp_db_path}"

    alembic_cfg = Config(alembic_ini)
    alembic_cfg.set_main_option("script_location", os.path.join(api_dir, "alembic"))
    alembic_cfg.set_main_option("sqlalchemy.url", sync_url)

    # 1. Test upgrade to head
    command.upgrade(alembic_cfg, "head")

    # 2. Test downgrade back to base
    command.downgrade(alembic_cfg, "base")

    # 3. Test re-upgrade to head
    command.upgrade(alembic_cfg, "head")
