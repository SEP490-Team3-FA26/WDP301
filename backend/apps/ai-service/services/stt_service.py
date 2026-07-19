import os
from groq import AsyncGroq
from fastapi import UploadFile

api_key = os.getenv("GROQ_API_KEY") or os.getenv("EXPO_PUBLIC_GROQ_API_KEY")

async def transcribe_audio(audio_file: UploadFile) -> str:
    """
    Sử dụng Groq Whisper để chuyển đổi âm thanh thành văn bản
    """
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not configured")

    # Create the client lazily so a configuration problem is reported when this
    # feature is used instead of breaking the whole application at import time.
    client = AsyncGroq(api_key=api_key)
    if not hasattr(client, "audio"):
        raise RuntimeError(
            "Installed Groq SDK does not support audio transcription; "
            "rebuild ai-service with groq==0.13.1"
        )

    content = await audio_file.read()
    
    # Whisper supports m4a, mp3, webm, mp4, mpga, wav, mpeg
    transcription = await client.audio.transcriptions.create(
        file=(audio_file.filename, content, audio_file.content_type),
        model="whisper-large-v3",
        language="vi",
        response_format="text",
        temperature=0,
        prompt=(
            "Ngữ cảnh tư vấn tại nhà thuốc ở Việt Nam. Ưu tiên nhận diện chính xác "
            "triệu chứng như sốt, đau đầu, đau họng, ho, sổ mũi, nghẹt mũi, "
            "dị ứng và tên thuốc."
        ),
    )
    return transcription
