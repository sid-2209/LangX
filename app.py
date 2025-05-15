from flask import Flask, request, jsonify, make_response
import transcribe
import synthesize
from transformers import MarianMTModel, MarianTokenizer
import torch
from flask_cors import CORS

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
    data = request.get_json()
    if not data or "text" not in data:
        return make_response(jsonify({"error": "Missing 'text' in JSON body"}), 400)
    (audio_bytes, err) = synthesize.synthesize(data["text"])
    if err:
        return make_response(jsonify({"error": err}), 500)
    return make_response(jsonify({"audio": audio_bytes.decode("latin1")}), 200)


@app.route("/translate_text", methods=["POST"])
def translate_text_endpoint():
    data = request.get_json()
    if not data or "text" not in data:
        return make_response(jsonify({"error": "Missing 'text' in JSON body"}), 400)
    
    text = data["text"]
    if not isinstance(text, str) or not text.strip():
        return make_response(jsonify({"error": "Invalid text input"}), 400)
    
    translations = {}
    try:
        for lang_code, model_name in MODEL_NAMES.items():
            model, tokenizer = get_model_and_tokenizer(lang_code)
            
            # Tokenize and translate
            inputs = tokenizer(text, return_tensors="pt", padding=True)
            translated = model.generate(**inputs)
            translated_text = tokenizer.batch_decode(translated, skip_special_tokens=True)[0]
            
            translations[lang_code] = translated_text
            
        return make_response(jsonify({
            "translations": translations,
            "original_text": text
        }), 200)
    except Exception as e:
        return make_response(jsonify({"error": f"Translation failed: {str(e)}"}), 500)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000) 