import io
import json
import wave
import numpy as np
from app import app


def create_test_audio():
    """Create a 1-second test audio file with a sine wave."""
    # Create a 1-second sine wave at 440 Hz
    sample_rate = 44100
    duration = 1.0
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    audio = np.sin(2 * np.pi * 440 * t)
    # Convert to 16-bit PCM
    audio = (audio * 32767).astype(np.int16)
    
    # Create WAV file in memory
    buffer = io.BytesIO()
    with wave.open(buffer, 'wb') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio.tobytes())
    buffer.seek(0)
    return buffer


def test_transcribe():
    """Test the /transcribe endpoint."""
    print("\nTesting /transcribe endpoint...")
    with app.test_client() as c:
        test_audio = create_test_audio()
        test_audio.name = "test.wav"
        resp = c.post("/transcribe", 
                     data={"file": (test_audio, "test.wav")}, 
                     content_type="multipart/form-data")
        result = resp.get_json()
        print(f"Status code: {resp.status_code}")
        print(f"Response: {json.dumps(result, indent=2)}")


def test_translate():
    """Test the /translate endpoint."""
    print("\nTesting /translate endpoint...")
    with app.test_client() as c:
        test_audio = create_test_audio()
        test_audio.name = "test.wav"
        resp = c.post("/translate", 
                     data={"file": (test_audio, "test.wav")}, 
                     content_type="multipart/form-data")
        result = resp.get_json()
        print(f"Status code: {resp.status_code}")
        print(f"Response: {json.dumps(result, indent=2)}")


def test_synthesize():
    """Test the /synthesize endpoint."""
    print("\nTesting /synthesize endpoint...")
    with app.test_client() as c:
        payload = {"text": "Hello, this is a test."}
        resp = c.post("/synthesize", 
                     data=json.dumps(payload), 
                     content_type="application/json")
        result = resp.get_json()
        print(f"Status code: {resp.status_code}")
        if "error" in result:
            print(f"Error: {result['error']}")
        else:
            print("Successfully generated audio (binary data omitted from output)")


if __name__ == "__main__":
    print("Starting backend tests...")
    test_transcribe()
    test_translate()
    test_synthesize()
    print("\nAll tests completed.") 