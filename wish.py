from flask import Flask, request, jsonify
import whisper
from transformers import pipeline
import os
from tempfile import NamedTemporaryFile
from flask_cors import CORS

app = Flask(__name__)

# Enable CORS to allow cross-origin requests from the frontend
CORS(app)

# Load models
whisper_model = whisper.load_model("base")  # Whisper model for transcription
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")  # BART model for summarization

@app.route("/summarize", methods=["POST"])
def transcribe_audio():
    try:
        # Get the audio file from the request
        audio_file = request.files.get('file')

        if not audio_file:
            print("No audio file received.")
            return jsonify({"error": "No audio file provided."}), 400

        # Log the file name and size for debugging
        print(f"Received file: {audio_file.filename}, Size: {len(audio_file.read())} bytes")
        audio_file.seek(0)  # Reset the file pointer after reading

        # Save the file temporarily as a WAV file (for compatibility with Whisper)
        with NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio_file:
            audio_file.save(temp_audio_file.name)
            print(f"Audio file saved as: {temp_audio_file.name}")

            # Transcribe the audio using Whisper
            try:
                print("Starting transcription with Whisper...")
                transcription = whisper_model.transcribe(temp_audio_file.name)["text"]
                print(f"Transcription: {transcription}")
            except Exception as e:
                print(f"Error during transcription with Whisper: {str(e)}")
                return jsonify({"error": f"Transcription failed: {str(e)}"}), 500

        # Remove the temporary audio file after processing
        os.remove(temp_audio_file.name)

        return jsonify({"transcription": transcription})

    except Exception as e:
        print(f"Error during transcription: {str(e)}")  # Log error for easier debugging
        return jsonify({"error": f"Transcription failed: {str(e)}"}), 500


@app.route("/summarize_text", methods=["POST"])
def summarize_text():
    try:
        # Get the text from the request
        data = request.get_json()
        text = data.get("text", "")

        if not text:
            return jsonify({"error": "No text provided"}), 400

        print(f"Text to summarize: {text}")  # Log the text to summarize

        # Generate summary using BART model
        try:
            summary = summarizer(text, max_length=150, min_length=50, do_sample=False)[0]["summary_text"]
            print(f"Generated Summary: {summary}")  # Log the generated summary
        except Exception as e:
            print(f"Error during summarization with BART: {str(e)}")
            return jsonify({"error": f"Summarization failed: {str(e)}"}), 500
        
        return jsonify({"summary": summary})

    except Exception as e:
        print(f"Error during summarization: {str(e)}")  # Log error for easier debugging
        return jsonify({"error": f"Summarization failed: {str(e)}"}), 500


if __name__ == "__main__":
    # Set host to '0.0.0.0' for external access if necessary, or '127.0.0.1' for local
    app.run(debug=True, host="0.0.0.0", port=5000)
