from flask import Flask, request, jsonify
import transcribe
import synthesize

app = Flask(__name__)


@app.route("/transcribe", methods=["POST"])
def transcribe_endpoint():
    if "file" not in request.files:
         return jsonify({"error": "No file part"}), 400
    file = request.files["file"]
    if not file.filename:
         return jsonify({"error": "No selected file"}), 400
    (text, err) = transcribe.transcribe(file)
    if err:
         return jsonify({"error": err}), 500
    return jsonify({"text": text})


@app.route("/translate", methods=["POST"])
def translate_endpoint():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "No selected file"}), 400
    (text, err) = transcribe.transcribe(file, translate=True)
    if err:
        return jsonify({"error": err}), 500
    return jsonify({"text": text})


@app.route("/synthesize", methods=["POST"])
def synthesize_endpoint():
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "Missing 'text' in JSON body"}), 400
    (audio_bytes, err) = synthesize.synthesize(data["text"])
    if err:
        return jsonify({"error": err}), 500
    return jsonify({"audio": audio_bytes.decode("latin1")})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000) 