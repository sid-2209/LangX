import os
import tempfile
import whisper


def transcribe(file, translate=False):
    """Transcribe (or translate) an uploaded audio file using OpenAI Whisper.
    Args:
         file: A file-like object (e.g. from Flask's request.files).
         translate (bool): If True, translate the audio (to English) instead of transcribing.
    Returns:
         (text, err): A tuple where text is the transcribed (or translated) text (or None if an error) and err is an error message (or None).
    """
    try:
         # Save the uploaded file to a temporary file (Whisper requires a file on disk)
         (fd, temp_path) = tempfile.mkstemp(suffix=".wav")
         os.close(fd)
         file.save(temp_path)
         model = whisper.load_model("base")
         if translate:
             result = model.transcribe(temp_path, task="translate")
         else:
             result = model.transcribe(temp_path)
         os.remove(temp_path)
         return (result["text"], None)
    except Exception as e:
         if os.path.exists(temp_path):
             os.remove(temp_path)
         return (None, str(e)) 