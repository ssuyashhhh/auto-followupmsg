import httpx
import json

url = "http://127.0.0.1:8000/api/v1/messages/generate"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODdjODE4Mi00YmVmLTRiNTUtODg4Yi0zMmExMmZhYjA3MjQiLCJleHAiOjE3NzM1MDY2NzV9.dF3m7dCIHDsslM7__I6BZwq9pYkLIM6ozwNjjn83aOg"
}
data = {
    "campaign_id": "2be138c2-933a-4df4-8812-6e69ae667ac6",
    "message_type": "cold_outreach",
    "model": "llama-3.3-70b-versatile",
    "prompt_template_id": "6fe1892b-b2fd-48e0-ad75-b68ce7f78da6"
}

resp = httpx.post(url, headers=headers, json=data)
print(f"Status: {resp.status_code}")
print(f"Body: {resp.text}")
