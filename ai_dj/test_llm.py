import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY", "lm-studio"),
    base_url=os.environ.get("OPENAI_BASE_URL", "http://localhost:1234/v1")
)

try:
    print("Checking models...")
    models = client.models.list()
    print("Models found:", [m.id for m in models.data])
    
    print("\nTesting banter generation...")
    completion = client.chat.completions.create(
        model="meta-llama-3.1-8b-instruct",
        messages=[
            {"role": "system", "content": "You are a witty radio DJ."},
            {"role": "user", "content": "Say something cool about Club Youniverse."}
        ],
        max_tokens=50
    )
    print("DJ Python says:", completion.choices[0].message.content)
except Exception as e:
    print("Error connecting to LM Studio:", e)
