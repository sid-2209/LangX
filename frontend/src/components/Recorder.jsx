import React, { useState, useRef, useCallback } from 'react';
import { Button, Box, Typography, CircularProgress, Alert, Snackbar } from '@mui/material';
import { Mic, Stop, PlayArrow, Error } from '@mui/icons-material';
import AudioRecorder from '../utils/audioRecorder';

const Recorder = ({ onRecordingComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);
  const recorderRef = useRef(null);
  const audioRef = useRef(null);

  const handleError = useCallback((message) => {
    setError(message);
    setIsLoading(false);
    setIsRecording(false);
  }, []);

  const startRecording = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recorderRef.current = new AudioRecorder(stream);
      await recorderRef.current.start();
      
      setIsRecording(true);
      setAudioUrl(null);
    } catch (error) {
      let errorMessage = 'Failed to start recording';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone access was denied. Please allow microphone access to record audio.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
      }
      handleError(errorMessage);
      console.error('Recording error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stopRecording = async () => {
    if (!recorderRef.current) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const audioBlob = await recorderRef.current.stop();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      setIsRecording(false);
      onRecordingComplete?.(audioBlob);
    } catch (error) {
      handleError('Failed to stop recording. Please try again.');
      console.error('Stop recording error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            handleError('Failed to play audio. Please try again.');
            console.error('Playback error:', error);
          });
        }
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      handleError('Failed to play audio. Please try again.');
      console.error('Playback error:', error);
    }
  };

  const handleCloseError = () => {
    setError(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, p: 2 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        Audio Recorder
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button
          variant="contained"
          color={isRecording ? 'error' : 'primary'}
          onClick={isRecording ? stopRecording : startRecording}
          startIcon={isRecording ? <Stop /> : <Mic />}
          disabled={isLoading || isPlaying}
          size="large"
        >
          {isLoading ? 'Processing...' : isRecording ? 'Stop Recording' : 'Start Recording'}
        </Button>

        {audioUrl && (
          <Button
            variant="outlined"
            onClick={togglePlayback}
            startIcon={<PlayArrow />}
            disabled={isRecording || isLoading}
            size="large"
          >
            {isPlaying ? 'Pause' : 'Play Recording'}
          </Button>
        )}
      </Box>

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          style={{ display: 'none' }}
        />
      )}

      {isRecording && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={20} color="error" />
          <Typography variant="body2" color="error">
            Recording in progress...
          </Typography>
        </Box>
      )}

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseError} 
          severity="error" 
          variant="filled"
          icon={<Error />}
        >
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Recorder; 