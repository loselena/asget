
import React, { useEffect, useRef, useState } from 'react';
import type { Call, User } from '../types';
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
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  
  // Flag to track if we are ready to accept ICE candidates
  const isRemoteDescriptionSet = useRef(false);
  // Queue for candidates arriving before remote description is set
  const candidateQueue = useRef<RTCIceCandidateInit[]>([]);
  
  const processedCandidates = useRef<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;

    const initCall = async () => {
        try {
            setStatusText('Доступ к устройствам...');
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true // Always request video initially to avoid renegotiation, toggle tracks later
            });
            
            // Apply initial preference
            if (call.type === 'voice') {
                stream.getVideoTracks().forEach(t => t.enabled = false);
            }
            
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

            // Запрашиваем список серверов у Metered с таймаутом
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
                            console.log("Серверы Metered загружены");
                        }
                    }
                } catch (e) {
                    console.warn("Metered.ca недоступен или слишком медленный, используем стандартные сервера.", e);
                }
            }

            // Создаем PeerConnection
            setStatusText('Установка соединения...');
            const pc = new RTCPeerConnection({ iceServers });
            peerConnectionRef.current = pc;

            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });

            pc.ontrack = (event) => {
                console.log("Получен удаленный поток", event.streams);
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
                console.log("Состояние соединения:", pc.connectionState);
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
                    
                    // Mark ready for candidates
                    isRemoteDescriptionSet.current = true;
                    // Flush queue
                    for (const candidate of candidateQueue.current) {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    }
                    candidateQueue.current = [];

                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    
                    const success = await AppService.sendSignal(call.user.id, {
                        type: 'answer',
                        payload: answer,
                        senderId: currentUser.id,
                        targetId: call.user.id
                    });
                    if (!success) setStatusText('Ошибка отправки ответа');
                } else if (!call.isIncoming) {
                    setStatusText('Вызов абонента...');
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    
                    const success = await AppService.sendSignal(call.user.id, {
                        type: 'offer',
                        payload: { offer, roomId: call.roomId },
                        senderId: currentUser.id,
                        targetId: call.user.id
                    });
                    
                    if (!success) {
                        setStatusText('Ошибка: БД недоступна (RLS?)');
                    }
                }
            } else {
                setStatusText("Демо-режим (нет БД)");
                setRemoteStream(stream);
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
            }

        } catch (err) {
            console.error("Error initializing call:", err);
            // Handle specific getUserMedia errors
            if (err instanceof DOMException && err.name === 'NotAllowedError') {
                 setStatusText('Ошибка: Доступ к камере запрещен');
            } else if (err instanceof DOMException && err.name === 'NotFoundError') {
                 setStatusText('Ошибка: Камера или микрофон не найдены');
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

  useEffect(() => {
    if (!isSupabaseInitialized || !peerConnectionRef.current) return;

    const unsubSignals = AppService.subscribeToSignals(currentUser.id, async (signal) => {
        const pc = peerConnectionRef.current;
        if (!pc || signal.senderId !== call.user.id) return;

        try {
            if (signal.type === 'answer' && !call.isIncoming) {
                setStatusText('Соединение...');
                const desc = new RTCSessionDescription(signal.payload);
                if (pc.signalingState !== 'stable') {
                    await pc.setRemoteDescription(desc);
                    // Mark ready for candidates
                    isRemoteDescriptionSet.current = true;
                    // Flush queue
                    for (const candidate of candidateQueue.current) {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    }
                    candidateQueue.current = [];
                }
            } else if (signal.type === 'candidate') {
                const candidateInit = signal.payload;
                const candidateStr = JSON.stringify(candidateInit);
                
                if (!processedCandidates.current.has(candidateStr)) {
                     processedCandidates.current.add(candidateStr);
                     
                     if (isRemoteDescriptionSet.current) {
                         await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
                     } else {
                         // Queue candidate until remote description is set
                         console.log("Queuing ICE candidate...");
                         candidateQueue.current.push(candidateInit);
                     }
                }
            }
            if (signal.id) {
                await AppService.deleteSignal(signal.id);
            }
        } catch (e) {
            console.error("Error processing signal:", e);
        }
    });

    return () => {
        unsubSignals();
    };
  }, [call.user.id, currentUser.id, call.isIncoming]);


  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !isMicEnabled);
      setMicEnabled(!isMicEnabled);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = !isCameraEnabled);
      setCameraEnabled(!isCameraEnabled);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden animate-fadeIn">
        {/* Remote Video */}
        <div className="absolute inset-0 z-0">
             {remoteStream ? (
                <video 
                    ref={remoteVideoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover"
                />
             ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#111b21]">
                    <div className="text-center animate-pulse px-4">
                         <img src={call.user.avatar} alt={call.user.name} className="w-24 h-24 rounded-full mx-auto border-4 border-gray-600 mb-4" />
                         <h3 className="text-xl font-bold text-gray-200">{call.user.name}</h3>
                         <p className="text-gray-400 mt-2 text-sm">{statusText}</p>
                    </div>
                </div>
             )}
        </div>

        {/* Local Video */}
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
