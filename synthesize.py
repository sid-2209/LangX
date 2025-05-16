import io
from TTS.api import TTS
import torch

# Initialize TTS model with LJSpeech
tts = TTS(model_name="tts_models/en/ljspeech/tacotron2-DDC", progress_bar=False, gpu=torch.cuda.is_available())

def synthesize(text, reference_audio=None):
    """Synthesize speech from a given text using Coqui TTS.
    Args:
        text (str): The text to synthesize.
        reference_audio (str, optional): Path to reference audio file for voice cloning.
            Note: Voice cloning is not supported with the current model.
    Returns:
        (audio_bytes, err): A tuple where audio_bytes is the synthesized audio (as bytes) (or None if an error) and err is an error message (or None).
    """
    try:
        # Currently using LJSpeech model which doesn't support voice cloning
        # We'll ignore the reference_audio parameter for now
        wav = tts.tts(text)
            
        buf = io.BytesIO()
        tts.synthesizer.save_wav(wav, buf)
        buf.seek(0)
        return (buf.read(), None)
    except Exception as e:
        return (None, str(e)) 