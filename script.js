let mediaRecorder;
let audioChunks = [];

// Start recording audio
document.getElementById("startRecording").addEventListener("click", async () => {
    try {
        // Ensure that the MediaRecorder is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Your browser does not support media devices or microphone access.");
            return;
        }

        // Ask for microphone permission and start recording
        let stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        if (!stream) {
            alert("Microphone access failed.");
            return;
        }

        // Initialize the MediaRecorder with the audio stream
        mediaRecorder = new MediaRecorder(stream);

        // Collect the audio data as it's recorded
        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            // When recording is stopped, combine the chunks into a Blob
            let audioBlob = new Blob(audioChunks, { type: "audio/wav" });
            let audioUrl = URL.createObjectURL(audioBlob);

            // Set the audio playback for the user
            let audioElement = document.getElementById("audioPlayback");
            audioElement.src = audioUrl;
            audioElement.controls = true;
            audioElement.play(); // Automatically play the audio

            // Prepare the audio for the server
            let formData = new FormData();
            formData.append("file", audioBlob, "audio.wav");

            try {
                let response = await fetch("http://127.0.0.1:5000/summarize", {
                    method: "POST",
                    body: formData
                });

                if (!response.ok) {
                    throw new Error(`Failed to transcribe, status code: ${response.status}`);
                }

                let result = await response.json();
                if (result.transcription) {
                    document.getElementById("transcriptionResult").value = result.transcription;
                    document.getElementById("Summarize").disabled = false; // Enable Summarize button
                } else {
                    alert("Transcription failed: " + (result.error || "Unknown error"));
                }
            } catch (error) {
                console.error("Error during transcription:", error);
                alert("Error with transcription request. See console for details.");
            }
        };

        // Clear previous audio data and start recording
        audioChunks = [];
        mediaRecorder.start();
        document.getElementById("stopRecording").disabled = false;
        document.getElementById("startRecording").disabled = true;
        document.getElementById("status").innerText = "Recording...";  // UX improvement
    } catch (error) {
        console.error("Error starting the recording:", error);
        alert("Failed to start recording. Please check your microphone permissions.");
    }
});

// Stop recording
document.getElementById("stopRecording").addEventListener("click", () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        document.getElementById("stopRecording").disabled = true;
        document.getElementById("startRecording").disabled = false;
        document.getElementById("status").innerText = "Processing...";  // UX improvement
    }
});

// Summarize the transcription
document.getElementById("Summarize").addEventListener("click", async () => {
    let text = document.getElementById("transcriptionResult").value;
    if (!text) {
        alert("No transcription available to summarize!");
        return;
    }

    try {
        console.log("Sending text for summarization:", text);

        let response = await fetch("http://127.0.0.1:5000/summarize_text", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: text })
        });

        if (!response.ok) {
            throw new Error(`Failed to summarize, status code: ${response.status}`);
        }

        let result = await response.json();
        if (result.summary) {
            console.log("Summary received:", result.summary);
            alert("Summary: " + result.summary);
        } else {
            alert("Summarization failed: " + (result.error || "Unknown error"));
        }
    } catch (error) {
        console.error("Error during summarization:", error);
        alert("Failed to summarize. Please try again.");
    }
});
