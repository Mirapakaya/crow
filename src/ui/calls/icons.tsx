import {
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  FlipHorizontal,
  ScreenShare,
  Minimize,
  type LucideProps,
} from 'lucide-react'

export type IconProps = LucideProps

export const MicIcon = (p: IconProps) => <Mic {...p} />
export const MicOffIcon = (p: IconProps) => <MicOff {...p} />
export const VideoOffIcon = (p: IconProps) => <VideoOff {...p} />
export const HangUpIcon = (p: IconProps) => <PhoneOff {...p} />
export const FlipCameraIcon = (p: IconProps) => <FlipHorizontal {...p} />
export const ScreenShareIcon = (p: IconProps) => <ScreenShare {...p} />
export const MinimizeIcon = (p: IconProps) => <Minimize {...p} />
