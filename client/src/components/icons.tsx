export function Icon({ path, size = 18, color = "#8b8b9e", onClick }: { path: string; size?: number; color?: string; onClick?: () => void }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"
         strokeLinecap="round" strokeLinejoin="round" onClick={onClick ? () => onClick() : undefined}
         style={{ cursor: onClick ? "pointer" : "default", flexShrink: 0 }}>
      <path d={path} />
    </svg>
  );
}

const ICONS = {
  hash: "M4 9h16M4 15h16M10 3L8 21M16 3l-2 18",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.38a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z",
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  plus: "M12 5v14M5 12h14",
  smile: "M12 21a9 9 0 100-18 9 9 0 000 18zM8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6",
  bell: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  chevronDown: "M19 9l-7 7-7-7",
  chevronUp: "M5 15l7-7 7 7",
  arrowLeft: "M19 12H5M12 19l-7-7 7-7",
  x: "M18 6L6 18M6 6l12 12",
  pencil: "M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z",
  trash: "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6",
  user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  clock: "M12 8v4l3 3M12 22a10 10 0 100-20 10 10 0 000 20z",
  dots: "M5 12h.01M12 12h.01M19 12h.01",
  warning: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
};

export type IconProps = { color?: string; size?: number; onClick?: () => void };

export function HashIcon(props: IconProps) {
  return <Icon path={ICONS.hash} {...props} />;
}
export function SettingsIcon(props: IconProps) {
  return <Icon path={ICONS.settings} {...props} />;
}
export function SearchIcon(props: IconProps) {
  return <Icon path={ICONS.search} {...props} />;
}
export function UsersIcon(props: IconProps) {
  return <Icon path={ICONS.users} {...props} />;
}
export function PlusIcon(props: IconProps) {
  return <Icon path={ICONS.plus} {...props} />;
}
export function SmileIcon(props: IconProps) {
  return <Icon path={ICONS.smile} {...props} />;
}
export function SendIcon(props: IconProps) {
  return <Icon path={ICONS.send} {...props} />;
}
export function LogoutIcon(props: IconProps) {
  return <Icon path={ICONS.logout} {...props} />;
}
export function MailIcon(props: IconProps) {
  return <Icon path={ICONS.mail} {...props} />;
}
export function BellIcon(props: IconProps) {
  return <Icon path={ICONS.bell} {...props} />;
}
export function ChevronDownIcon(props: IconProps) {
  return <Icon path={ICONS.chevronDown} {...props} />;
}
export function ChevronUpIcon(props: IconProps) {
  return <Icon path={ICONS.chevronUp} {...props} />;
}
export function ArrowLeftIcon(props: IconProps) {
  return <Icon path={ICONS.arrowLeft} {...props} />;
}
export function XIcon(props: IconProps) {
  return <Icon path={ICONS.x} {...props} />;
}
export function PencilIcon(props: IconProps) {
  return <Icon path={ICONS.pencil} {...props} />;
}
export function TrashIcon(props: IconProps) {
  return <Icon path={ICONS.trash} {...props} />;
}
export function UserIcon(props: IconProps) {
  return <Icon path={ICONS.user} {...props} />;
}
export function ClockIcon(props: IconProps) {
  return <Icon path={ICONS.clock} {...props} />;
}
export function DotsIcon(props: IconProps) {
  return <Icon path={ICONS.dots} {...props} />;
}
export function WarningIcon(props: IconProps) {
  return <Icon path={ICONS.warning} {...props} />;
}
export function ShieldIcon(props: IconProps) {
  return <Icon path={ICONS.shield} {...props} />;
}
