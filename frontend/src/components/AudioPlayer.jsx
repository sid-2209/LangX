import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Slider, 
  IconButton, 
  Typography, 
  Button,
  Stack,
  Tooltip
} from '@mui/material';
import { 
  PlayArrow, 
  Pause, 
  VolumeUp, 
  VolumeOff,
  Download
} from '@mui/icons-material';

const AudioPlayer = ({ src, title, downloadFileName = 'audio.webm' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const audioRef = useRef(null);

  // Handle both Blob and URL sources
  useEffect(() => {
    console.log('AudioPlayer received src:', {
      type: typeof src,
      isBlob: src instanceof Blob,
      value: src
    });

    if (src instanceof Blob) {
      const url = URL.createObjectURL(src);
      console.log('Created blob URL:', url);
      setAudioUrl(url);
      return () => {
        console.log('Cleaning up blob URL:', url);
        URL.revokeObjectURL(url);
      };
    } else {
      console.log('Using direct URL:', src);
      setAudioUrl(src);
    }
  }, [src]);

  const handlePlayPause = () => {
    if (!audioRef.current) {
      console.error('Audio element not found');
      return;
    }

    console.log('Play/Pause clicked:', {
      currentState: isPlaying ? 'playing' : 'paused',
      audioElement: {
        readyState: audioRef.current.readyState,
        error: audioRef.current.error,
        src: audioRef.current.src
      }
    });

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Playback error:', error);
          setIsPlaying(false);
        });
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      console.log('Audio metadata loaded:', {
        duration: audioRef.current.duration,
        readyState: audioRef.current.readyState,
        src: audioRef.current.src
      });
      setDuration(audioRef.current.duration);
    }
  };

  const handleSliderChange = (_, newValue) => {
    if (audioRef.current) {
      audioRef.current.currentTime = newValue;
      setCurrentTime(newValue);
    }
  };

  const handleVolumeChange = (_, newValue) => {
    if (audioRef.current) {
      audioRef.current.volume = newValue;
      setVolume(newValue);
      setIsMuted(newValue === 0);
    }
  };

  const handleMuteToggle = () => {
    if (audioRef.current) {
      const newMuted = !isMuted;
      audioRef.current.muted = newMuted;
      setIsMuted(newMuted);
      if (newMuted) {
        setVolume(0);
      } else {
        setVolume(1);
      }
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;

    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = downloadFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!audioUrl) return null;

  return (
    <Box sx={{ width: '100%', maxWidth: 600, p: 2 }}>
      {title && (
        <Typography variant="subtitle1" gutterBottom>
          {title}
        </Typography>
      )}
      
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
            <IconButton 
              onClick={handlePlayPause}
              color="primary"
              size="large"
            >
              {isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>
          </Tooltip>

          <Box sx={{ flex: 1 }}>
            <Slider
              value={currentTime}
              max={duration}
              onChange={handleSliderChange}
              aria-label="time"
              valueLabelDisplay="auto"
              valueLabelFormat={formatTime}
              disabled={!duration}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary">
                {formatTime(currentTime)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatTime(duration)}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', width: 120 }}>
            <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
              <IconButton onClick={handleMuteToggle} size="small">
                {isMuted ? <VolumeOff /> : <VolumeUp />}
              </IconButton>
            </Tooltip>
            <Slider
              value={volume}
              min={0}
              max={1}
              step={0.1}
              onChange={handleVolumeChange}
              aria-label="volume"
              sx={{ ml: 1 }}
            />
          </Box>

          <Tooltip title="Download">
            <IconButton 
              onClick={handleDownload}
              color="primary"
              size="small"
            >
              <Download />
            </IconButton>
          </Tooltip>
        </Box>

        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={(e) => {
            console.error('Audio error:', e);
            setIsPlaying(false);
          }}
        />
      </Stack>
    </Box>
  );
};

export default AudioPlayer; 