import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import Peer from 'simple-peer';
import { Camera } from 'lucide-react';
import { BACKEND_URL } from '../config';

const VideoChat = ({ roomId, isEnglish, onConnectionChange }) => {
  const [stream, setStream] = useState(null);
  const [peers, setPeers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  const userVideo = useRef();
  const peerVideo = useRef();
  const socketRef = useRef();
  const peersRef = useRef([]);
  const userIdRef = useRef(`user-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`);

  useEffect(() => {
    // Get user media
    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      .then((currentStream) => {
        setStream(currentStream);
        if (userVideo.current) {
          userVideo.current.srcObject = currentStream;
        }

        // Connect to socket
        socketRef.current = io(BACKEND_URL, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        socketRef.current.on('connect', () => {
          console.log('✅ Connected to signaling server');
        });

        socketRef.current.on('disconnect', (reason) => {
          console.log('⚠️ Disconnected from server:', reason);
        });

        socketRef.current.on('connect_error', (error) => {
          console.error('❌ Connection error:', error);
          alert('Unable to connect to server. Please check your internet connection.');
        });

        // Emit join-room event
        console.log('📡 Joining room:', roomId);
        socketRef.current.emit('join-room', roomId, userIdRef.current);

        // Handle other users already in room
        socketRef.current.on('other-users', (users) => {
          console.log('Other users in room:', users);
          users.forEach((userId) => {
            const peer = createPeer(userId, socketRef.current.id, currentStream);
            peersRef.current.push({
              peerId: userId,
              peer,
            });
          });
          setPeers([...peersRef.current]);
        });

        // Handle new user joining
        socketRef.current.on('user-joined', (userId) => {
          console.log('User joined:', userId);
          setIsConnected(true);
          if (onConnectionChange) onConnectionChange(true);
        });

        // Handle receiving offer
        socketRef.current.on('offer', ({ sdp, caller }) => {
          console.log('Received offer from:', caller);
          const peer = addPeer(sdp, caller, currentStream);
          peersRef.current.push({
            peerId: caller,
            peer,
          });
          setPeers([...peersRef.current]);
          setIsConnected(true);
          if (onConnectionChange) onConnectionChange(true);
        });

        // Handle receiving answer
        socketRef.current.on('answer', ({ sdp, answerer }) => {
          console.log('Received answer from:', answerer);
          const item = peersRef.current.find((p) => p.peerId === answerer);
          if (item) {
            item.peer.signal(sdp);
            setIsConnected(true);
            if (onConnectionChange) onConnectionChange(true);
          }
        });

        // Handle ICE candidate
        socketRef.current.on('ice-candidate', ({ candidate, sender }) => {
          console.log('Received ICE candidate from:', sender);
          const item = peersRef.current.find((p) => p.peerId === sender);
          if (item && candidate) {
            item.peer.signal(candidate);
          }
        });

        // Handle user leaving
        socketRef.current.on('user-left', (userId) => {
          console.log('User left:', userId);
          const peerObj = peersRef.current.find((p) => p.peerId === userId);
          if (peerObj) {
            peerObj.peer.destroy();
          }
          peersRef.current = peersRef.current.filter((p) => p.peerId !== userId);
          setPeers([...peersRef.current]);
          setIsConnected(false);
          if (onConnectionChange) onConnectionChange(false);
        });
      })
      .catch((err) => {
        console.error('Error accessing media devices:', err);
        alert(
          'Unable to access camera or microphone. Please ensure you have granted permissions and try again.'
        );
      });

    // Cleanup on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      peersRef.current.forEach(({ peer }) => {
        peer.destroy();
      });
    };
  }, [roomId]);

  // Create peer (initiator)
  function createPeer(userToSignal, callerId, stream) {
    const peer = new Peer({
      initiator: true,
      trickle: true,
      stream,
      config: {
        iceServers: [
          // Google STUN servers
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          // Free TURN servers from Metered.ca
          {
            urls: 'turn:a.relay.metered.ca:80',
            username: 'b8c4b0f0a3f0f3f3d3f3f3f3',
            credential: 'SomeRandomCredential',
          },
          {
            urls: 'turn:a.relay.metered.ca:443',
            username: 'b8c4b0f0a3f0f3f3d3f3f3f3',
            credential: 'SomeRandomCredential',
          },
          {
            urls: 'turn:a.relay.metered.ca:443?transport=tcp',
            username: 'b8c4b0f0a3f0f3f3d3f3f3f3',
            credential: 'SomeRandomCredential',
          },
        ],
        iceTransportPolicy: 'all',
      },
    });

    peer.on('signal', (signal) => {
      console.log('Sending offer to:', userToSignal);
      socketRef.current.emit('offer', {
        target: userToSignal,
        caller: callerId,
        sdp: signal,
      });
    });

    peer.on('stream', (remoteStream) => {
      console.log('✅ Received remote stream from peer');
      if (peerVideo.current) {
        peerVideo.current.srcObject = remoteStream;
      }
      setIsConnected(true);
      if (onConnectionChange) onConnectionChange(true);
    });

    peer.on('connect', () => {
      console.log('✅ Peer connection established');
    });

    peer.on('close', () => {
      console.log('⚠️ Peer connection closed');
    });

    peer.on('error', (err) => {
      console.error('❌ Peer connection error:', err);
      alert(`Connection error: ${err.message}. Please try refreshing the page.`);
    });

    return peer;
  }

  // Add peer (receiver)
  function addPeer(incomingSignal, callerId, stream) {
    const peer = new Peer({
      initiator: false,
      trickle: true,
      stream,
      config: {
        iceServers: [
          // Google STUN servers
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          // Free TURN servers from Metered.ca
          {
            urls: 'turn:a.relay.metered.ca:80',
            username: 'b8c4b0f0a3f0f3f3d3f3f3f3',
            credential: 'SomeRandomCredential',
          },
          {
            urls: 'turn:a.relay.metered.ca:443',
            username: 'b8c4b0f0a3f0f3f3d3f3f3f3',
            credential: 'SomeRandomCredential',
          },
          {
            urls: 'turn:a.relay.metered.ca:443?transport=tcp',
            username: 'b8c4b0f0a3f0f3f3d3f3f3f3',
            credential: 'SomeRandomCredential',
          },
        ],
        iceTransportPolicy: 'all',
      },
    });

    peer.on('signal', (signal) => {
      console.log('Sending answer to:', callerId);
      socketRef.current.emit('answer', {
        target: callerId,
        answerer: socketRef.current.id,
        sdp: signal,
      });
    });

    peer.on('stream', (remoteStream) => {
      console.log('✅ Received remote stream from peer');
      if (peerVideo.current) {
        peerVideo.current.srcObject = remoteStream;
      }
      setIsConnected(true);
      if (onConnectionChange) onConnectionChange(true);
    });

    peer.on('connect', () => {
      console.log('✅ Peer connection established');
    });

    peer.on('close', () => {
      console.log('⚠️ Peer connection closed');
    });

    peer.on('error', (err) => {
      console.error('❌ Peer connection error:', err);
      alert(`Connection error: ${err.message}. Please try refreshing the page.`);
    });

    peer.signal(incomingSignal);

    return peer;
  }

  return (
    <div className="relative w-full h-full bg-gray-900">
      {/* Partner Video - Full Screen Background */}
      <div className="absolute inset-0 w-full h-full">
        {peers.length > 0 || isConnected ? (
          <>
            <video
              ref={peerVideo}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-4 py-2 rounded-lg shadow-lg">
              <span className="text-white text-sm font-semibold">
                {isEnglish ? 'Her (Ukrainian)' : 'Він (English)'}
              </span>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <Camera className="w-20 h-20 text-pink-400 mb-4 animate-pulse-slow" />
            <p className="text-white text-xl font-semibold mb-2">
              {isEnglish
                ? 'Waiting for your partner to join...'
                : 'Очікування підключення партнера...'}
            </p>
            <p className="text-gray-400 text-base">
              {isEnglish ? 'Share the room link with them' : 'Поділіться посиланням на кімнату'}
            </p>
          </div>
        )}
      </div>

      {/* Your Video - Picture-in-Picture at Top Right */}
      <div className="absolute top-2 right-2 w-24 h-32 sm:w-32 sm:h-40 md:w-48 md:h-36 lg:w-64 lg:h-48 bg-gray-900 rounded-lg sm:rounded-xl shadow-2xl overflow-hidden border-2 border-white/20 hover:border-pink-500 transition-all duration-300 z-10">
        <video
          ref={userVideo}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-1 left-1 bg-black/70 backdrop-blur px-1.5 py-0.5 sm:px-2 sm:py-1 rounded">
          <span className="text-white text-[10px] sm:text-xs font-semibold">
            {isEnglish ? 'You' : 'Ви'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VideoChat;
