import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API_ORIGIN } from '../services/api.config';

export default function useChatSocket() {
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const connection = io(API_ORIGIN, {
      withCredentials: true,
      autoConnect: true,
    });

    connection.on('connect', () => {
      setError('');
      setSocket(connection);
    });
    connection.on('connect_error', (connectError) => {
      setError(connectError.message || 'Chat connection failed.');
    });
    connection.on('disconnect', () => {
      setSocket(null);
    });

    return () => {
      connection.disconnect();
    };
  }, []);

  return { socket, error };
}
