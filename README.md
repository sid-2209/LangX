# LangX

A Flask-based backend service for speech-to-text transcription, translation, and text-to-speech synthesis using OpenAI Whisper and Coqui TTS.

## Features

- **Speech Transcription**: Convert speech to text using OpenAI Whisper
- **Speech Translation**: Translate speech to English using OpenAI Whisper
- **Text-to-Speech**: Convert text to speech using Coqui TTS

## Prerequisites

- Python 3.10
- FFmpeg (for audio processing)
- pip-tools (for dependency management)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/LangX.git
cd LangX
```

2. Create and activate a virtual environment:
```bash
pyenv local 3.10
python -m venv venv
source venv/bin/activate  # On Unix/macOS
# or
.\venv\Scripts\activate  # On Windows
```

3. Install dependencies:
```bash
pip install pip-tools
pip-sync requirements.txt
```

## Usage

1. Start the Flask server:
```bash
python app.py
```

The server will start on `http://localhost:5000` with the following endpoints:

- `POST /transcribe`: Convert speech to text
  - Input: Audio file (WAV format)
  - Output: JSON with transcribed text

- `POST /translate`: Translate speech to English
  - Input: Audio file (WAV format)
  - Output: JSON with translated text

- `POST /synthesize`: Convert text to speech
  - Input: JSON with text to synthesize
  - Output: JSON with synthesized audio data

## Testing

Run the test suite:
```bash
python test_backend.py
```

## License

[Your chosen license]

## Contributing

[Your contribution guidelines] 