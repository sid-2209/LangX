import React, { useState, useRef } from 'react';
import { 
  ThemeProvider, 
  createTheme, 
  CssBaseline, 
  Container, 
  Card, 
  CardContent, 
  Typography, 
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Button,
  Stack,
  Backdrop,
  AppBar,
  Toolbar,
  useMediaQuery,
  useTheme as useMuiTheme,
  IconButton,
  Tooltip,
} from '@mui/material';
import { ContentCopy, Translate, Mic, Upload as UploadIcon, Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';
import Recorder from './components/Recorder';
import AudioPlayer from './components/AudioPlayer';
import Loader from './components/Loader';
import Toast, { notify } from './components/Toast';

// Create a custom theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2196f3', // Blue
      light: '#64b5f6',
      dark: '#1976d2',
    },
    secondary: {
      main: '#f50057', // Pink
      light: '#ff4081',
      dark: '#c51162',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#2c3e50',
      secondary: '#546e7a',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h4: {
      fontWeight: 600,
      letterSpacing: '-0.5px',
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 12px 0 rgba(0,0,0,0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
});

// Configure axios defaults
axios.defaults.baseURL = 'http://localhost:5000';

// Language options
const LANGUAGES = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'zh', name: 'Chinese' }
];

const ALLOWED_AUDIO_TYPES = ['audio/wav', 'audio/mp3', 'audio/mpeg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// API endpoints configuration
const API_ENDPOINTS = {
  TRANSCRIBE: '/transcribe',
  TRANSLATE: '/translate_text',
  SYNTHESIZE: '/synthesize',
};

// Error messages
const ERROR_MESSAGES = {
  NETWORK: 'Network error. Please check your connection.',
  SERVER: 'Server error. Please try again later.',
  TRANSCRIPTION: {
    NO_AUDIO: 'No audio file provided.',
    INVALID_FORMAT: 'Invalid audio format.',
    FAILED: 'Failed to transcribe audio.',
  },
  TRANSLATION: {
    NO_TEXT: 'No text to translate.',
    INVALID_LANG: 'Invalid target language.',
    FAILED: 'Failed to translate text.',
  },
  SYNTHESIS: {
    NO_REFERENCE: 'No reference audio provided.',
    NO_TEXT: 'No text to synthesize.',
    FAILED: 'Failed to synthesize voice.',
  },
};

const App = () => {
  const [transcription, setTranscription] = useState('');
  const [translation, setTranslation] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [targetLang, setTargetLang] = useState('es');
  const [clonedAudioUrl, setClonedAudioUrl] = useState(null);
  const lastRecordingRef = useRef(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleLanguageChange = (event) => {
    setTargetLang(event.target.value);
    // Clear translation when language changes
    setTranslation('');
  };

  const handleApiError = (error, customMessage) => {
    console.error('API Error:', error);
    
    if (error.response) {
      // Server responded with error
      const serverMessage = error.response.data?.error || customMessage;
      notify.error(serverMessage || ERROR_MESSAGES.SERVER);
    } else if (error.request) {
      // Request made but no response
      notify.error(ERROR_MESSAGES.NETWORK);
    } else {
      // Other errors
      notify.error(customMessage || ERROR_MESSAGES.SERVER);
    }
  };

  const translateText = async (text) => {
    if (!text) {
      notify.error(ERROR_MESSAGES.TRANSLATION.NO_TEXT);
      return;
    }

    if (!targetLang) {
      notify.error(ERROR_MESSAGES.TRANSLATION.INVALID_LANG);
      return;
    }

    const toastId = notify.loading('Translating text...');

    try {
      setIsTranslating(true);
      const response = await axios.post(API_ENDPOINTS.TRANSLATE, {
        text: text,
        target_lang: targetLang
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      if (!response.data?.translations?.[targetLang]) {
        throw new Error(ERROR_MESSAGES.TRANSLATION.FAILED);
      }

      setTranslation(response.data.translations[targetLang]);
      notify.update(toastId, 'Translation completed!', 'success');
    } catch (error) {
      console.error('Translation error:', error);
      notify.update(toastId, error.message || ERROR_MESSAGES.TRANSLATION.FAILED, 'error');
      handleApiError(error, ERROR_MESSAGES.TRANSLATION.FAILED);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleRecordingComplete = async (audioBlob) => {
    if (!audioBlob) {
      notify.error(ERROR_MESSAGES.TRANSCRIPTION.NO_AUDIO);
      return;
    }

    const toastId = notify.loading('Transcribing audio...');
    try {
      setIsTranscribing(true);
      setTranslation('');
      setClonedAudioUrl(null);
      lastRecordingRef.current = audioBlob;

      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');

      const response = await axios.post(API_ENDPOINTS.TRANSCRIBE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout
      });

      if (!response.data?.transcription) {
        throw new Error(ERROR_MESSAGES.TRANSCRIPTION.FAILED);
      }

      const transcribedText = response.data.transcription;
      setTranscription(transcribedText);
      notify.update(toastId, 'Transcription complete!');

      // Automatically trigger translation if transcription is successful
      if (transcribedText !== 'No transcription available') {
        await translateText(transcribedText);
      }
    } catch (error) {
      handleApiError(error, ERROR_MESSAGES.TRANSCRIPTION.FAILED);
      setTranscription('');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
      notify.error(ERROR_MESSAGES.TRANSCRIPTION.INVALID_FORMAT);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      notify.error('File size must be less than 10MB.');
      return;
    }

    setUploadedFile(file);
    notify.success('Audio file uploaded successfully!');

    // Automatically trigger transcription
    const toastId = notify.loading('Transcribing audio...');

    try {
      setIsTranscribing(true);
      setTranslation('');
      setClonedAudioUrl(null);

      const formData = new FormData();
      formData.append('file', file, file.name);

      console.log('Uploading file:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      });

      const response = await axios.post(API_ENDPOINTS.TRANSCRIBE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      console.log('Transcription response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });

      if (response.status === 200 && response.data?.text) {
        const transcribedText = response.data.text;
        setTranscription(transcribedText);
        notify.update(toastId, 'Transcription complete!', 'success');

        // Automatically trigger translation if transcription is successful
        if (transcribedText !== 'No transcription available') {
          await translateText(transcribedText);
        }
      } else {
        throw new Error(response.data?.error || ERROR_MESSAGES.TRANSCRIPTION.FAILED);
      }
    } catch (error) {
      console.error('Transcription error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      
      notify.update(toastId, error.message || ERROR_MESSAGES.TRANSCRIPTION.FAILED, 'error');
      setTranscription('');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCloneVoice = async () => {
    // Validate prerequisites
    if (!translation) {
      notify.error(ERROR_MESSAGES.SYNTHESIS.NO_TEXT);
      return;
    }

    if (!lastRecordingRef.current && !uploadedFile) {
      notify.error(ERROR_MESSAGES.SYNTHESIS.NO_REFERENCE);
      return;
    }

    const toastId = notify.loading('Cloning voice...');
    try {
      setIsCloning(true);
      const formData = new FormData();
      formData.append('text', translation);
      
      const audioFile = uploadedFile || lastRecordingRef.current;
      const fileName = uploadedFile ? uploadedFile.name : 'reference.webm';
      formData.append('reference_audio', audioFile, fileName);

      console.log('Sending synthesis request:', {
        text: translation,
        fileName: fileName,
        fileType: audioFile.type,
        fileSize: audioFile.size
      });

      const response = await axios.post(API_ENDPOINTS.SYNTHESIZE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        responseType: 'blob',
        timeout: 60000, // 60 second timeout for synthesis
      });

      console.log('Synthesis response:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers['content-type'],
        dataSize: response.data.size
      });

      // Validate response
      if (!response.data || response.data.size === 0) {
        throw new Error(ERROR_MESSAGES.SYNTHESIS.FAILED);
      }

      // Clean up previous audio URL if exists
      if (clonedAudioUrl) {
        URL.revokeObjectURL(clonedAudioUrl);
      }

      const audioBlob = new Blob([response.data], { type: 'audio/webm' });
      console.log('Created audio blob:', {
        type: audioBlob.type,
        size: audioBlob.size
      });

      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('Created audio URL:', audioUrl);
      
      // Set the audio URL in state
      setClonedAudioUrl(audioUrl);
      notify.update(toastId, 'Voice cloning complete!');
    } catch (error) {
      console.error('Voice cloning error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      handleApiError(error, ERROR_MESSAGES.SYNTHESIS.FAILED);
      // Only clear the audio URL if there's an error
      setClonedAudioUrl(null);
    } finally {
      setIsCloning(false);
    }
  };

  // Enhanced cleanup - only clean up when component unmounts
  React.useEffect(() => {
    return () => {
      if (clonedAudioUrl) {
        URL.revokeObjectURL(clonedAudioUrl);
      }
    };
  }, []); // Empty dependency array means this only runs on unmount

  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const isLoading = isTranscribing || isTranslating || isCloning;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Toast />
      
      <Backdrop
        sx={{ 
          color: '#fff', 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'rgba(0, 0, 0, 0.8)'
        }} 
        open={isLoading}
      >
        <Loader />
      </Backdrop>

      <AppBar position="sticky" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            LangX
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Language Learning Assistant
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {/* Controls Column */}
          <Grid item xs={12} md={4}>
            <Stack spacing={3}>
              <Card>
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="h6" gutterBottom>
                      <Mic sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Audio Input
                    </Typography>
                    
                    {/* File Upload Section */}
                    <Box sx={{ mb: 2 }}>
                      <input
                        type="file"
                        accept=".wav,.mp3"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                        ref={fileInputRef}
                      />
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Button
                          variant="outlined"
                          startIcon={<UploadIcon />}
                          onClick={() => fileInputRef.current?.click()}
                          fullWidth
                        >
                          Upload Audio
                        </Button>
                        {uploadedFile && (
                          <Tooltip title="Remove uploaded file">
                            <IconButton 
                              color="error" 
                              onClick={handleRemoveFile}
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                      {uploadedFile && (
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ mt: 1, display: 'block' }}
                        >
                          Selected: {uploadedFile.name}
                        </Typography>
                      )}
                    </Box>

                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      align="center"
                      sx={{ mb: 1 }}
                    >
                      OR
                    </Typography>

                    <Recorder onRecordingComplete={handleRecordingComplete} />
                  </Stack>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Stack spacing={2}>
                    <Typography variant="h6" gutterBottom>
                      <Translate sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Language Settings
                    </Typography>
                    <FormControl fullWidth>
                      <InputLabel id="language-select-label">Target Language</InputLabel>
                      <Select
                        labelId="language-select-label"
                        id="language-select"
                        value={targetLang}
                        label="Target Language"
                        onChange={handleLanguageChange}
                        disabled={isTranscribing || isTranslating || isCloning}
                      >
                        {LANGUAGES.map((lang) => (
                          <MenuItem key={lang.code} value={lang.code}>
                            {lang.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                </CardContent>
              </Card>

              {translation && (
                <Card>
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography variant="h6" gutterBottom>
                        Voice Cloning
                      </Typography>
                      <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<ContentCopy />}
                        onClick={handleCloneVoice}
                        disabled={isCloning || (!lastRecordingRef.current && !uploadedFile)}
                        size="large"
                        fullWidth
                      >
                        {isCloning ? 'Cloning Voice...' : 'Clone Voice'}
                      </Button>
                      {(lastRecordingRef.current || uploadedFile) && (
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          align="center"
                        >
                          Using {uploadedFile ? 'uploaded file' : 'recorded audio'} as reference
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              )}
            </Stack>
          </Grid>

          {/* Output Column */}
          <Grid item xs={12} md={8}>
            <Stack spacing={3}>
              {transcription && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Transcription
                    </Typography>
                    <Typography 
                      variant="body1" 
                      color="text.secondary"
                      sx={{ 
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        minHeight: '4em'
                      }}
                    >
                      {transcription}
                    </Typography>
                  </CardContent>
                </Card>
              )}

              {translation && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Translation ({LANGUAGES.find(lang => lang.code === targetLang)?.name})
                    </Typography>
                    <Typography 
                      variant="body1" 
                      color="text.secondary"
                      sx={{ 
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        minHeight: '4em'
                      }}
                    >
                      {translation}
                    </Typography>
                  </CardContent>
                </Card>
              )}

              {/* Debug message */}
              <Typography variant="body2" color="text.secondary">
                {clonedAudioUrl ? 'Audio URL is set' : 'No audio URL'}
              </Typography>

              {/* Cloned Voice Card - Only show when we have an audio URL */}
              {clonedAudioUrl && (
                <Card sx={{ 
                  border: '1px solid',
                  borderColor: 'primary.main',
                  backgroundColor: 'background.paper'
                }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Cloned Voice
                    </Typography>
                    {console.log('Rendering AudioPlayer with URL:', clonedAudioUrl)}
                    <AudioPlayer 
                      src={clonedAudioUrl} 
                      title="Synthesized Speech"
                      key={clonedAudioUrl}
                    />
                    {console.log('AudioPlayer rendered')}
                  </CardContent>
                </Card>
              )}
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </ThemeProvider>
  );
};

export default App;
