
import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Call, User, SignalPayload } from '../types';
import { PhoneHangupIcon, MicOnIcon, MicOffIcon, VideoOnIcon, VideoOffIcon } from './Icons';
import { AppService } from '../services/AppService';
import { isSupabaseInitialized } from '../services/supabase';

interface CallScreenProps {
  call: Call;
  currentUser: User;
  onEndCall: () => void;
}

// ------------------------------------------------------------------
// НАСТРОЙКИ METERED.CA
// ------------------------------------------------------------------
const METERED_DOMAIN = 'asget.metered.live';
const METERED_API_KEY = 'Tf3UbNrIyb8djfhaxMOk_Ncu_MxbneRMaP3nDPV5tRPv-gnj';

export const CallScreen: React.FC<CallScreenProps> = ({ call, currentUser, onEndCall }) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicEnabled, setMicEnabled] = useState(true);
  const [isCameraEnabled, setCameraEnabled] = useState(call.type === 'video');
  const [statusText, setStatusText] = useState('Инициализация...');
  const [isPcReady, setIsPcReady] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  
  // Flag to track if we are ready to accept ICE candidates
  const isRemoteDescriptionSet = useRef(false);
  // Queue for candidates arriving before remote description is set
  const candidateQueue = useRef<RTCIceCandidateInit[]>([]);
  
  const processedCandidates = useRef<Set<string>>(new Set());
  // Track processed signal IDs to prevent duplicates from Polling + Subscription race
  const processedSignalIds = useRef<Set<number>>(new Set());

  // Consolidated Signal Processing Logic
  const processSignal = useCallback(async (signal: SignalPayload, pc: RTCPeerConnection) => {
      // Prevent processing the same signal ID twice
      if (signal.id && processedSignalIds.current.has(signal.id)) return;
      if (signal.id) processedSignalIds.current.add(signal.id);

      try {
          if (signal.type === 'answer' && !call.isIncoming) {
               // Handle Answer for outgoing call
               setStatusText('Соединение...');
               const desc = new RTCSessionDescription(signal.payload);
               if (pc.signalingState !== 'stable') {
                   await pc.setRemoteDescription(desc);
                   isRemoteDescriptionSet.current = true;
                   
                   // Flush queue
                   for (const candidate of candidateQueue.current) {
                       await pc.addIceCandidate(new RTCIceCandidate(candidate));
                   }
                   candidateQueue.current = [];
               }
          } else if (signal.type === 'candidate') {
               // Handle ICE Candidate
               const candidateInit = signal.payload;
               const candidateStr = JSON.stringify(candidateInit);
               
               if (!processedCandidates.current.has(candidateStr)) {
                    processedCandidates.current.add(candidateStr);
                    
                    if (isRemoteDescriptionSet.current) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
                        } catch (err) {
                            console.error("Error adding received ice candidate", err);
                        }
                    } else {
                        candidateQueue.current.push(candidateInit);
                    }
               }
          }
          
          // Cleanup signal from DB
          if (signal.id) {
              await AppService.deleteSignal(signal.id);
          }
      } catch (e) {
          console.error("Error processing signal:", e);
      }
  }, [call.isIncoming]);

  // 1. Initialize Call (Media & PC)
  useEffect(() => {
    let isMounted = true;

    const initCall = async () => {
        try {
            setStatusText('Доступ к устройствам...');
            // Only request video if it is a video call
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: call.type === 'video'
            });
            
            if (!isMounted) {
                stream.getTracks().forEach(track => track.stop());
                return;
            }

            setLocalStream(stream);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            // --- НАСТРОЙКА TURN СЕРВЕРОВ ---
            setStatusText('Поиск серверов...');
            let iceServers = [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ];

            if (METERED_API_KEY && METERED_DOMAIN) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 2000);

                    const response = await fetch(`https://${METERED_DOMAIN}/api/v1/turn/credentials?apiKey=${METERED_API_KEY}`, {
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (response.ok) {
                        const iceConfig = await response.json();
                        if (iceConfig && Array.isArray(iceConfig)) {
                            iceServers = iceConfig;
                        }
                    }
                } catch (e) {
                    console.warn("Metered.ca timed out, using default STUN.");
                }
            }

            // Создаем PeerConnection
            setStatusText('Установка соединения...');
            const pc = new RTCPeerConnection({ iceServers });
            peerConnectionRef.current = pc;

            // Trigger state update so subscription/polling hooks can run
            setIsPcReady(true);

            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });

            pc.ontrack = (event) => {
                const [remote] = event.streams;
                if (remote) {
                    setRemoteStream(remote);
                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = remote;
                    }
                    setStatusText('Соединение установлено');
                }
            };

            pc.onicecandidate = (event) => {
                if (event.candidate && isSupabaseInitialized) {
                    AppService.sendSignal(call.user.id, {
                        type: 'candidate',
                        payload: event.candidate.toJSON(),
                        senderId: currentUser.id,
                        targetId: call.user.id
                    });
                }
            };

            pc.onconnectionstatechange = () => {
                console.log("Connection State:", pc.connectionState);
                if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                    setStatusText('Связь прервана (сеть)');
                } else if (pc.connectionState === 'connected') {
                    setStatusText('В разговоре');
                }
            };

            // Логика сигнализации (Offer/Answer)
            if (isSupabaseInitialized) {
                if (call.isIncoming && call.offerPayload) {
                    setStatusText('Ответ на звонок...');
                    await pc.setRemoteDescription(new RTCSessionDescription(call.offerPayload));
                    
                    isRemoteDescriptionSet.current = true;
                    // Flush queue
                    for (const candidate of candidateQueue.current) {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    }
                    candidateQueue.current = [];

                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    
                    await AppService.sendSignal(call.user.id, {
                        type: 'answer',
                        payload: answer,
                        senderId: currentUser.id,
                        targetId: call.user.id
                    });
                    
                } else if (!call.isIncoming) {
                    setStatusText('Вызов абонента...');
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    
                    await AppService.sendSignal(call.user.id, {
                        type: 'offer',
                        // Include callType in payload so recipient accepts as correct type
                        payload: { offer, roomId: call.roomId, callType: call.type },
                        senderId: currentUser.id,
                        targetId: call.user.id
                    });
                }
            } else {
                setStatusText("Демо-режим (нет БД)");
                setRemoteStream(stream);
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
            }

        } catch (err) {
            console.error("Error initializing call:", err);
            if (err instanceof DOMException && err.name === 'NotAllowedError') {
                 setStatusText('Ошибка: Доступ к камере запрещен');
            } else {
                 setStatusText('Ошибка инициализации звонка');
            }
        }
    };

    initCall();

    return () => {
        isMounted = false;
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
        }
    };
  }, []); 

  // 2. Realtime Subscription (Primary)
  useEffect(() => {
    if (!isSupabaseInitialized || !isPcReady || !peerConnectionRef.current) return;

    const unsubSignals = AppService.subscribeToSignals(currentUser.id, async (signal) => {
        const pc = peerConnectionRef.current;
        if (!pc || signal.senderId !== call.user.id) return;
        await processSignal(signal, pc);
    });

    return () => {
        unsubSignals();
    };
  }, [call.user.id, currentUser.id, isPcReady, processSignal]);

  // 3. Polling Fallback (Secondary - for when WebSocket fails)
  useEffect(() => {
    if (!isSupabaseInitialized || !isPcReady || !peerConnectionRef.current) return;

    // Poll frequently (every 1s) to simulate realtime if socket is dead
    const pollInterval = setInterval(async () => {
        const pc = peerConnectionRef.current;
        // Stop polling if connection is fully established to save resources
        if (!pc || pc.connectionState === 'connected') return;

        const pendingSignals = await AppService.getSignals(currentUser.id);
        if (pendingSignals.length > 0) {
            console.log(`[Polling] Fetched ${pendingSignals.length} signals manually`);
        }
        
        for (const signal of pendingSignals) {
             if (signal.senderId === call.user.id) {
                 await processSignal(signal, pc);
             }
        }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [currentUser.id, call.user.id, isPcReady, processSignal]);


  const toggleMic = () => {
    if (localStream) {
      const enabled = !isMicEnabled;
      localStream.getAudioTracks().forEach(track => track.enabled = enabled);
      setMicEnabled(enabled);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const enabled = !isCameraEnabled;
      localStream.getVideoTracks().forEach(track => track.enabled = enabled);
      setCameraEnabled(enabled);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden animate-fadeIn">
        {/* Remote Video Container */}
        <div className="absolute inset-0 z-0">
             {/* Always render video element for audio playback, but hide it if it's a voice call or no video stream */}
             <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className={`w-full h-full object-cover ${call.type === 'video' && remoteStream ? 'opacity-100' : 'opacity-0'}`}
             />
             
             {/* Avatar Overlay (Visible if voice call OR no video stream yet) */}
             {(!remoteStream || call.type === 'voice') && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#111b21] z-10">
                    <div className="text-center animate-pulse px-4">
                         <img src={call.user.avatar} alt={call.user.name} className="w-24 h-24 rounded-full mx-auto border-4 border-gray-600 mb-4" />
                         <h3 className="text-xl font-bold text-gray-200">{call.user.name}</h3>
                         <p className="text-gray-400 mt-2 text-sm">{statusText}</p>
                    </div>
                </div>
             )}
        </div>

        {/* Local Video (Only for Video Calls) */}
        {call.type === 'video' && (
            <div className="absolute top-4 right-4 z-10 w-24 h-36 sm:w-32 sm:h-48 bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700 shadow-2xl transition-all duration-300">
                 <video 
                    ref={localVideoRef} 
                    autoPlay 
                    muted 
                    playsInline 
                    className={`w-full h-full object-cover ${isCameraEnabled ? 'opacity-100' : 'opacity-0'}`}
                 />
                 {!isCameraEnabled && (
                     <div className="absolute inset-0 flex items-center justify-center bg-[#202c33]">
                         <div className="text-[10px] text-gray-500 text-center px-1">Камера выкл.</div>
                     </div>
                 )}
            </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-10 left-0 right-0 z-20 flex justify-center items-center gap-6">
            <button 
                onClick={toggleMic} 
                className={`p-4 rounded-full shadow-lg transition-transform active:scale-95 ${isMicEnabled ? 'bg-white/20 backdrop-blur-sm text-white' : 'bg-white text-black'}`}
            >
                {isMicEnabled ? <MicOnIcon className="text-2xl"/> : <MicOffIcon className="text-2xl"/>}
            </button>

            <button 
                onClick={onEndCall} 
                className="p-5 bg-red-600 rounded-full shadow-lg hover:bg-red-700 transition-transform active:scale-95"
            >
                <PhoneHangupIcon className="text-3xl text-white" />
            </button>

            {/* Toggle Camera (Only for Video Calls) */}
            {call.type === 'video' && (
              <button 
                onClick={toggleCamera} 
                className={`p-4 rounded-full shadow-lg transition-transform active:scale-95 ${isCameraEnabled ? 'bg-white/20 backdrop-blur-sm text-white' : 'bg-white text-black'}`}
              >
                {isCameraEnabled ? <VideoOnIcon className="text-2xl"/> : <VideoOffIcon className="text-2xl"/>}
              </button>
            )}
        </div>
    </div>
  );
};
