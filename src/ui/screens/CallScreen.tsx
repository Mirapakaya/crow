import { useState, useEffect, useRef, useCallback } from 'react';
import { t } from '@i18n';

export type CallState = 'ringing' | 'connecting' | 'connected' | 'reconnecting' | 'ended';
export type CallKind = 'incoming' | 'outgoing';

interface CallScreenProps {
  callState: CallState;
  kind: CallKind;
  peerName: string;
  isVideo?: boolean;
  onAnswer?: () => void;
  onReject?: () => void;
  onEnd: () => void;
}

export default function CallScreen({
  callState,
  kind,
  peerName,
  isVideo = false,
  onAnswer,
  onReject,
  onEnd,
}: CallScreenProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Call timer
  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (callState !== 'reconnecting') setElapsed(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  const formatTime = useCallback((seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  const stateLabel = useCallback((): string => {
    switch (callState) {
      case 'ringing':
        return kind === 'incoming' ? t('calls.incomingCall') : t('calls.outgoingCall');
      case 'connecting':
        return t('calls.outgoingCall');
      case 'connected':
        return formatTime(elapsed);
      case 'reconnecting':
        return t('calls.reconnecting');
      case 'ended':
        return t('calls.callEnded');
    }
  }, [callState, kind, elapsed, formatTime]);

  return (
    <div
      className="call-overlay"
      role="dialog"
      aria-label={`${isVideo ? t('calls.videoCall') : t('calls.voiceCall')} with ${peerName}`}
    >
      {/* Remote video (large) */}
      {isVideo && callState === 'connected' && (
        <video className="call-remote-video" autoPlay playsInline aria-hidden="true" />
      )}

      {/* Local video (PiP) */}
      {isVideo && callState === 'connected' && (
        <video className="call-local-video" autoPlay playsInline muted aria-label="Your camera" />
      )}

      {/* Call info */}
      <div className="call-info">
        <div className="avatar avatar-xl" style={{ margin: '0 auto var(--space-4)' }}>
          {peerName.charAt(0).toUpperCase()}
        </div>
        <div className="call-peer-name">{peerName}</div>
        <div className="call-status">{stateLabel()}</div>
      </div>

      {/* Incoming call controls */}
      {callState === 'ringing' && kind === 'incoming' && (
        <div className="call-controls">
          <button
            className="call-control-btn"
            style={{ backgroundColor: 'var(--success)', color: 'white' }}
            onClick={onAnswer}
            aria-label="Answer call"
          >
            📞
          </button>
          <button className="call-control-btn end-call" onClick={onReject} aria-label="Reject call">
            📵
          </button>
        </div>
      )}

      {/* Active call controls */}
      {(callState === 'connected' ||
        callState === 'connecting' ||
        callState === 'reconnecting' ||
        (callState === 'ringing' && kind === 'outgoing')) && (
        <div className="call-controls">
          <button
            className={`call-control-btn${isMuted ? ' active' : ''}`}
            onClick={() => setIsMuted(!isMuted)}
            aria-label={isMuted ? t('calls.unmute') : t('calls.mute')}
          >
            {isMuted ? '🔇' : '🎤'}
          </button>

          {isVideo && (
            <>
              <button
                className={`call-control-btn${isCameraOff ? ' active' : ''}`}
                onClick={() => setIsCameraOff(!isCameraOff)}
                aria-label={isCameraOff ? t('calls.cameraOn') : t('calls.cameraOff')}
              >
                {isCameraOff ? '🚫📹' : '📹'}
              </button>
              <button className="call-control-btn" aria-label={t('calls.switchCamera')}>
                🔄
              </button>
              <button className="call-control-btn" aria-label={t('calls.screenShare')}>
                🖥️
              </button>
            </>
          )}

          <button
            className="call-control-btn end-call"
            onClick={onEnd}
            aria-label={t('calls.endCall')}
          >
            📞
          </button>
        </div>
      )}

      {/* Ended state */}
      {callState === 'ended' && (
        <div className="call-controls">
          <button className="call-control-btn end-call" onClick={onEnd} aria-label={t('app.close')}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
