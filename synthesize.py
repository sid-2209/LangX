import io
from TTS.api import TTS

tts = TTS(model_name="tts_models/en/ljspeech/tacotron2-DDC", progress_bar=False, gpu=False)

def synthesize(text):
    """Synthesize speech from a given text using Coqui TTS.
    Args:
         text (str): The text to synthesize.
    Returns:
         (audio_bytes, err): A tuple where audio_bytes is the synthesized audio (as bytes) (or None if an error) and err is an error message (or None).
    """
    try:
        wav = tts.tts(text)
        buf = io.BytesIO()
        tts.synthesizer.save_wav(wav, buf)
        buf.seek(0)
        return (buf.read(), None)
    except Exception as e:
        return (None, str(e)) 