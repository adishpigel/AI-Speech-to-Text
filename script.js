class SuperTexter {
    constructor() {
        this.initElements();
        this.bindEvents();
        this.loadApiKey();
    }

    initElements() {
        // API Key Elements
        this.apiKeyInput = document.getElementById('apiKeyInput');
        this.saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
        this.apiKeyStatus = document.getElementById('apiKeyStatus');
        
        // Transcription Elements
        this.fileUploadBtn = document.getElementById('fileUploadBtn');
        this.recordBtn = document.getElementById('recordBtn');
        this.audioFileInput = document.getElementById('audioFileInput');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');
        this.transcriptionResult = document.getElementById('transcriptionResult');
        this.transcriptionText = document.getElementById('transcriptionText');
        
        // Action Buttons
        this.copyBtn = document.getElementById('copyBtn');
        this.downloadBtn = document.getElementById('downloadBtn');

        // Bind additional events
        this.copyBtn.addEventListener('click', () => this.copyTranscription());
        this.downloadBtn.addEventListener('click', () => this.downloadTranscription());
    }

    bindEvents() {
        // API Key Events
        this.saveApiKeyBtn.addEventListener('click', () => this.saveApiKey());
        
        // File and Recording Events
        this.fileUploadBtn.addEventListener('click', () => this.audioFileInput.click());
        this.audioFileInput.addEventListener('change', (e) => this.handleFileUpload(e.target.files[0]));
        this.recordBtn.addEventListener('click', () => this.startRecording());
    }

    saveApiKey() {
        const apiKey = this.apiKeyInput.value.trim();
        if (apiKey) {
            this.validateApiKey(apiKey)
                .then(isValid => {
                    if (isValid) {
                        localStorage.setItem('groqApiKey', apiKey);
                        this.showApiKeyStatus(true, 'מפתח API נשמר בהצלחה');
                    } else {
                        this.showApiKeyStatus(false, 'מפתח API לא תקין');
                    }
                });
        }
    }

    async validateApiKey(apiKey) {
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "llama3-70b-8192",
                    messages: [{"role": "user", "content": "Hello"}]
                })
            });
            return response.ok;
        } catch (error) {
            console.error('שגיאת אימות API:', error);
            return false;
        }
    }

    showApiKeyStatus(isValid, message) {
        this.apiKeyStatus.textContent = message;
        this.apiKeyStatus.className = `api-key-status ${isValid ? 'valid' : 'invalid'}`;
    }

    loadApiKey() {
        const savedApiKey = localStorage.getItem('groqApiKey');
        if (savedApiKey) {
            this.apiKeyInput.value = savedApiKey;
            this.validateApiKey(savedApiKey)
                .then(isValid => {
                    if (isValid) {
                        this.showApiKeyStatus(true, 'מפתח API תקף');
                    }
                });
        }
    }

    async handleFileUpload(file) {
        const apiKey = localStorage.getItem('groqApiKey');
        if (!apiKey) {
            this.showApiKeyStatus(false, 'אנא הזן API Key תחילה');
            return;
        }

        this.progressContainer.classList.remove('hidden');
        this.transcriptionResult.classList.add('hidden');
        
        try {
            const transcription = await this.transcribeAudio(file, apiKey);
            this.displayTranscription(transcription);
        } catch (error) {
            this.showError(`שגיאה בתמלול: ${error.message}`);
        }
    }

    async transcribeAudio(file, apiKey) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('model', 'whisper-large-v3');
        formData.append('response_format', 'verbose_json');

        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('שגיאה בתמלול');
        }

        const data = await response.json();
        return data.text;
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            const audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const recordedFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
                await this.handleFileUpload(recordedFile);
            };

            mediaRecorder.start();
            alert('ההקלטה החלה. לחץ OK לסיום.');
            mediaRecorder.stop();
        } catch (error) {
            alert(`שגיאה בהקלטה: ${error.message}`);
        }
    }

    displayTranscription(text) {
        this.transcriptionText.textContent = text;
        this.transcriptionResult.classList.remove('hidden');
        this.progressContainer.classList.add('hidden');
    }

    showError(message) {
        this.progressContainer.classList.add('hidden');
        this.transcriptionText.textContent = message;
        this.transcriptionResult.classList.remove('hidden');
    }

    copyTranscription() {
        navigator.clipboard.writeText(this.transcriptionText.textContent)
            .then(() => alert('הטקסט הועתק בהצלחה'));
    }

    downloadTranscription() {
        const blob = new Blob([this.transcriptionText.textContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transcription.txt';
        a.click();
        URL.revokeObjectURL(url);
    }
}

// יצירת אינסטנס של האפליקציה
document.addEventListener('DOMContentLoaded', () => {
    new SuperTexter();
});
