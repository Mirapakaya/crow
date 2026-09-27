import React, { useState, useMemo } from 'react';
import { t } from '@i18n';
import type { AttachmentKind, AttachmentRef } from '@core/models';

interface AttachmentViewProps {
  attachment: AttachmentRef;
  progress?: number; // 0–100 for upload/download
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function FileIcon({ kind }: { kind: AttachmentKind }) {
  switch (kind) {
    case 'image':
      return '🖼️';
    case 'video':
      return '🎬';
    case 'audio':
      return '🎵';
    case 'file':
      return '📄';
  }
}

const ImageAttachment = React.memo(function ImageAttachment({
  attachment,
}: {
  attachment: AttachmentRef;
}) {
  // Thumbnail from attachment or placeholder
  const hasThumbnail = !!attachment.thumbnail;
  return (
    <div className="message-attachment">
      {hasThumbnail ? (
        <img
          className="message-attachment-image"
          src={URL.createObjectURL(new Blob([attachment.thumbnail!.slice().buffer as ArrayBuffer]))}
          alt={attachment.fileName || t('attachments.photo')}
          onClick={() => {
            /* TODO: expand/lightbox */
          }}
        />
      ) : (
        <div
          className="message-attachment-image"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bg-secondary)',
            height: 200,
            color: 'var(--text-tertiary)',
            fontSize: 'var(--text-sm)',
          }}
        >
          {t('attachments.photo')}
        </div>
      )}
    </div>
  );
});

const VideoAttachment = React.memo(function VideoAttachment({
  attachment,
}: {
  attachment: AttachmentRef;
}) {
  return (
    <div className="message-attachment">
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-secondary)',
          height: 200,
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
        }}
        onClick={() => {
          /* TODO: play video */
        }}
      >
        {attachment.width && attachment.height && (
          <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>
            {attachment.width}×{attachment.height}
          </span>
        )}
        <div
          style={{
            position: 'absolute',
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 20,
          }}
          aria-label="Play video"
        >
          ▶
        </div>
      </div>
    </div>
  );
});

const AudioAttachment = React.memo(function AudioAttachment({
  attachment,
}: {
  attachment: AttachmentRef;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const duration = attachment.durationMs ? formatDuration(attachment.durationMs) : '0:00';

  // Generate placeholder waveform bars
  const bars = useMemo(() => {
    const count = 40;
    return Array.from({ length: count }, () => Math.random() * 20 + 4);
  }, []);

  return (
    <div className="message-attachment">
      <div className="voice-message">
        <button
          className="voice-play-btn"
          onClick={() => setIsPlaying(!isPlaying)}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <div className="voice-waveform">
          {bars.map((h, i) => (
            <div key={i} className="voice-waveform-bar" style={{ height: h }} />
          ))}
        </div>
        <span className="voice-duration">{duration}</span>
      </div>
    </div>
  );
});

const FileAttachment = React.memo(function FileAttachment({
  attachment,
}: {
  attachment: AttachmentRef;
}) {
  return (
    <div className="message-attachment">
      <div
        className="message-attachment-file"
        onClick={() => {
          /* TODO: download/open */
        }}
      >
        <span className="message-attachment-file-icon">
          <FileIcon kind={attachment.kind} />
        </span>
        <div className="message-attachment-file-info">
          <div className="message-attachment-file-name">
            {attachment.fileName || t('attachments.file')}
          </div>
          <div className="message-attachment-file-size">{formatFileSize(attachment.size)}</div>
        </div>
      </div>
    </div>
  );
});

export default function AttachmentView({ attachment, progress }: AttachmentViewProps) {
  return (
    <div style={{ position: 'relative' }}>
      {attachment.kind === 'image' && <ImageAttachment attachment={attachment} />}
      {attachment.kind === 'video' && <VideoAttachment attachment={attachment} />}
      {attachment.kind === 'audio' && <AudioAttachment attachment={attachment} />}
      {attachment.kind === 'file' && <FileAttachment attachment={attachment} />}

      {/* Progress bar for upload/download */}
      {progress !== undefined && progress >= 0 && progress < 100 && (
        <div
          style={{
            width: '100%',
            height: 4,
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden',
            marginTop: 'var(--space-1)',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: 'var(--accent-primary)',
              borderRadius: 'var(--radius-full)',
              transition: 'width 0.2s ease',
            }}
          />
        </div>
      )}
    </div>
  );
}
