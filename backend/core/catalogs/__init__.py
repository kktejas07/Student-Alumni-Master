"""core/catalogs — static curated catalog data, split out of the routers that
seed or serve it. Data only; no FastAPI or Mongo imports.
"""
from core.catalogs.financial import CATEGORIES, FINANCIAL_CATALOG, SCHOLARSHIPS, LOANS, STARTUP_FUNDING, INSURANCE, VENTURE_CAPITAL  # noqa: F401
from core.catalogs.courses import CURATED_COURSES, CURATED_TRACKS  # noqa: F401
