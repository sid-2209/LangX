import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const Loader = ({ message = 'Loading...' }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        p: 2,
      }}
    >
      <CircularProgress size={40} />
      {message && (
        <Typography 
          variant="body2" 
          color="text.secondary"
          align="center"
        >
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default Loader; 