"""StegoLab application factory."""

from __future__ import annotations

from flask import Flask

from .config import Config
from .errors import register_error_handlers
from .extensions import cors, db, limiter, migrate


def create_app(config_object=None) -> Flask:
    """Create and configure the StegoLab Flask application."""
    app = Flask(__name__)
    app.config.from_object(config_object or Config)

    # Extensions
    db.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", ["*"])}},
    )

    # Blueprints
    from .api.image import bp as image_bp
    from .api.audio import bp as audio_bp
    from .api.text import bp as text_bp
    from .api.meta import bp as meta_bp

    app.register_blueprint(image_bp, url_prefix="/api")
    app.register_blueprint(audio_bp, url_prefix="/api")
    app.register_blueprint(text_bp, url_prefix="/api")
    app.register_blueprint(meta_bp, url_prefix="/api")

    # Error handlers (JSON everywhere)
    register_error_handlers(app)

    # SQLite dev fallback and tests manage their own schema; production
    # relies on `flask db upgrade`.
    if app.config.get("AUTO_CREATE_TABLES"):
        with app.app_context():
            db.create_all()

    return app
