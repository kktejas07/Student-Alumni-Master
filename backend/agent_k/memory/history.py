from datetime import datetime, timezone
from typing import List, Dict, Any
from core.db import db as _db

class ChatMemory:
    """Manages conversation history for Agent K."""
    
    def __init__(self, max_history: int = 5):
        self.max_history = max_history
        self.collection = _db.agent_k_chat_history

    async def get_history(self, user_id: str, session_id: str = None) -> List[Dict[str, str]]:
        """Retrieves the last N messages for the user."""
        query = {"user_id": user_id}
        if session_id:
            query["session_id"] = session_id
        cursor = self.collection.find(query).sort("timestamp", -1).limit(self.max_history)
        docs = await cursor.to_list(length=self.max_history)
        
        # Sort back to chronological order
        docs.reverse()
        
        history = []
        for doc in docs:
            history.append({"role": "user", "content": doc["user_message"]})
            history.append({"role": "assistant", "content": doc["ai_response"]})
            
        return history

    async def add_interaction(self, user_id: str, user_message: str, ai_response: str, interaction_id: str = None, metrics: Dict[str, Any] = None, session_id: str = None) -> None:
        """Stores a new interaction in the history."""
        doc = {
            "user_id": user_id,
            "session_id": session_id,
            "user_message": user_message,
            "ai_response": ai_response,
            "timestamp": datetime.now(timezone.utc),
            "metrics": metrics or {},
            "feedback": None
        }
        if interaction_id:
            doc["_id"] = interaction_id
        await self.collection.insert_one(doc)

    async def add_feedback(self, interaction_id: str, is_helpful: bool, comment: str = None) -> bool:
        """Adds feedback to a specific interaction."""
        result = await self.collection.update_one(
            {"_id": interaction_id},
            {"$set": {"feedback": {"is_helpful": is_helpful, "comment": comment}}}
        )
        return result.modified_count > 0

    async def format_history_string(self, user_id: str) -> str:
        """Returns history formatted as a conversational string."""
        history = await self.get_history(user_id)
        if not history:
            return "No previous conversation."
            
        formatted = []
        for msg in history:
            role = "User" if msg["role"] == "user" else "Assistant"
            formatted.append(f"{role}: {msg['content']}")
            
        return "\n".join(formatted)

    async def get_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        """Returns a list of unique chat sessions for the user."""
        pipeline = [
            {"$match": {"user_id": user_id, "session_id": {"$ne": None}}},
            {"$sort": {"timestamp": 1}},
            {"$group": {
                "_id": "$session_id",
                "first_message": {"$first": "$user_message"},
                "last_active": {"$last": "$timestamp"},
                "message_count": {"$sum": 1}
            }},
            {"$sort": {"last_active": -1}}
        ]
        sessions = await self.collection.aggregate(pipeline).to_list(length=100)
        return [{"session_id": s["_id"], "preview": s["first_message"][:50], "timestamp": s["last_active"]} for s in sessions]

    async def get_dashboard_metrics(self) -> Dict[str, Any]:
        """Calculates analytics for the dashboard."""
        pipeline = [
            {
                "$facet": {
                    "overall": [
                        {
                            "$group": {
                                "_id": None,
                                "chat_count": {"$sum": 1},
                                "avg_latency": {"$avg": "$metrics.latency_ms"},
                                "rag_hits": {"$sum": {"$cond": [{"$eq": ["$metrics.rag_hit", True]}, 1, 0]}},
                                "total_rag_score": {"$sum": "$metrics.rag_avg_score"}
                            }
                        }
                    ],
                    "providers": [
                        {
                            "$group": {
                                "_id": "$metrics.provider",
                                "count": {"$sum": 1}
                            }
                        }
                    ],
                    "top_questions": [
                        {"$group": {"_id": "$user_message", "count": {"$sum": 1}}},
                        {"$sort": {"count": -1}},
                        {"$limit": 5}
                    ],
                    "failed_searches": [
                        {"$match": {"metrics.intent": "application", "metrics.rag_avg_score": 0}},
                        {"$group": {"_id": "$user_message", "count": {"$sum": 1}}},
                        {"$sort": {"count": -1}},
                        {"$limit": 5}
                    ]
                }
            }
        ]
        
        cursor = self.collection.aggregate(pipeline)
        result = await cursor.to_list(length=1)
        if not result or not result[0]["overall"]:
            return {}
            
        data = result[0]
        overall = data["overall"][0]
        chat_count = overall["chat_count"]
        
        return {
            "chat_count": chat_count,
            "rag_hit_rate": (overall["rag_hits"] / chat_count) if chat_count > 0 else 0,
            "avg_latency": overall["avg_latency"],
            "avg_retrieval_score": (overall["total_rag_score"] / overall["rag_hits"]) if overall["rag_hits"] > 0 else 0,
            "provider_usage": {p["_id"]: p["count"] for p in data["providers"] if p["_id"]},
            "trial_usage": next((p["count"] for p in data["providers"] if p["_id"] == "FeatherlessProvider"), 0),
            "top_questions": [{"question": q["_id"], "count": q["count"]} for q in data["top_questions"]],
            "failed_searches": [{"question": q["_id"], "count": q["count"]} for q in data["failed_searches"]]
        }
