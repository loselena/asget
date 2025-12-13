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
  
  const processedCandidates = useRef<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;

    const initCall = async () => {
        try {
            setStatusText('Получение доступа к устройствам...');
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
            setStatusText('Настройка безопасного соединения...');
            let iceServers = [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ];

            // Запрашиваем список серверов у Metered, если ключи установлены
            if (METERED_API_KEY && METERED_DOMAIN) {
                try {
                    console.log("Fetching Metered ICE servers...");
                    const response = await fetch(`https://${METERED_DOMAIN}/api/v1/turn/credentials?apiKey=${METERED_API_KEY}`);
                    const iceConfig = await response.json();
                    
                    if (iceConfig && Array.isArray(iceConfig)) {
                        iceServers = iceConfig;
                        console.log("Успешно загружены серверы Metered.ca");
                    } else {
                        console.warn("Некорректный ответ от Metered.ca", iceConfig);
                    }
                } catch (e) {
                    console.error("Ошибка подключения к Metered.ca (используем Google STUN):", e);
                }
            } else {
                console.warn("API Key для Metered.ca не установлен. Звонки на мобильном интернете могут не работать.");
            }

            // Создаем PeerConnection с полученными серверами
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
                    setStatusText('Связь прервана (проблемы с сетью)');
                    // Не закрываем сразу, даем шанс переподключиться
                    // setTimeout(onEndCall, 3000); 
                } else if (pc.connectionState === 'connected') {
                    setStatusText('В разговоре');
                }
            };

            // Логика сигнализации (Offer/Answer)
            if (isSupabaseInitialized) {
                if (call.isIncoming && call.offerPayload) {
                    setStatusText('Соединение...');
                    await pc.setRemoteDescription(new RTCSessionDescription(call.offerPayload));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    
                    await AppService.sendSignal(call.user.id, {
                        type: 'answer',
                        payload: answer,
                        senderId: currentUser.id,
                        targetId: call.user.id
                    });
                } else if (!call.isIncoming) {
                    setStatusText('Звонок...');
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    
                    await AppService.sendSignal(call.user.id, {
                        type: 'offer',
                        payload: { offer, roomId: call.roomId },
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
            setStatusText('Ошибка доступа к камере/микрофону');
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
                const desc = new RTCSessionDescription(signal.payload);
                if (pc.signalingState !== 'stable') {
                    await pc.setRemoteDescription(desc);
                }
            } else if (signal.type === 'candidate') {
                const candidate = new RTCIceCandidate(signal.payload);
                const candidateStr = JSON.stringify(signal.payload);
                if (!processedCandidates.current.has(candidateStr)) {
                     await pc.addIceCandidate(candidate);
                     processedCandidates.current.add(candidateStr);
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
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden">
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
                    <div className="text-center animate-pulse">
                         <img src={call.user.avatar} alt={call.user.name} className="w-32 h-32 rounded-full mx-auto border-4 border-gray-600 mb-4" />
                         <h3 className="text-2xl font-bold text-gray-200">{call.user.name}</h3>
                         <p className="text-gray-400 mt-2">{statusText}</p>
                    </div>
                </div>
             )}
        </div>

        {/* Local Video */}
        <div className="absolute top-4 right-4 z-10 w-32 h-48 sm:w-48 sm:h-64 bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700 shadow-2xl transition-all duration-300 hover:scale-105">
             <video 
                ref={localVideoRef} 
                autoPlay 
                muted 
                playsInline 
                className={`w-full h-full object-cover ${isCameraEnabled ? 'opacity-100' : 'opacity-0'}`}
             />
             {!isCameraEnabled && (
                 <div className="absolute inset-0 flex items-center justify-center bg-[#202c33]">
                     <div className="text-xs text-gray-500">Камера выкл.</div>
                 </div>
             )}
        </div>

        {/* Controls */}
        <div className="absolute bottom-10 left-0 right-0 z-20 flex justify-center items-center gap-6">
            <button 
                onClick={toggleMic} 
                className={`p-4 rounded-full shadow-lg transition-transform hover:scale-110 ${isMicEnabled ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-white text-black'}`}
            >
                {isMicEnabled ? <MicOnIcon className="text-2xl"/> : <MicOffIcon className="text-2xl"/>}
            </button>

            <button 
                onClick={onEndCall} 
                className="p-5 bg-red-600 rounded-full shadow-lg hover:bg-red-700 transition-transform hover:scale-110"
            >
                <PhoneHangupIcon className="text-3xl text-white" />
            </button>

            {call.type === 'video' && (
              <button 
                onClick={toggleCamera} 
                className={`p-4 rounded-full shadow-lg transition-transform hover:scale-110 ${isCameraEnabled ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-white text-black'}`}
              >
                {isCameraEnabled ? <VideoOnIcon className="text-2xl"/> : <VideoOffIcon className="text-2xl"/>}
              </button>
            )}
        </div>
    </div>
  );
};