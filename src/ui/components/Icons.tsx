import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
}

function icon(path: string, viewBox = '0 0 24 24') {
  const Icon = React.memo(function Icon({ size = 20, color = 'currentColor' }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={path} />
      </svg>
    );
  });
  Icon.displayName = `Icon`;
  return Icon;
}

function multiPath(paths: string[], viewBox = '0 0 24 24') {
  const Icon = React.memo(function Icon({ size = 20, color = 'currentColor' }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
    );
  });
  Icon.displayName = `Icon`;
  return Icon;
}

// ─── Navigation & UI ───

export const SendIcon = multiPath(['M22 2L11 13', 'M22 2L15 22L11 13L2 9L22 2Z']);

export const AttachIcon = icon(
  'M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48',
);

export const MicIcon = multiPath([
  'M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z',
  'M19 10v2a7 7 0 01-14 0v-2',
  'M12 19v4',
  'M8 23h8',
]);

export const CameraIcon = multiPath(
  [
    'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z',
    'M12 17a4 4 0 100-8 4 4 0 000 8z',
  ],
  '0 0 24 24',
);

export const PhoneIcon = icon(
  'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z',
);

export const VideocamIcon = multiPath([
  'M23 7l-7 5 7 5V7z',
  'M16 5H3a2 2 0 00-2 2v10a2 2 0 002 2h13a2 2 0 002-2V7a2 2 0 00-2-2z',
]);

export const BackIcon = icon('M19 12H5M12 19l-7-7 7-7');

export const SettingsIcon = multiPath([
  'M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z',
  'M12 8a4 4 0 100 8 4 4 0 000-8z',
]);

export const LockIcon = multiPath([
  'M5 11h14a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8a1 1 0 011-1z',
  'M7 11V7a5 5 0 0110 0v4',
]);

export const UnlockIcon = multiPath([
  'M5 11h14a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8a1 1 0 011-1z',
  'M7 11V7a5 5 0 019.9-1',
]);

export const ShieldIcon = icon('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z');

export const CheckIcon = icon('M20 6L9 17l-5-5');

export const DoubleCheckIcon = multiPath(['M18 6L7 17l-5-5', 'M22 6L11 17']);

export const SearchIcon = multiPath(['M11 19a8 8 0 100-16 8 8 0 000 16z', 'M21 21l-4.35-4.35']);

export const PlusIcon = icon('M12 5v14M5 12h14');

export const CloseIcon = icon('M18 6L6 18M6 6l12 12');

export const MoreIcon = multiPath([
  'M12 13a1 1 0 100-2 1 1 0 000 2z',
  'M19 13a1 1 0 100-2 1 1 0 000 2z',
  'M5 13a1 1 0 100-2 1 1 0 000 2z',
]);

export const ReplyIcon = icon('M9 17L4 12l5-5M20 17V7a2 2 0 00-2-2H9');

export const EditIcon = multiPath([
  'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7',
  'M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
]);

export const DeleteIcon = multiPath([
  'M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2',
  'M10 11v6M14 11v6',
]);

export const GroupIcon = multiPath([
  'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2',
  'M9 11a4 4 0 100-8 4 4 0 000 8z',
  'M23 21v-2a4 4 0 00-3-3.87',
  'M16 3.13a4 4 0 010 7.75',
]);

export const LinkIcon = icon(
  'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
);

export const KeyIcon = multiPath([
  'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4',
]);

export const EyeIcon = multiPath([
  'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z',
  'M12 9a3 3 0 100 6 3 3 0 000-6z',
]);

export const EyeOffIcon = multiPath([
  'M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24',
  'M1 1l22 22',
]);

export const DownloadIcon = multiPath([
  'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4',
  'M7 10l5 5 5-5M12 15V3',
]);

export const UploadIcon = multiPath([
  'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4',
  'M17 8l-5-5-5 5M12 3v12',
]);

export const InfoIcon = multiPath([
  'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z',
  'M12 16v-4M12 8h.01',
]);

export const WarningIcon = multiPath([
  'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  'M12 9v4M12 17h.01',
]);

export const ErrorIcon = multiPath([
  'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z',
  'M15 9l-6 6M9 9l6 6',
]);

export const SuccessIcon = multiPath([
  'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z',
  'M9 12l2 2 4-4',
]);

// ─── Crow brand icon ───
export const CrownIcon = React.memo(function CrownIcon({
  size = 20,
  color = 'currentColor',
}: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none">
      <path d="M2 18l2-10 5 4 3-8 3 8 5-4 2 10H2z" />
      <rect x="2" y="18" width="20" height="2" rx="1" />
    </svg>
  );
});
CrownIcon.displayName = 'CrownIcon';
