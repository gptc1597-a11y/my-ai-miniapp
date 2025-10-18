from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from openai import AsyncOpenAI

app = FastAPI()

# Разрешаем запросы из Mini App
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Настройка NeuroAPI
client = AsyncOpenAI(
    base_url="https://neuroapi.host/v1",
    api_key=os.getenv("NERO_API_KEY")
)

class AskRequest(BaseModel):
    model: str
    query: str

@app.post("/api/ask")
async def ask_ai(request: AskRequest):
    try:
        completion = await client.chat.completions.create(
            model=request.model,
            messages=[{"role": "user", "content": request.query}],
            max_tokens=1000,
            temperature=0.7
        )
        answer = completion.choices[0].message.content.strip()
        return {"answer": answer}
    except Exception as e:
        return {"error": str(e)}, 500