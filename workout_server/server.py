from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn
import hashlib
from pathlib import Path

# Lazy load XTTS when first used
XTTS_AVAILABLE = False
try:
    from TTS.api import TTS
    import torch
    device = "cuda" if torch.cuda.is_available() else "cpu"
    tts_model = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
    XTTS_AVAILABLE = True
    print(f"XTTS loaded on {device}")
except Exception as e:
    print(f"XTTS unavailable: {e}")

app = FastAPI(title="Workout Timer XTTS Bridge")
CACHE_DIR = Path("./cache")
CACHE_DIR.mkdir(exist_ok=True)

class SpeakRequest(BaseModel):
    text: str
    voice: str = "default"
    speed: float = 1.0
    language: str = "en"

class SpeakResponse(BaseModel):
    status: str
    audio_url: str
    cached: bool

@app.get("/health")
def health():
    return {"status": "ok", "xtts_loaded": XTTS_AVAILABLE}

@app.post("/speak", response_model=SpeakResponse)
async def speak(req: SpeakRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Empty text")
    key = hashlib.md5(f"{req.text}-{req.voice}-{req.speed}-{req.language}".encode()).hexdigest()
    audio_path = CACHE_DIR / f"{key}.wav"
    if audio_path.exists():
        return SpeakResponse(status="ok", audio_url=f"/audio/{key}.wav", cached=True)
    if not XTTS_AVAILABLE:
        _write_silent_wav(audio_path, duration=1.0)
        return SpeakResponse(status="fallback", audio_url=f"/audio/{key}.wav", cached=False)
    try:
        tts_model.tts_to_file(text=req.text, file_path=str(audio_path), language=req.language, speed=req.speed)
        return SpeakResponse(status="ok", audio_url=f"/audio/{key}.wav", cached=False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/audio/{filename}")
def get_audio(filename: str):
    path = CACHE_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(path, media_type="audio/wav")

@app.get("/voices")
def list_voices():
    return {"voices": [{"id":"default","label":"Default"},{"id":"male_motivational","label":"Male Motivational"},{"id":"female_calm","label":"Female Calm"},{"id":"male_british","label":"Male British"},{"id":"female_motivational","label":"Female Motivational"}]}

def _write_silent_wav(path: Path, duration: float, sample_rate: int = 22050):
    import wave
    with wave.open(str(path), 'w') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        nframes = int(duration * sample_rate)
        w.writeframes(b'\x00\x00' * nframes)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5002, log_level="info")
