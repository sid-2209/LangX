from flask import Flask, request, jsonify, make_response
import transcribe
import synthesize
from transformers import MarianMTModel, MarianTokenizer
import torch
from flask_cors import CORS
import tempfile
import os

app = Flask(__name__)
CORS(app)

# Initialize translation models
MODEL_NAMES = {
    "es": "Helsinki-NLP/opus-mt-en-es",
    "fr": "Helsinki-NLP/opus-mt-en-fr",
    "zh": "Helsinki-NLP/opus-mt-en-zh"
}

# Cache for models and tokenizers
translation_models = {}
translation_tokenizers = {}

def get_model_and_tokenizer(lang_code):
    if lang_code not in translation_models:
        model_name = MODEL_NAMES[lang_code]
        translation_models[lang_code] = MarianMTModel.from_pretrained(model_name)
        translation_tokenizers[lang_code] = MarianTokenizer.from_pretrained(model_name)
    return translation_models[lang_code], translation_tokenizers[lang_code]


@app.route("/transcribe", methods=["POST"])
def transcribe_endpoint():
    if "file" not in request.files:
        return make_response(jsonify({"error": "No file part"}), 400)
    file = request.files["file"]
    if not file.filename:
        return make_response(jsonify({"error": "No selected file"}), 400)
    (text, err) = transcribe.transcribe(file)
    if err:
        return make_response(jsonify({"error": err}), 500)
    return make_response(jsonify({"text": text}), 200)


@app.route("/translate", methods=["POST"])
def translate_endpoint():
    if "file" not in request.files:
        return make_response(jsonify({"error": "No file part"}), 400)
    file = request.files["file"]
    if not file.filename:
        return make_response(jsonify({"error": "No selected file"}), 400)
    (text, err) = transcribe.transcribe(file, translate=True)
    if err:
        return make_response(jsonify({"error": err}), 500)
    return make_response(jsonify({"text": text}), 200)


@app.route("/synthesize", methods=["POST"])
def synthesize_endpoint():
    if "text" not in request.form:
        return make_response(jsonify({"error": "Missing 'text' in form data"}), 400)
    
    if "reference_audio" not in request.files:
        return make_response(jsonify({"error": "Missing reference audio file"}), 400)
    
    text = request.form["text"]
    reference_audio = request.files["reference_audio"]
    
    if not text.strip():
        return make_response(jsonify({"error": "Empty text provided"}), 400)
    
    if not reference_audio.filename:
        return make_response(jsonify({"error": "No reference audio file selected"}), 400)
    
    try:
        # Save reference audio temporarily
        temp_ref_path = tempfile.mktemp(suffix=".wav")
        reference_audio.save(temp_ref_path)
        
        # Synthesize audio
        (audio_bytes, err) = synthesize.synthesize(text, reference_audio=temp_ref_path)
        
        # Clean up temp file
        if os.path.exists(temp_ref_path):
            os.remove(temp_ref_path)
            
        if err:
            return make_response(jsonify({"error": err}), 500)
            
        response = make_response(audio_bytes)
        response.headers['Content-Type'] = 'audio/webm'
        return response
        
    except Exception as e:
        if os.path.exists(temp_ref_path):
            os.remove(temp_ref_path)
        return make_response(jsonify({"error": str(e)}), 500)


@app.route("/translate_text", methods=["POST"])
def translate_text_endpoint():
    data = request.get_json()
    if not data or "text" not in data:
        return make_response(jsonify({"error": "Missing 'text' in JSON body"}), 400)
    
    text = data["text"]
    if not isinstance(text, str) or not text.strip():
        return make_response(jsonify({"error": "Invalid text input"}), 400)
    
    target_lang = data.get("target_lang", "es")  # Default to Spanish if not specified
    if target_lang not in MODEL_NAMES:
        return make_response(jsonify({"error": f"Unsupported target language: {target_lang}"}), 400)
    
    try:
        model, tokenizer = get_model_and_tokenizer(target_lang)
        
        # Tokenize and translate
        inputs = tokenizer(text, return_tensors="pt", padding=True)
        translated = model.generate(**inputs)
        translated_text = tokenizer.batch_decode(translated, skip_special_tokens=True)[0]
        
        return make_response(jsonify({
            "translations": {
                target_lang: translated_text
            },
            "original_text": text
        }), 200)
    except Exception as e:
        return make_response(jsonify({"error": f"Translation failed: {str(e)}"}), 500)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000) 