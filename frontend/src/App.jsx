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
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import Recorder from './components/Recorder';
import AudioPlayer from './components/AudioPlayer';
import Loader from './components/Loader';

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
  TRANSLATE: '/translate',
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
      toast.error(serverMessage, toastConfig);
    } else if (error.request) {
      // Request made but no response
      toast.error(ERROR_MESSAGES.NETWORK, toastConfig);
    } else {
      // Other errors
      toast.error(customMessage || ERROR_MESSAGES.SERVER, toastConfig);
    }
  };

  const translateText = async (text) => {
    if (!text) {
      toast.error(ERROR_MESSAGES.TRANSLATION.NO_TEXT, toastConfig);
      return;
    }

    if (!targetLang) {
      toast.error(ERROR_MESSAGES.TRANSLATION.INVALID_LANG, toastConfig);
      return;
    }

    const toastId = showLoadingToast('Translating text...');
    try {
      setIsTranslating(true);
      const response = await axios.post(API_ENDPOINTS.TRANSLATE, {
        text,
        target_lang: targetLang
      }, {
        timeout: 10000, // 10 second timeout
      });

      if (!response.data?.translation) {
        throw new Error(ERROR_MESSAGES.TRANSLATION.FAILED);
      }

      setTranslation(response.data.translation);
      updateToast(toastId, 'Translation complete!');
    } catch (error) {
      handleApiError(error, ERROR_MESSAGES.TRANSLATION.FAILED);
      setTranslation('');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleRecordingComplete = async (audioBlob) => {
    if (!audioBlob) {
      toast.error(ERROR_MESSAGES.TRANSCRIPTION.NO_AUDIO, toastConfig);
      return;
    }

    const toastId = showLoadingToast('Transcribing audio...');
    try {
      setIsTranscribing(true);
      setTranslation('');
      setClonedAudioUrl(null);
      lastRecordingRef.current = audioBlob;

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

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
      updateToast(toastId, 'Transcription complete!');

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

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
      toast.error('Please upload a .wav or .mp3 file only.', toastConfig);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 10MB.', toastConfig);
      return;
    }

    setUploadedFile(file);
    toast.success('Audio file uploaded successfully!', toastConfig);
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
      toast.error(ERROR_MESSAGES.SYNTHESIS.NO_TEXT, toastConfig);
      return;
    }

    if (!lastRecordingRef.current && !uploadedFile) {
      toast.error(ERROR_MESSAGES.SYNTHESIS.NO_REFERENCE, toastConfig);
      return;
    }

    const toastId = showLoadingToast('Cloning voice...');
    try {
      setIsCloning(true);
      const formData = new FormData();
      formData.append('text', translation);
      
      const audioFile = uploadedFile || lastRecordingRef.current;
      const fileName = uploadedFile ? uploadedFile.name : 'reference.webm';
      formData.append('reference_audio', audioFile, fileName);

      const response = await axios.post(API_ENDPOINTS.SYNTHESIZE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        responseType: 'blob',
        timeout: 60000, // 60 second timeout for synthesis
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
      const audioUrl = URL.createObjectURL(audioBlob);
      setClonedAudioUrl(audioUrl);
      updateToast(toastId, 'Voice cloning complete!');
    } catch (error) {
      handleApiError(error, ERROR_MESSAGES.SYNTHESIS.FAILED);
      setClonedAudioUrl(null);
    } finally {
      setIsCloning(false);
    }
  };

  // Enhanced cleanup
  React.useEffect(() => {
    return () => {
      // Cleanup audio URLs
      if (clonedAudioUrl) {
        URL.revokeObjectURL(clonedAudioUrl);
      }
      // Reset states
      setTranscription('');
      setTranslation('');
      setClonedAudioUrl(null);
      setUploadedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
  }, [clonedAudioUrl]);

  // Toast configuration
  const toastConfig = {
    position: "top-center",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
  };

  const showLoadingToast = (message) => {
    return toast.loading(message, {
      ...toastConfig,
      autoClose: false,
    });
  };

  const updateToast = (toastId, message, type = 'success') => {
    toast.update(toastId, {
      render: message,
      type,
      isLoading: false,
      autoClose: 3000,
    });
  };

  const isLoading = isTranscribing || isTranslating || isCloning;

  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
        }}
        open={isLoading}
      >
        <Loader 
          message={
            isTranscribing ? 'Transcribing audio...' :
            isTranslating ? 'Translating text...' :
            isCloning ? 'Cloning voice...' :
            'Processing...'
          }
        />
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

              {clonedAudioUrl && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Cloned Voice
                    </Typography>
                    <AudioPlayer 
                      src={clonedAudioUrl} 
                      title="Synthesized Speech"
                    />
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
