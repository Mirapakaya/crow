import type { SVGProps } from 'react'
import {
  MessageSquare,
  Users,
  Settings,
  Send,
  ArrowLeft,
  Plus,
  X,
  Check,
  CheckCheck,
  Clock,
  AlertTriangle,
  Shield,
  ShieldCheck,
  Lock,
  QrCode,
  Camera,
  Copy,
  Zap,
  Globe,
  Trash2,
  ChevronRight,
  Reply,
  Forward,
  Info,
  ArrowDown,
  MoreVertical,
  Download,
  Upload,
  Eye,
  RefreshCw,
  Sun,
  Moon,
  Monitor,
  Phone,
  PhoneOutgoing,
  PhoneIncoming,
  Video,
  Pin,
} from 'lucide-react'

/**
 * Geist-style icons via Lucide.
 *
 * Lucide shares the same thin, rounded visual language as Vercel's Geist
 * icons and is the default icon set used by shadcn/ui. Wrapping it here keeps
 * the existing Crow icon API unchanged.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number }

export type { IconProps }

const base = 'inline-block shrink-0'

const Directional = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <span className={className ? `icon-directional ${className}` : 'icon-directional'}>{children}</span>
)

export const Icon = ({ size = 20, className, ...props }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    className={className}
    {...props}
  />
)

export const ChatIcon = (p: IconProps) => <MessageSquare size={p.size ?? 20} className={base} {...p} />
export const ContactsIcon = (p: IconProps) => <Users size={p.size ?? 20} className={base} {...p} />
export const SettingsIcon = (p: IconProps) => <Settings size={p.size ?? 20} className={base} {...p} />

export const SendIcon = (p: IconProps) => (
  <Directional className={p.className}>
    <Send size={p.size ?? 20} className={base} />
  </Directional>
)

export const BackIcon = (p: IconProps) => (
  <Directional className={p.className}>
    <ArrowLeft size={p.size ?? 20} className={base} />
  </Directional>
)

export const PlusIcon = (p: IconProps) => <Plus size={p.size ?? 20} className={base} {...p} />
export const CloseIcon = (p: IconProps) => <X size={p.size ?? 20} className={base} {...p} />
export const CheckIcon = (p: IconProps) => <Check size={p.size ?? 20} className={base} {...p} />
export const DoubleCheckIcon = (p: IconProps) => <CheckCheck size={p.size ?? 20} className={base} {...p} />
export const ClockIcon = (p: IconProps) => <Clock size={p.size ?? 20} className={base} {...p} />
export const AlertIcon = (p: IconProps) => <AlertTriangle size={p.size ?? 20} className={base} {...p} />
export const ShieldIcon = (p: IconProps) => <Shield size={p.size ?? 20} className={base} {...p} />
export const ShieldCheckIcon = (p: IconProps) => <ShieldCheck size={p.size ?? 20} className={base} {...p} />
export const LockIcon = (p: IconProps) => <Lock size={p.size ?? 20} className={base} {...p} />
export const QrIcon = (p: IconProps) => <QrCode size={p.size ?? 20} className={base} {...p} />
export const CameraIcon = (p: IconProps) => <Camera size={p.size ?? 20} className={base} {...p} />
export const CopyIcon = (p: IconProps) => <Copy size={p.size ?? 20} className={base} {...p} />
export const BoltIcon = (p: IconProps) => <Zap size={p.size ?? 20} className={base} {...p} />
export const GlobeIcon = (p: IconProps) => <Globe size={p.size ?? 20} className={base} {...p} />
export const TrashIcon = (p: IconProps) => <Trash2 size={p.size ?? 20} className={base} {...p} />

export const ChevronIcon = (p: IconProps) => (
  <Directional className={p.className}>
    <ChevronRight size={p.size ?? 20} className={base} />
  </Directional>
)

export const ReplyIcon = (p: IconProps) => (
  <Directional className={p.className}>
    <Reply size={p.size ?? 20} className={base} />
  </Directional>
)

export const ForwardIcon = (p: IconProps) => (
  <Directional className={p.className}>
    <Forward size={p.size ?? 20} className={base} />
  </Directional>
)

export const InfoIcon = (p: IconProps) => <Info size={p.size ?? 20} className={base} {...p} />
export const ArrowDownIcon = (p: IconProps) => <ArrowDown size={p.size ?? 20} className={base} {...p} />
export const MoreIcon = (p: IconProps) => <MoreVertical size={p.size ?? 20} className={base} {...p} />
export const DownloadIcon = (p: IconProps) => <Download size={p.size ?? 20} className={base} {...p} />
export const UploadIcon = (p: IconProps) => <Upload size={p.size ?? 20} className={base} {...p} />
export const EyeIcon = (p: IconProps) => <Eye size={p.size ?? 20} className={base} {...p} />
export const RefreshIcon = (p: IconProps) => <RefreshCw size={p.size ?? 20} className={base} {...p} />
export const SunIcon = (p: IconProps) => <Sun size={p.size ?? 20} className={base} {...p} />
export const MoonIcon = (p: IconProps) => <Moon size={p.size ?? 20} className={base} {...p} />
export const MonitorIcon = (p: IconProps) => <Monitor size={p.size ?? 20} className={base} {...p} />
export const PhoneIcon = (p: IconProps) => <Phone size={p.size ?? 20} className={base} {...p} />

export const CallOutIcon = (p: IconProps) => (
  <Directional className={p.className}>
    <PhoneOutgoing size={p.size ?? 20} className={base} />
  </Directional>
)

export const CallInIcon = (p: IconProps) => (
  <Directional className={p.className}>
    <PhoneIncoming size={p.size ?? 20} className={base} />
  </Directional>
)

export const VideoIcon = (p: IconProps) => <Video size={p.size ?? 20} className={base} {...p} />
export const PinIcon = (p: IconProps) => <Pin size={p.size ?? 20} className={base} {...p} />
