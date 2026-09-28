/**
 * Re-export lucide-react icons with the same names used by the existing app.
 *
 * This keeps existing import paths and icon names working while swapping the
 * underlying implementation to a well-maintained icon library. Directional
 * icons (back, send, reply, forward) mirror automatically via the
 * `icon-directional` CSS class so they point the right way in RTL layouts.
 */
import type { LucideProps } from 'lucide-react'
import {
  MessageSquare as ChatIcon,
  Users as ContactsIcon,
  Settings as SettingsIcon,
  Send as SendIconRaw,
  ArrowLeft as BackIconRaw,
  Plus as PlusIcon,
  X as CloseIcon,
  Check as CheckIcon,
  CheckCheck as DoubleCheckIcon,
  Clock as ClockIcon,
  AlertTriangle as AlertIcon,
  Shield as ShieldIcon,
  ShieldCheck as ShieldCheckIcon,
  Lock as LockIcon,
  QrCode as QrIcon,
  Camera as CameraIcon,
  Copy as CopyIcon,
  Zap as BoltIcon,
  Globe as GlobeIcon,
  Trash2 as TrashIcon,
  ChevronRight as ChevronIcon,
  Reply as ReplyIcon,
  Forward as ForwardIcon,
  Info as InfoIcon,
  ArrowDown as ArrowDownIcon,
  MoreVertical as MoreIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Eye as EyeIcon,
  RefreshCw as RefreshIcon,
  Sun as SunIcon,
  Moon as MoonIcon,
  Monitor as MonitorIcon,
  Phone as PhoneIcon,
  PhoneOutgoing as CallOutIcon,
  PhoneIncoming as CallInIcon,
  Video as VideoIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  VideoOff as VideoOffIcon,
  PhoneOff as HangUpIcon,
  FlipHorizontal as FlipCameraIcon,
  Minimize as MinimizeIcon,
  ScreenShare as ScreenShareIcon,
} from 'lucide-react'

export type { LucideProps as IconProps }

/** Icon that mirrors in RTL layouts. */
const DirectionalIcon = ({ className, ...props }: LucideProps) => (
  <svg
    aria-hidden="true"
    focusable="false"
    className={className ? `icon-directional ${className}` : 'icon-directional'}
    {...props}
  />
)

const SendIcon = (props: LucideProps) => <SendIconRaw {...props} />
const BackIcon = (props: LucideProps) => <BackIconRaw {...props} />

export {
  ChatIcon,
  ContactsIcon,
  SettingsIcon,
  SendIcon,
  BackIcon,
  PlusIcon,
  CloseIcon,
  CheckIcon,
  DoubleCheckIcon,
  ClockIcon,
  AlertIcon,
  ShieldIcon,
  ShieldCheckIcon,
  LockIcon,
  QrIcon,
  CameraIcon,
  CopyIcon,
  BoltIcon,
  GlobeIcon,
  TrashIcon,
  ChevronIcon,
  ReplyIcon,
  ForwardIcon,
  InfoIcon,
  ArrowDownIcon,
  MoreIcon,
  DownloadIcon,
  UploadIcon,
  EyeIcon,
  RefreshIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
  PhoneIcon,
  CallOutIcon,
  CallInIcon,
  VideoIcon,
  MicIcon,
  MicOffIcon,
  VideoOffIcon,
  HangUpIcon,
  FlipCameraIcon,
  MinimizeIcon,
  ScreenShareIcon,
}

export { DirectionalIcon }
