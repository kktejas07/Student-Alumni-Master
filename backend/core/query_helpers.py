"""core/query_helpers — shared MongoDB query predicates.

``nonempty()`` centralizes the "field holds real content" predicates that
were copy-pasted across routers and services.
"""


def nonempty(*placeholders: str, exists: bool = True) -> dict:
    """Mongo predicate: value is not null/empty and not any placeholder.

    Args:
        placeholders: extra sentinel values to exclude (e.g. em-dash).
        exists: require the field to be present on the document.
    """
    values = [None, ""] + list(placeholders)
    if exists:
        return {"$exists": True, "$nin": values}
    return {"$nin": values}
