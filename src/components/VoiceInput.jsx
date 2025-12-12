import { useState, useEffect, useRef, useContext } from 'react';
import { Mic, MicOff, Loader2, Sparkles, X, Volume2, Check } from 'lucide-react';
import { BrandContext } from '../context/BrandContext';
import { polishVoiceTranscript } from '../services/grokAPI';
import { useToast } from '../context/ToastContext';

/**
 * VoiceInput - Voice-to-post component using Web Speech API
 * 
 * Allows users to speak their post idea, transcribes it, and uses AI
 * to polish it into platform-ready content.
 */
export default function VoiceInput({ 
  onTranscript, 
  onPolishedContent,
  platform = 'social media',
  autoPolish = true,
  className = ''
}) {
  const { brandData } = useContext(BrandContext);
  const { showToast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishedContent, setPolishedContent] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  
  const recognitionRef = useRef(null);

  // Check for browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  // Initialize speech recognition
  const initRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const currentTranscript = transcript + finalTranscript;
      setTranscript(currentTranscript + interimTranscript);
      
      if (finalTranscript && onTranscript) {
        onTranscript(currentTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        showToast('Microphone access denied. Please enable microphone permissions.', 'error');
      } else if (event.error !== 'aborted') {
        showToast('Voice recognition error. Please try again.', 'error');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      if (isListening) {
        // Restart if we're still supposed to be listening
        try {
          recognition.start();
        } catch (e) {
          setIsListening(false);
        }
      }
    };

    return recognition;
  };

  const startListening = () => {
    if (!isSupported) {
      showToast('Voice input is not supported in this browser', 'error');
      return;
    }

    const recognition = initRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    setTranscript('');
    setPolishedContent(null);
    setShowPreview(false);

    try {
      recognition.start();
      setIsListening(true);
      showToast('Listening... Speak your post idea', 'info');
    } catch (error) {
      console.error('Failed to start recognition:', error);
      showToast('Failed to start voice input', 'error');
    }
  };

  const stopListening = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);

    if (transcript.trim() && autoPolish) {
      await polishContent();
    } else if (transcript.trim()) {
      setShowPreview(true);
    }
  };

  const polishContent = async () => {
    if (!transcript.trim()) {
      showToast('No content to polish', 'warning');
      return;
    }

    setIsPolishing(true);
    setShowPreview(true);

    try {
      const result = await polishVoiceTranscript(transcript, brandData, platform);
      
      if (result.success) {
        setPolishedContent({
          caption: result.caption,
          hashtags: result.hashtags
        });
        showToast('Content polished with AI!', 'success');
      } else {
        // Fallback - just clean up the transcript
        setPolishedContent({
          caption: transcript.trim(),
          hashtags: ''
        });
        showToast('Using original transcript', 'info');
      }
    } catch (error) {
      console.error('Polish error:', error);
      setPolishedContent({
        caption: transcript.trim(),
        hashtags: ''
      });
    } finally {
      setIsPolishing(false);
    }
  };

  const handleUseContent = () => {
    if (polishedContent && onPolishedContent) {
      onPolishedContent(polishedContent);
      showToast('Content added to your post!', 'success');
      resetState();
    }
  };

  const handleUseOriginal = () => {
    if (onPolishedContent) {
      onPolishedContent({ caption: transcript.trim(), hashtags: '' });
      showToast('Original transcript added to your post!', 'success');
      resetState();
    }
  };

  const resetState = () => {
    setTranscript('');
    setPolishedContent(null);
    setShowPreview(false);
  };

  if (!isSupported) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-gray-500 text-sm ${className}`}>
        <MicOff className="w-4 h-4" />
        <span>Voice input not supported</span>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Voice Input Button */}
      <div className="flex items-center gap-3">
        <div className="relative group">
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isPolishing}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
              isListening
                ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                : 'bg-huttle-primary text-white hover:shadow-lg hover:shadow-huttle-primary/25'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isListening ? (
              <>
                <MicOff className="w-5 h-5" />
                <span>Stop Recording</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                <span>Voice to Post</span>
              </>
            )}
          </button>
          
          {/* Hover Preview Tooltip */}
          {!isListening && (
            <div className="absolute bottom-full left-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
              <div className="bg-huttle-50 text-huttle-primary text-xs rounded-lg px-2.5 py-1.5 shadow-lg border border-huttle-primary/20 max-w-[200px] text-center">
                Record your voice, AI transforms it into a polished post
                <div className="absolute top-full left-6 w-0 h-0 border-4 border-transparent border-t-blue-50" />
              </div>
            </div>
          )}
        </div>

        {isListening && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Volume2 className="w-4 h-4 text-red-500 animate-pulse" />
            <span>Listening...</span>
          </div>
        )}

        {transcript && !isListening && !showPreview && (
          <button
            onClick={() => setShowPreview(true)}
            className="text-sm text-huttle-primary hover:underline"
          >
            Preview transcript
          </button>
        )}
      </div>

      {/* Live Transcript Display */}
      {isListening && transcript && (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600 mb-1 font-medium">Live transcript:</p>
          <p className="text-gray-800">{transcript}</p>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="p-4 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-huttle-primary" />
              Voice Content Preview
            </h4>
            <button
              onClick={resetState}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Original Transcript */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Original Transcript:</p>
            <p className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
              {transcript}
            </p>
          </div>

          {/* Polished Content */}
          {isPolishing ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="w-5 h-5 animate-spin text-huttle-primary" />
              <span className="text-sm text-gray-600">Polishing with AI...</span>
            </div>
          ) : polishedContent ? (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-huttle-primary" />
                AI-Polished Version:
              </p>
              <div className="bg-huttle-primary/5 p-3 rounded-lg border border-huttle-primary/20">
                <p className="text-gray-800 mb-2">{polishedContent.caption}</p>
                {polishedContent.hashtags && (
                  <p className="text-sm text-huttle-primary">{polishedContent.hashtags}</p>
                )}
              </div>
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!polishedContent && !isPolishing && (
              <button
                onClick={polishContent}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-colors text-sm font-medium"
              >
                <Sparkles className="w-4 h-4" />
                Polish with AI
              </button>
            )}
            
            {polishedContent && (
              <>
                <button
                  onClick={handleUseContent}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-huttle-primary text-white rounded-lg hover:bg-huttle-primary-dark transition-colors text-sm font-medium"
                >
                  <Check className="w-4 h-4" />
                  Use Polished
                </button>
                <button
                  onClick={handleUseOriginal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Use Original
                </button>
              </>
            )}
            
            {!polishedContent && !isPolishing && (
              <button
                onClick={handleUseOriginal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Use As-Is
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact voice button for inline use
 */
export function VoiceInputButton({ onContent, platform, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleContent = (content) => {
    onContent(content);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <div className="relative group">
        <button
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gradient-to-r from-huttle-primary to-huttle-primary-light text-white rounded-lg hover:shadow-md transition-all font-medium ${className}`}
        >
          <Mic className="w-3.5 h-3.5" />
          Voice
        </button>
        
        {/* Hover Preview Tooltip */}
        <div className="absolute bottom-full left-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
          <div className="bg-huttle-50 text-huttle-primary text-xs rounded-lg px-2.5 py-1.5 shadow-lg border border-huttle-primary/20 max-w-[180px] text-center">
            Record your voice, AI transforms it into a polished post
            <div className="absolute top-full left-4 w-0 h-0 border-4 border-transparent border-t-blue-50" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-2 z-10">
      <VoiceInput
        onPolishedContent={handleContent}
        platform={platform}
        autoPolish={true}
      />
    </div>
  );
}

