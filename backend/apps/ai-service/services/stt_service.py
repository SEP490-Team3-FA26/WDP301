import os
import httpx
from fastapi import UploadFile

async def transcribe_audio(audio_file: UploadFile) -> str:
    """
    Sử dụng Groq Whisper để chuyển đổi âm thanh thành văn bản qua Groq REST API
    """
    api_key = os.getenv("GROQ_API_KEY") or os.getenv("EXPO_PUBLIC_GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not configured")

    content = await audio_file.read()
    filename = audio_file.filename or "audio.wav"
    content_type = audio_file.content_type or "audio/wav"

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {api_key}"},
            files={"file": (filename, content, content_type)},
            data={
                "model": "whisper-large-v3",
                "language": "vi",
                "temperature": "0",
                "prompt": (
                    "Ngữ cảnh tư vấn tại nhà thuốc ở Việt Nam. Ưu tiên nhận diện chính xác "
                    "triệu chứng như sốt, đau đầu, đau họng, ho, sổ mũi, nghẹt mũi, "
                    "dị ứng và tên thuốc."
                ),
            },
        )

        if response.status_code != 200:
            raise RuntimeError(f"Groq Whisper API error ({response.status_code}): {response.text}")

        res_json = response.json()
        return res_json.get("text", "")
