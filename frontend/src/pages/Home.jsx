import React, { useState } from 'react';
import { Container, Box, Paper, Typography } from '@mui/material';
import Recorder from '../components/Recorder';
import AudioPlayer from '../components/AudioPlayer';
import { notify } from '../components/Toast';

const Home = () => {
  const [recordedAudio, setRecordedAudio] = useState(null);

  const handleRecordingComplete = (audioBlob) => {
    const url = URL.createObjectURL(audioBlob);
    setRecordedAudio(url);
    notify.success('Recording completed successfully!');
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Audio Recorder
        </Typography>
        
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Recorder onRecordingComplete={handleRecordingComplete} />
        </Paper>

        {recordedAudio && (
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recorded Audio
            </Typography>
            <AudioPlayer src={recordedAudio} title="Your Recording" />
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default Home; 