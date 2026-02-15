
import { useRef, useEffect, useCallback } from 'react';
import type { User, Message, SignalPayload } from '../types';

interface UseWebRTCReturn {
  connect: (peerId: number) => void;
  sendMessage: (peerId: number, message: Message) => void;
  disconnect: (peerId: number) => void;
}

interface UseWebRTCProps {
    currentUser: User | null;
    onMessageReceived: (message: Message, senderId: number) => void;
    // Signals are now handled via AppService in App.tsx for this persistent implementation, 
    // but we keep the hook structure for local stream handling if we expand P2P features.
    sendSignal?: (recipientId: number, type: 'offer' | 'answer' | 'candidate', payload: any) => void;
}

const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export const useWebRTC = ({ currentUser, onMessageReceived, sendSignal }: UseWebRTCProps): UseWebRTCReturn => {
    const peerConnections = useRef<Map<number, RTCPeerConnection>>(new Map());
    const dataChannels = useRef<Map<number, RTCDataChannel>>(new Map());
    
    // Simplification: In the Firestore version, text messages go through Firestore.
    // WebRTC is reserved strictly for Media Streams (Video/Audio) in future expansions.
    // This hook is kept to allow data-channel features like "Typing..." indicators without DB writes.

    const disconnect = useCallback((peerId: number) => {
        peerConnections.current.get(peerId)?.close();
        peerConnections.current.delete(peerId);
        dataChannels.current.get(peerId)?.close();
        dataChannels.current.delete(peerId);
    }, []);

    const connect = useCallback((peerId: number) => {
        // Placeholder for P2P Data Channel connection logic
        // Actual Signaling for Video Calls is now handled in App.tsx via AppService.subscribeToSignals
    }, []);

    const sendMessage = (peerId: number, message: Message) => {
        // Placeholder
    };

    return { connect, sendMessage, disconnect };
};
