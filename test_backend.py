import io
import json
import wave
import numpy as np
import os
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


def test_real_speech():
    print("\nTesting /transcribe and /translate with real speech audio...")
    real_audio_path = os.path.join("test_data", "hello_en.wav")
    if not os.path.exists(real_audio_path):
        print(f"[SKIP] Real speech audio file not found at {real_audio_path}. Please add a WAV file for this test.")
        return
    with app.test_client() as c:
        with open(real_audio_path, "rb") as f:
            # Transcribe
            resp = c.post("/transcribe", data={"file": (f, "hello_en.wav")}, content_type="multipart/form-data")
            result = resp.get_json()
            print(f"/transcribe status: {resp.status_code}")
            print(f"/transcribe response: {json.dumps(result, indent=2)}")
        with open(real_audio_path, "rb") as f:
            # Translate
            resp = c.post("/translate", data={"file": (f, "hello_en.wav")}, content_type="multipart/form-data")
            result = resp.get_json()
            print(f"/translate status: {resp.status_code}")
            print(f"/translate response: {json.dumps(result, indent=2)}")


def test_error_conditions():
    print("\nTesting error conditions...")
    with app.test_client() as c:
        # /transcribe: missing file
        resp = c.post("/transcribe", data={}, content_type="multipart/form-data")
        print(f"/transcribe missing file status: {resp.status_code}, response: {resp.get_json()}")
        # /transcribe: invalid file (text file)
        fake_file = io.BytesIO(b"not a wav file")
        fake_file.name = "fake.txt"
        resp = c.post("/transcribe", data={"file": (fake_file, "fake.txt")}, content_type="multipart/form-data")
        print(f"/transcribe invalid file status: {resp.status_code}, response: {resp.get_json()}")
        # /translate: missing file
        resp = c.post("/translate", data={}, content_type="multipart/form-data")
        print(f"/translate missing file status: {resp.status_code}, response: {resp.get_json()}")
        # /synthesize: missing text
        resp = c.post("/synthesize", data=json.dumps({}), content_type="application/json")
        print(f"/synthesize missing text status: {resp.status_code}, response: {resp.get_json()}")
        # /synthesize: empty payload
        resp = c.post("/synthesize", data="", content_type="application/json")
        print(f"/synthesize empty payload status: {resp.status_code}, response: {resp.get_json()}")


if __name__ == "__main__":
    print("Starting backend tests...")
    test_transcribe()
    test_translate()
    test_synthesize()
    test_real_speech()
    test_error_conditions()
    print("\nAll tests completed.") 