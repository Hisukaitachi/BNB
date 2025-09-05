// src/components/messaging/CallModal.jsx - WebRTC Video/Voice Calling
import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, Video, PhoneOff, Mic, MicOff, VideoOff, 
  Volume2, VolumeX, Maximize, Minimize, X 
} from 'lucide-react';

const CallModal = ({ 
  isOpen, 
  onClose, 
  callType, 
  isIncoming, 
  callerName, 
  receiverId, 
  socket 
}) => {
  const [callState, setCallState] = useState('connecting'); // connecting, ringing, active, ended
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const callStartTimeRef = useRef(null);

  // WebRTC Configuration
  const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Add a free TURN server for better connectivity
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ]
};

  useEffect(() => {
    if (isOpen && callState === 'connecting') {
      initializeCall();
    }

    return () => {
      cleanup();
    };
  }, [isOpen, callType]);

  // Call duration timer
  useEffect(() => {
    let interval;
    if (callState === 'active' && callStartTimeRef.current) {
      interval = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const initializeCall = async () => {
    try {
      console.log('Initializing call:', { callType, isIncoming, receiverId });
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true
      });

      console.log('Got user media:', stream);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const peerConnection = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = peerConnection;

      console.log('Created peer connection');

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        console.log('Adding track:', track.kind);
        peerConnection.addTrack(track, stream);
      });
      peerConnection.oniceconnectionstatechange = () => {
  console.log('🧊 ICE connection state:', peerConnection.iceConnectionState);
  if (peerConnection.iceConnectionState === 'connected') {
    console.log('✅ ICE connected - media should flow now!');
  }
};

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('🎉 Remote stream received!', event.streams[0]);
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setCallState('active');
        callStartTimeRef.current = Date.now();
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          console.log('✅ WebRTC connection established');
          setCallState('active');
          callStartTimeRef.current = Date.now();
        }
      };

      // Handle ICE connection state
      peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', peerConnection.iceConnectionState);
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket) {
          console.log('Sending ICE candidate');
          socket.emit('ice-candidate', {
            candidate: event.candidate,
            to: receiverId
          });
        } else if (!event.candidate) {
          console.log('All ICE candidates sent');
        }
      };

      // Socket listeners for WebRTC signaling
      if (socket) {
        socket.on('call-offer', handleCallOffer);
        socket.on('call-answer', handleCallAnswer);
        socket.on('ice-candidate', handleIceCandidate);
        socket.on('call-ended', handleCallEnded);
        socket.on('call-declined', handleCallEnded);

        if (!isIncoming) {
          // Create and send offer
          console.log('Creating offer...');
          const offer = await peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: callType === 'video'
          });
          await peerConnection.setLocalDescription(offer);
          
          console.log('Sending offer to:', receiverId);
          socket.emit('call-offer', {
            offer,
            to: receiverId,
            callType,
            from: socket.userId
          });
          
          setCallState('ringing');
        } else {
          // For incoming calls, we wait for the offer
          console.log('Waiting for offer (incoming call)');
          setCallState('ringing');
        }
      }

    } catch (error) {
      console.error('Error initializing call:', error);
      alert('Failed to access camera/microphone: ' + error.message);
      onClose();
    }
  };

  const handleCallOffer = async (data) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(data.offer);
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        
        if (socket) {
          socket.emit('call-answer', {
            answer,
            to: data.from
          });
        }
      }
    } catch (error) {
      console.error('Error handling call offer:', error);
    }
  };

  const handleCallAnswer = async (data) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(data.answer);
      }
    } catch (error) {
      console.error('Error handling call answer:', error);
    }
  };

  const handleIceCandidate = async (data) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(data.candidate);
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  };

  const handleCallEnded = () => {
    setCallState('ended');
    setTimeout(() => {
      cleanup();
      onClose();
    }, 2000);
  };

  const endCall = () => {
    if (socket) {
      socket.emit('end-call', { to: receiverId });
    }
    cleanup();
    onClose();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = isVideoOff;
        setIsVideoOff(!isVideoOff);
      }
    }
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (socket) {
      socket.off('call-offer');
      socket.off('call-answer');
      socket.off('ice-candidate');
      socket.off('call-ended');
      socket.off('call-declined');
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Call Header */}
      <div className="bg-gray-900/90 backdrop-blur p-4 flex justify-between items-center">
        <div className="text-white">
          <h3 className="text-lg font-medium">{callerName}</h3>
          <p className="text-sm text-gray-300">
            {callState === 'connecting' && 'Connecting...'}
            {callState === 'ringing' && 'Ringing...'}
            {callState === 'active' && formatDuration(callDuration)}
            {callState === 'ended' && 'Call ended'}
          </p>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full text-white"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
          <button
            onClick={endCall}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Video/Audio Area */}
      <div className="flex-1 relative bg-gray-900">
        {callType === 'video' ? (
          <>
            {/* Remote Video (main) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            
            {/* Local Video (pip) */}
            <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          </>
        ) : (
          // Audio call interface
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl font-semibold">
                  {callerName.charAt(0).toUpperCase()}
                </span>
              </div>
              <h2 className="text-2xl font-medium mb-2">{callerName}</h2>
              <p className="text-gray-300">
                {callState === 'active' ? formatDuration(callDuration) : 'Audio Call'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Call Controls */}
      <div className="bg-gray-900/90 backdrop-blur p-6">
        <div className="flex justify-center space-x-4">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full transition-colors ${
              isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
            } text-white`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          {/* Video Toggle (only for video calls) */}
          {callType === 'video' && (
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full transition-colors ${
                isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
              } text-white`}
            >
              {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </button>
          )}

          {/* End Call Button */}
          <button
            onClick={endCall}
            className="p-4 bg-red-600 hover:bg-red-700 rounded-full text-white transition-colors"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallModal;