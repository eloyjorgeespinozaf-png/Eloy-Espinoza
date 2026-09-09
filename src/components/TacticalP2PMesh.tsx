import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Wifi, 
  WifiOff, 
  Terminal as TerminalIcon, 
  Shield, 
  Zap, 
  Send, 
  Activity, 
  CheckCircle, 
  Server, 
  AlertCircle, 
  RefreshCw,
  Clock,
  MapPin,
  MessageSquare
} from 'lucide-react';
import { User, RawAlert } from '../types';
import { playSyntheticBeep } from '../utils/audio';

interface TacticalP2PMeshProps {
  user: User | null;
  sendWsMessage: (type: string, payload: any) => void;
  rawAlerts: RawAlert[];
  onAddP2PAlert: (alert: RawAlert) => void;
}

interface PeerInfo {
  id: string;
  userId: string;
  name: string;
  role: string;
  level: number;
  connectedAt: string;
}

interface PeerMessage {
  senderId: string;
  senderName: string;
  role: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

type LinkStatus = 'desconectado' | 'conectando' | 'directo' | 'relevo';

export default function TacticalP2PMesh({ user, sendWsMessage, rawAlerts, onAddP2PAlert }: TacticalP2PMeshProps) {
  const [myNodeId, setMyNodeId] = useState<string | null>(null);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [linkStatuses, setLinkStatuses] = useState<Record<string, LinkStatus>>({});
  const [latencies, setLatencies] = useState<Record<string, number>>({});
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);
  const [chatLogs, setChatLogs] = useState<Record<string, PeerMessage[]>>({});
  const [inputText, setInputText] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  // WebRTC references
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({});
  const dcsRef = useRef<Record<string, RTCDataChannel>>({});
  const linkTimeoutRefs = useRef<Record<string, any>>({});

  // Helper to add system logs to our interface
  const addSystemLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)]);
  };

  // Helper to update link status
  const updateLinkStatus = (peerId: string, status: LinkStatus) => {
    setLinkStatuses(prev => ({ ...prev, [peerId]: status }));
  };

  // Safe Audio Beep Helper
  const playMeshBeep = (freq: number, dur: number) => {
    playSyntheticBeep(freq, dur, 'sine', 0.05);
  };

  // Send a message over WebRTC direct channel, with seamless fallback to WebSocket Relay Tunnel
  const sendP2PMessage = (targetId: string, messageObj: any) => {
    const status = linkStatuses[targetId] || 'desconectado';
    
    if (status === 'directo') {
      const dc = dcsRef.current[targetId];
      if (dc && dc.readyState === 'open') {
        try {
          dc.send(JSON.stringify(messageObj));
          return true; // Successfully sent direct
        } catch (err) {
          console.warn(`[P2P] Failed to send via DataChannel, switching to relay fallback`, err);
        }
      }
    }

    // Fallback: Send through central WebSocket Relay Tunnel
    sendWsMessage('P2P_RELAY_MESSAGE', {
      targetNodeId: targetId,
      senderNodeId: myNodeId,
      message: messageObj
    });
    return false; // Sent via relay
  };

  // Send a ping message to calculate peer RTT latency
  const pingPeer = (peerId: string) => {
    if (!myNodeId) return;
    addSystemLog(`Midiendo latencia P2P con nodo [${peerId.slice(-4)}]...`);
    sendP2PMessage(peerId, {
      type: 'PING',
      payload: { timestamp: Date.now() }
    });
    playMeshBeep(880, 0.05);
  };

  // Send direct chat message
  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedPeerId || !myNodeId || !user) return;

    const messagePayload = {
      type: 'CHAT',
      payload: {
        text: inputText,
        senderName: user.name,
        role: user.role,
        timestamp: new Date().toISOString()
      }
    };

    const sentDirectly = sendP2PMessage(selectedPeerId, messagePayload);
    
    // Add to our local chat log
    const myMsg: PeerMessage = {
      senderId: myNodeId,
      senderName: user.name,
      role: user.role,
      text: inputText,
      timestamp: new Date().toISOString()
    };

    setChatLogs(prev => ({
      ...prev,
      [selectedPeerId]: [...(prev[selectedPeerId] || []), myMsg]
    }));

    addSystemLog(`Mensaje transmitido a [${selectedPeerId.slice(-4)}] via ${sentDirectly ? 'WEBRTC DIRECTO' : 'RELEVO WEBSOCKET'}`);
    setInputText('');
    playMeshBeep(600, 0.1);
  };

  // Share coordinates directly peer-to-peer
  const handleShareCoordinates = () => {
    if (!selectedPeerId || !user) return;
    const coords = "19°13'10\"S 68°35'50\"W"; // Standard tactical C2 coordinates
    
    const msgPayload = {
      type: 'COORDINATES',
      payload: {
        senderName: user.name,
        role: user.role,
        coordinates: coords,
        timestamp: new Date().toISOString()
      }
    };

    sendP2PMessage(selectedPeerId, msgPayload);

    // Add to chat log as a system message
    const myMsg: PeerMessage = {
      senderId: myNodeId || 'me',
      senderName: user.name,
      role: user.role,
      text: `📍 COMPARTIÓ COORDENADAS TÁCTICAS: ${coords}`,
      timestamp: new Date().toISOString(),
      isSystem: true
    };

    setChatLogs(prev => ({
      ...prev,
      [selectedPeerId]: [...(prev[selectedPeerId] || []), myMsg]
    }));

    addSystemLog(`Coordenadas compartidas con [${selectedPeerId.slice(-4)}]`);
    playMeshBeep(750, 0.15);
  };

  // Share a tactical alert from our list directly peer-to-peer
  const handleShareAlertDirectly = (alertId: string) => {
    if (!selectedPeerId || !user) return;
    const alertToShare = rawAlerts.find(a => a.id === alertId);
    if (!alertToShare) return;

    const msgPayload = {
      type: 'TACTICAL_ALERT',
      payload: {
        alert: {
          ...alertToShare,
          // Tag as P2P-shared
          id: `${alertToShare.id}-p2p-${Date.now().toString().slice(-4)}`,
          source: `P2P Direct [${user.name.split(' ').pop()}]`
        },
        timestamp: new Date().toISOString()
      }
    };

    sendP2PMessage(selectedPeerId, msgPayload);

    const myMsg: PeerMessage = {
      senderId: myNodeId || 'me',
      senderName: user.name,
      role: user.role,
      text: `⚠️ TRANSMITIÓ ALERTA CRÍTICA P2P: [${alertToShare.sourceType}] ${alertToShare.details}`,
      timestamp: new Date().toISOString(),
      isSystem: true
    };

    setChatLogs(prev => ({
      ...prev,
      [selectedPeerId]: [...(prev[selectedPeerId] || []), myMsg]
    }));

    addSystemLog(`Alerta táctica [${alertToShare.sourceType}] transmitida directamente a [${selectedPeerId.slice(-4)}]`);
    playMeshBeep(1100, 0.2);
  };

  // Handle incoming message parsed from data channel or WebSocket relay tunnel
  const handleIncomingPeerMessage = (senderId: string, message: any, isRelayed: boolean) => {
    const { type, payload } = message;

    if (type === 'PING') {
      // Reply with PONG immediately
      sendP2PMessage(senderId, {
        type: 'PONG',
        payload: { timestamp: payload.timestamp }
      });
    }

    else if (type === 'PONG') {
      const rtt = Date.now() - payload.timestamp;
      setLatencies(prev => ({ ...prev, [senderId]: rtt }));
      addSystemLog(`Enlace P2P con [${senderId.slice(-4)}]: RTT Latencia = ${rtt}ms (${isRelayed ? 'Relevado' : 'Directo'})`);
      playMeshBeep(980, 0.05);
    }

    else if (type === 'CHAT') {
      const newMsg: PeerMessage = {
        senderId,
        senderName: payload.senderName,
        role: payload.role,
        text: payload.text,
        timestamp: payload.timestamp
      };

      setChatLogs(prev => ({
        ...prev,
        [senderId]: [...(prev[senderId] || []), newMsg]
      }));

      addSystemLog(`Nuevo mensaje recibido de [${senderId.slice(-4)}] via ${isRelayed ? 'Relevo WS' : 'WebRTC Directo'}`);
      playMeshBeep(650, 0.12);
    }

    else if (type === 'COORDINATES') {
      const newMsg: PeerMessage = {
        senderId,
        senderName: payload.senderName,
        role: payload.role,
        text: `📍 COORDENADAS RECIBIDAS: ${payload.coordinates}`,
        timestamp: payload.timestamp,
        isSystem: true
      };

      setChatLogs(prev => ({
        ...prev,
        [senderId]: [...(prev[senderId] || []), newMsg]
      }));

      addSystemLog(`Datos GPS directos recibidos de [${senderId.slice(-4)}]: ${payload.coordinates}`);
      playMeshBeep(700, 0.2);
    }

    else if (type === 'TACTICAL_ALERT') {
      // Trigger the parent's add alert logic to make it appear on the actual operational console!
      onAddP2PAlert(payload.alert);

      const newMsg: PeerMessage = {
        senderId,
        senderName: payload.alert.sourceName,
        role: 'ROL_PATRULLA',
        text: `⚠️ ALERTA TÁCTICA RECIBIDA P2P: [${payload.alert.sourceType}] ${payload.alert.details}`,
        timestamp: payload.timestamp,
        isSystem: true
      };

      setChatLogs(prev => ({
        ...prev,
        [senderId]: [...(prev[senderId] || []), newMsg]
      }));

      addSystemLog(`¡ALERTA CRÍTICA RECIBIDA P2P! Sincronizando con mapa operativo local.`);
      playMeshBeep(1200, 0.3);
    }
  };

  // WebRTC Connection Setup Logic
  const initiateConnection = async (targetId: string) => {
    if (!myNodeId) return;
    try {
      addSystemLog(`Negociando enlace WebRTC con nodo de campo [${targetId.slice(-4)}]...`);
      updateLinkStatus(targetId, 'conectando');

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      pcsRef.current[targetId] = pc;

      // Setup Data Channel
      const dc = pc.createDataChannel('tactical-link', { negotiated: false });
      setupDataChannel(targetId, dc);

      // ICE candidates forwarding
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendWsMessage('P2P_SIGNALING', {
            targetNodeId: targetId,
            senderNodeId: myNodeId,
            signal: { candidate: event.candidate }
          });
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log(`[P2P WebRTC] Connection state with ${targetId}: ${state}`);
        if (state === 'connected') {
          updateLinkStatus(targetId, 'directo');
          addSystemLog(`⚡ ENLACE WEBRTC DIRECTO ESTABLECIDO CON [${targetId.slice(-4)}]`);
          clearTimeout(linkTimeoutRefs.current[targetId]);
          // Measure initial latency
          setTimeout(() => pingPeer(targetId), 500);
        } else if (state === 'failed' || state === 'closed') {
          switchToRelay(targetId);
        }
      };

      // Create Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendWsMessage('P2P_SIGNALING', {
        targetNodeId: targetId,
        senderNodeId: myNodeId,
        signal: { sdp: offer }
      });

      // Timeout safety: if WebRTC fails to connect in 4.5s, fall back to WebSocket tunnel automatically
      linkTimeoutRefs.current[targetId] = setTimeout(() => {
        if (pcsRef.current[targetId] && pcsRef.current[targetId].connectionState !== 'connected') {
          console.warn(`[P2P] WebRTC timeout for peer ${targetId}. Switching to WebSocket Relay Tunnel.`);
          switchToRelay(targetId);
        }
      }, 4500);

    } catch (err) {
      console.error(`[P2P] Error establishing connection with ${targetId}:`, err);
      switchToRelay(targetId);
    }
  };

  const handleSignaling = async (senderId: string, signal: any) => {
    if (!myNodeId) return;
    try {
      let pc = pcsRef.current[senderId];
      if (!pc) {
        addSystemLog(`Recibida oferta de enlace de [${senderId.slice(-4)}]. Configurando RTCPeerConnection...`);
        updateLinkStatus(senderId, 'conectando');

        pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        pcsRef.current[senderId] = pc;

        pc.ondatachannel = (event) => {
          setupDataChannel(senderId, event.channel);
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            sendWsMessage('P2P_SIGNALING', {
              targetNodeId: senderId,
              senderNodeId: myNodeId,
              signal: { candidate: event.candidate }
            });
          }
        };

        pc.onconnectionstatechange = () => {
          const state = pc.connectionState;
          if (state === 'connected') {
            updateLinkStatus(senderId, 'directo');
            addSystemLog(`⚡ ENLACE WEBRTC DIRECTO ESTABLECIDO CON [${senderId.slice(-4)}] (RECEPTOR)`);
            clearTimeout(linkTimeoutRefs.current[senderId]);
            setTimeout(() => pingPeer(senderId), 500);
          } else if (state === 'failed' || state === 'closed') {
            switchToRelay(senderId);
          }
        };

        // Timeout safety
        linkTimeoutRefs.current[senderId] = setTimeout(() => {
          if (pcsRef.current[senderId] && pcsRef.current[senderId].connectionState !== 'connected') {
            switchToRelay(senderId);
          }
        }, 4500);
      }

      if (signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        if (signal.sdp.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendWsMessage('P2P_SIGNALING', {
            targetNodeId: senderId,
            senderNodeId: myNodeId,
            signal: { sdp: answer }
          });
        }
      } else if (signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (err) {
      console.error(`[P2P] Error answering signaling from ${senderId}:`, err);
      switchToRelay(senderId);
    }
  };

  const setupDataChannel = (peerId: string, channel: RTCDataChannel) => {
    dcsRef.current[peerId] = channel;

    channel.onopen = () => {
      updateLinkStatus(peerId, 'directo');
    };

    channel.onclose = () => {
      switchToRelay(peerId);
    };

    channel.onerror = () => {
      switchToRelay(peerId);
    };

    channel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleIncomingPeerMessage(peerId, message, false);
      } catch (err) {
        console.error(`Error parsing direct peer message:`, err);
      }
    };
  };

  const switchToRelay = (peerId: string) => {
    clearTimeout(linkTimeoutRefs.current[peerId]);
    updateLinkStatus(peerId, 'relevo');
    addSystemLog(`🔒 Canal WebRTC bloqueado. Enlazando via Tunel Relevo WebSocket CAD-C2 con [${peerId.slice(-4)}]`);
    // Ping to calculate relay latency
    setTimeout(() => {
      sendWsMessage('P2P_RELAY_MESSAGE', {
        targetNodeId: peerId,
        senderNodeId: myNodeId,
        message: { type: 'PING', payload: { timestamp: Date.now() } }
      });
    }, 300);
  };

  const handleRelayedMessage = (senderId: string, message: any) => {
    handleIncomingPeerMessage(senderId, message, true); // true = isRelayed
  };

  // Wire up incoming socket signals from the central routing server
  useEffect(() => {
    const handleP2PSignal = (e: Event) => {
      const { type, payload } = (e as CustomEvent).detail;
      
      if (type === 'P2P_REGISTER_CONFIRM') {
        setMyNodeId(payload.nodeId);
        addSystemLog(`Nodo registrado doctrinalmente. ID asignado: [${payload.nodeId}]`);
      } else if (type === 'P2P_PEERS_LIST') {
        setPeers(payload.peers);
      } else if (type === 'P2P_SIGNALING') {
        handleSignaling(payload.senderNodeId, payload.signal);
      } else if (type === 'P2P_RELAY_MESSAGE') {
        handleRelayedMessage(payload.senderNodeId, payload.message);
      }
    };

    window.addEventListener('p2p-message', handleP2PSignal);

    // Initial Registration
    if (user) {
      addSystemLog(`Iniciando registro doctrinal de nodo en malla P2P-C2...`);
      sendWsMessage('P2P_REGISTER', {
        userId: user.id,
        name: user.name,
        role: user.role,
        level: user.role === 'ROL_PATRULLA' ? 1 : user.role === 'ROL_FUSION' ? 2 : 3
      });
    }

    // Cleanup peer connections on unmount
    return () => {
      window.removeEventListener('p2p-message', handleP2PSignal);
      
      // Close all peer connections
      Object.values(pcsRef.current).forEach(pc => pc.close());
      Object.values(linkTimeoutRefs.current).forEach(timeout => clearTimeout(timeout));
    };
  }, [user]);

  // Handle automatic mesh connections when peer list updates
  useEffect(() => {
    if (!myNodeId) return;

    peers.forEach(peer => {
      if (peer.id === myNodeId) return;
      
      // Standard asymmetric negotiation selector:
      // The peer with the alphabetically larger ID initiates the WebRTC offer.
      // This guarantees exactly one offer is made between any pair.
      if (!pcsRef.current[peer.id] && peer.id > myNodeId) {
        initiateConnection(peer.id);
      }
    });
  }, [peers, myNodeId]);

  // Clean active peer count
  const activePeers = peers.filter(p => p.id !== myNodeId);
  const selectedPeer = peers.find(p => p.id === selectedPeerId);

  // SVG Topology Layout Mathematics
  // Calculate positions of each peer in a gorgeous centralized mesh diagram
  const getPeerCoordinatesInSvg = (index: number, total: number) => {
    if (total === 1) return { x: 150, y: 110 };
    
    // Position nodes in a symmetrical radial ring around the center
    const radius = 65;
    const centerX = 150;
    const centerY = 110;
    const angle = (2 * Math.PI * index) / total - Math.PI / 2; // Offset to start at top center
    
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono text-xs my-6 animate-fade-in" id="tactical-p2p-mesh">
      {/* LEFT COLUMN: ACTIVE S-6 FIELD NODES (LEVELS 1, 2, 3) */}
      <div className="lg:col-span-4 bg-[#0b0c10] border border-zinc-900 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden shadow-xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-[#10b981]/40" />
        
        <div>
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#10b981] animate-pulse" />
              <h3 className="font-bold uppercase text-zinc-100 tracking-wider">Malla de Campo (S-6/P2P)</h3>
            </div>
            <span className="bg-[#10b981]/10 text-[#10b981] text-[9px] px-2 py-0.5 rounded-full font-bold uppercase animate-pulse border border-[#10b981]/20">
              {activePeers.length} Nodos
            </span>
          </div>

          <p className="text-zinc-500 text-[10px] leading-relaxed mb-4 uppercase">
            Protocolo de comunicación híbrido WebRTC Directo + Relevo WebSocket CAD. Comuníquese directamente sin pasar por servidores centrales.
          </p>

          <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-900">
            {activePeers.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 border border-dashed border-zinc-900 rounded">
                <WifiOff className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="uppercase text-[9px]">Aún no hay otros terminales activos</p>
                <p className="text-[8px] text-zinc-700 uppercase mt-1">Abra esta app en otro dispositivo para conectarse</p>
              </div>
            ) : (
              activePeers.map(peer => {
                const status = linkStatuses[peer.id] || 'conectando';
                const latency = latencies[peer.id];
                const isSelected = selectedPeerId === peer.id;

                return (
                  <div
                    key={peer.id}
                    onClick={() => setSelectedPeerId(peer.id)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      isSelected 
                        ? 'bg-zinc-900/60 border-[#10b981]/40 shadow-inner' 
                        : 'bg-black/40 border-zinc-900 hover:border-zinc-800 hover:bg-black/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          status === 'directo' ? 'bg-[#10b981] animate-pulse' :
                          status === 'relevo' ? 'bg-[#3b82f6]' : 'bg-yellow-500 animate-ping'
                        }`} />
                        <span className="font-bold text-zinc-200">
                          {peer.role === 'ROL_PATRULLA' ? 'S-2 Cabo Valenzuela' :
                           peer.role === 'ROL_FUSION' ? 'CFI Tte. Rojas' : 'LCC Gral. Martínez'}
                        </span>
                      </div>
                      <span className="text-[8px] bg-zinc-900 text-zinc-500 px-1.5 py-0.5 rounded border border-zinc-800">
                        Nivel {peer.level}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase mt-0.5">
                      <span>ID: {peer.id.slice(-4)}</span>
                      <div className="flex items-center gap-2">
                        {status === 'directo' && (
                          <span className="text-[#10b981] font-bold text-[9px] bg-[#10b981]/5 px-1 rounded border border-[#10b981]/20 flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5" /> Directo {latency ? `${latency}ms` : ''}
                          </span>
                        )}
                        {status === 'relevo' && (
                          <span className="text-[#3b82f6] font-bold text-[9px] bg-[#3b82f6]/5 px-1 rounded border border-[#3b82f6]/20 flex items-center gap-1">
                            <Server className="w-2.5 h-2.5" /> Relevado {latency ? `${latency}ms` : ''}
                          </span>
                        )}
                        {status === 'conectando' && (
                          <span className="text-yellow-500 font-bold text-[9px] bg-yellow-500/5 px-1 rounded border border-yellow-500/20 animate-pulse">
                            Configurando Enlace...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SELF TERMINAL DECO */}
        <div className="bg-black/50 border border-zinc-900 rounded p-3 mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-[#10b981] opacity-75" />
            <div>
              <p className="font-bold text-zinc-300 text-[9px] uppercase">Firma Digital Validada</p>
              <p className="text-zinc-500 text-[8px] uppercase font-bold tracking-tight">
                {myNodeId ? `Local: ${myNodeId.slice(-4)}` : 'Conectando malla...'}
              </p>
            </div>
          </div>
          <span className="bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 text-[8px] font-bold px-1.5 py-0.5 rounded">
            ONLINE S-6
          </span>
        </div>
      </div>

      {/* CENTER COLUMN: P2P SECURE INTERACTION TERMINAL */}
      <div className="lg:col-span-5 bg-[#0b0c10] border border-zinc-900 rounded-xl p-4 flex flex-col justify-between shadow-xl relative min-h-[420px]">
        <div className="absolute top-0 left-0 w-full h-1 bg-[#3b82f6]/40" />

        {selectedPeer ? (
          <>
            {/* Header details */}
            <div className="border-b border-zinc-900 pb-3 mb-3 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-zinc-200 text-sm uppercase flex items-center gap-2">
                  <TerminalIcon className="w-4 h-4 text-[#3b82f6]" />
                  Enlace: {selectedPeer.role === 'ROL_PATRULLA' ? 'Cabo Valenzuela' :
                           selectedPeer.role === 'ROL_FUSION' ? 'Tte. Cnel. Rojas' : 'Gral. Martínez'}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-1 uppercase">
                  <span>Nivel {selectedPeer.level}</span>
                  <span>•</span>
                  <span>IP/ID: {selectedPeer.id}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => pingPeer(selectedPeer.id)}
                  title="Medir Latencia de Canal Directo"
                  className="p-1.5 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700 transition active:scale-95 flex items-center gap-1.5 text-[9px] uppercase font-bold cursor-pointer"
                >
                  <Activity className="w-3 h-3 text-[#10b981]" />
                  Ping Latencia
                </button>
              </div>
            </div>

            {/* Chat Log / Event Panel */}
            <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-black/30 border border-zinc-950 rounded-lg max-h-[250px] min-h-[180px] scrollbar-thin scrollbar-thumb-zinc-900">
              <div className="text-[9px] text-zinc-600 text-center select-none uppercase border-b border-zinc-900/50 pb-2">
                📡 Canal P2P Cifrado AES-256 Iniciado con Éxito
              </div>

              {(chatLogs[selectedPeer.id] || []).length === 0 ? (
                <div className="text-center py-12 text-zinc-700 flex flex-col gap-1 items-center justify-center">
                  <MessageSquare className="w-6 h-6 opacity-30 text-[#3b82f6]" />
                  <p className="uppercase text-[9px]">No hay mensajes transmitidos en este enlace</p>
                  <p className="text-[8px] text-zinc-800 uppercase">Escriba una directiva o comparta datos a continuación</p>
                </div>
              ) : (
                (chatLogs[selectedPeer.id] || []).map((msg, i) => {
                  const isMe = msg.senderId === myNodeId;
                  
                  if (msg.isSystem) {
                    return (
                      <div key={i} className="bg-zinc-900/50 border border-zinc-800/40 p-2 rounded text-zinc-400 text-[10px] space-y-1">
                        <div className="flex justify-between text-[8px] text-zinc-600 font-bold">
                          <span>NOTIFICACIÓN DE PROTOCOLO</span>
                          <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="font-mono text-zinc-300 uppercase leading-snug">{msg.text}</p>
                      </div>
                    );
                  }

                  return (
                    <div key={i} className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                      <div className="flex items-center gap-1.5 mb-1 text-[8px] text-zinc-500 font-bold uppercase">
                        <span>{isMe ? 'USTED' : msg.senderName.split(' ').pop()}</span>
                        <span>•</span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className={`p-2 rounded-lg text-[11px] leading-relaxed break-words ${
                        isMe 
                          ? 'bg-[#1e293b] border border-zinc-800 text-zinc-100 rounded-br-none' 
                          : 'bg-[#111827] border border-zinc-900 text-zinc-300 rounded-bl-none'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Tactical Action Payload Buttons */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={handleShareCoordinates}
                className="py-1.5 px-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 rounded font-bold text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition active:scale-95"
              >
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                Compartir GPS Directo
              </button>

              <div className="relative group">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleShareAlertDirectly(e.target.value);
                      e.target.value = ''; // Reset
                    }
                  }}
                  className="w-full py-1.5 px-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 rounded font-bold text-[9px] uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition text-center appearance-none"
                >
                  <option value="" disabled selected>⚠️ Compartir Alerta P2P</option>
                  {rawAlerts.map(alert => (
                    <option key={alert.id} value={alert.id}>
                      [{alert.sourceType}] {alert.details.slice(0, 25)}...
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Form Input Message */}
            <form onSubmit={handleSendChat} className="flex gap-2 mt-3">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Escriba un mensaje de radio táctico encriptado..."
                className="flex-1 bg-black/60 border border-zinc-900 rounded p-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-[#3b82f6] text-[11px] font-mono"
              />
              <button
                type="submit"
                className="bg-[#3b82f6] hover:bg-[#2563eb] text-white p-2 rounded flex items-center justify-center cursor-pointer transition duration-150 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-8 text-zinc-600">
            <Radio className="w-10 h-10 mb-3 text-zinc-800 animate-pulse" />
            <h4 className="font-bold text-zinc-400 uppercase tracking-widest text-xs mb-1">Terminal de Enlace P2P</h4>
            <p className="text-[10px] text-zinc-600 uppercase max-w-[240px] leading-relaxed">
              Seleccione un nodo activo en el menú lateral o en el mapa de topología para establecer el enlace doctrinal de datos.
            </p>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: GRAPHICAL NETWORK TOPOLOGY (P2P MESH MAP) & LOGS */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* NETWORK DIAGRAM VIEW */}
        <div className="bg-[#0b0c10] border border-zinc-900 rounded-xl p-4 shadow-xl flex flex-col justify-between relative overflow-hidden h-[240px]">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#8b5cf6]/40" />
          
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#8b5cf6]" />
              <h4 className="font-bold text-zinc-200 uppercase tracking-wider text-xs">Topología de Red P2P (PII-LCC)</h4>
            </div>
            <span className="text-[8px] bg-purple-950/20 text-[#c084fc] px-1.5 rounded border border-[#c084fc]/20 font-bold uppercase">
              Malla Dinámica
            </span>
          </div>

          {/* SVG RENDERING THE PEER MESH TOPOLOGY */}
          <div className="flex-1 relative flex items-center justify-center p-2 select-none">
            <svg viewBox="0 0 300 220" className="w-full h-full max-h-[170px]">
              {/* Central hub representation background */}
              <circle cx="150" cy="110" r="15" fill="none" stroke="#27272a" strokeWidth="1" strokeDasharray="2" />
              
              {/* Drawing connections/links first to let them stay in background */}
              {peers.map((peer, i) => {
                const coordA = getPeerCoordinatesInSvg(i, peers.length);
                const statusA = linkStatuses[peer.id] || 'conectando';

                return peers.slice(i + 1).map((peerB, j) => {
                  const indexB = i + 1 + j;
                  const coordB = getPeerCoordinatesInSvg(indexB, peers.length);
                  
                  // Link status determines the line appearance
                  const linkStatus = linkStatuses[peer.id] === 'directo' || linkStatuses[peerB.id] === 'directo' ? 'directo' :
                                     linkStatuses[peer.id] === 'relevo' || linkStatuses[peerB.id] === 'relevo' ? 'relevo' : 'conectando';

                  let strokeColor = "#1f1f22";
                  let isDashed = false;
                  let pulseClass = "";

                  if (linkStatus === 'directo') {
                    strokeColor = "#10b981"; // Vibrant WebRTC Green
                  } else if (linkStatus === 'relevo') {
                    strokeColor = "#3b82f6"; // WebSocket Relay Blue
                    isDashed = true;
                  } else {
                    strokeColor = "#eab308"; // Connecting Yellow
                    isDashed = true;
                    pulseClass = "animate-pulse";
                  }

                  return (
                    <g key={`link-${peer.id}-${peerB.id}`}>
                      <line
                        x1={coordA.x}
                        y1={coordA.y}
                        x2={coordB.x}
                        y2={coordB.y}
                        stroke={strokeColor}
                        strokeWidth="1.2"
                        strokeDasharray={isDashed ? "3" : undefined}
                        className={pulseClass}
                      />
                      {/* Latency badge centered on the link if we have one */}
                      {latencies[peer.id] && (
                        <rect
                          x={(coordA.x + coordB.x) / 2 - 12}
                          y={(coordA.y + coordB.y) / 2 - 5}
                          width="24"
                          height="10"
                          rx="2"
                          fill="#090a0f"
                          stroke={strokeColor}
                          strokeWidth="0.5"
                        />
                      )}
                      {latencies[peer.id] && (
                        <text
                          x={(coordA.x + coordB.x) / 2}
                          y={(coordA.y + coordB.y) / 2 + 2}
                          fill={strokeColor}
                          fontSize="5"
                          fontFamily="monospace"
                          textAnchor="middle"
                          fontWeight="bold"
                        >
                          {latencies[peer.id]}ms
                        </text>
                      )}
                    </g>
                  );
                });
              })}

              {/* DRAW NODES */}
              {peers.map((peer, i) => {
                const coord = getPeerCoordinatesInSvg(i, peers.length);
                const isSelf = peer.id === myNodeId;
                const isSelected = selectedPeerId === peer.id;
                
                let nodeColor = "#3f3f46"; // Default Gray
                if (peer.role === 'ROL_PATRULLA') nodeColor = "#10b981"; // Green Patrol
                if (peer.role === 'ROL_FUSION') nodeColor = "#f97316";   // Orange Fusion
                if (peer.role === 'ROL_CEO') nodeColor = "#3b82f6";      // Blue Strategic

                return (
                  <g 
                    key={`node-graph-${peer.id}`} 
                    className="cursor-pointer transition duration-150 active:scale-95"
                    onClick={() => {
                      if (!isSelf) setSelectedPeerId(peer.id);
                    }}
                  >
                    {/* Ring highlight if selected */}
                    {isSelected && (
                      <circle
                        cx={coord.x}
                        cy={coord.y}
                        r="11"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="1"
                        className="animate-pulse"
                      />
                    )}
                    {/* Pulsing beacon behind the node */}
                    <circle
                      cx={coord.x}
                      cy={coord.y}
                      r="9"
                      fill={nodeColor}
                      fillOpacity="0.12"
                      className="animate-ping"
                    />
                    {/* Real Circle Node */}
                    <circle
                      cx={coord.x}
                      cy={coord.y}
                      r="6.5"
                      fill={isSelf ? "#000000" : nodeColor}
                      stroke={nodeColor}
                      strokeWidth="1.8"
                    />
                    {/* Label */}
                    <text
                      x={coord.x}
                      y={coord.y + 16}
                      fill={isSelected ? "#ffffff" : isSelf ? "#10b981" : "#a1a1aa"}
                      fontSize="5"
                      fontFamily="monospace"
                      textAnchor="middle"
                      fontWeight={isSelf ? "bold" : undefined}
                    >
                      {isSelf ? "ESTE TERMINAL" : peer.role === 'ROL_PATRULLA' ? "VALENZUELA" : peer.role === 'ROL_FUSION' ? "ROJAS" : "MARTINEZ"}
                    </text>
                    {/* Short acronym in center of node */}
                    <text
                      x={coord.x}
                      y={coord.y + 1.8}
                      fill={isSelf ? nodeColor : "#ffffff"}
                      fontSize="5"
                      fontFamily="monospace"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      L{peer.level}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* DIAGNOSTIC AUDIT LOG CONSOLE */}
        <div className="bg-[#0b0c10] border border-zinc-900 rounded-xl p-4 shadow-xl flex flex-col justify-between h-[164px]">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2 mb-2">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <h4 className="font-bold text-zinc-300 uppercase tracking-wider text-[10px]">Consola de Diagnóstico de Radio (S-6)</h4>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 text-[9px] text-zinc-500 font-mono scrollbar-thin scrollbar-thumb-zinc-900">
            {logs.length === 0 ? (
              <p className="text-zinc-600 italic uppercase">Iniciando bitácora criptográfica S-6...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="leading-relaxed border-b border-zinc-950/40 pb-0.5 last:border-0">{log}</div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
