# Agent K Deployment Guide

Agent K is designed to be deeply integrated into the Student Alumni Platform but utilizes localized RAG dependencies to reduce cloud vendor lock-in.

## Infrastructure Requirements

1. **MongoDB**: (Existing) Used for conversational memory (`agent_k_chat_history`) and user configuration (`user_ai_settings`). No special indexing required beyond standard primary keys.
2. **Qdrant**: (New) Used as the vector database for RAG. It must have persistent volume mapping.
3. **Application Server**: Standard Python FastAPI environment (Python 3.10+). Ensure sufficient RAM (minimum 1GB) if running `fastembed` model embeddings locally on the server.

## Docker Compose Setup

In a production environment, simply ensure Qdrant is added to your existing `docker-compose.yml`:

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - MONGO_URL=mongodb://mongo:27017/student_alumni
      - JWT_SECRET=your-secret
      - FERNET_KEY=your-encryption-key
      - QDRANT_URL=http://qdrant:6333
    depends_on:
      - mongo
      - qdrant

  mongo:
    image: mongo:6.0
    volumes:
      - mongo_data:/data/db

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage

volumes:
  mongo_data:
  qdrant_data:
```

## Embedding Caching

By default, the `fastembed` library downloads the embedding model (e.g., `BAAI/bge-small-en`) into the `/tmp` or system cache directory upon the first execution. 
For ephemeral deployments (like AWS Fargate or Render), you should pre-bake the model weights into the Docker image, or map a persistent volume to `~/.cache/qdrant` to prevent massive downloads on every container restart.

## Encryption at Rest

**CRITICAL**: You MUST define a `FERNET_KEY` environment variable in production. This key is used to encrypt BYOK (Bring Your Own Key) secrets in the MongoDB `user_ai_settings` collection. 
If the key is lost, all user API keys are irretrievable. Generate a secure 32-byte URL-safe base64-encoded string:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```
