import os
from groq import AsyncGroq
from fastapi import UploadFile

api_key = os.getenv("GROQ_API_KEY") or os.getenv("EXPO_PUBLIC_GROQ_API_KEY")
client = AsyncGroq(api_key=api_key)

async def transcribe_audio(audio_file: UploadFile) -> str:
    """
    Sử dụng Groq Whisper để chuyển đổi âm thanh thành văn bản
    """
    content = await audio_file.read()
    
    # Whisper supports m4a, mp3, webm, mp4, mpga, wav, mpeg
    transcription = await client.audio.transcriptions.create(
        file=(audio_file.filename, content, audio_file.content_type),
        model="whisper-large-v3",
        language="vi",
        response_format="text"
    )
    return transcription
