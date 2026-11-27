import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export default function useChatSocket() {
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const connection = io('http://localhost:3000', {
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
