import React from 'react';

// Fix: Add title prop to allow for tooltips on icons.
type IconProps = {
  className?: string;
  title?: string;
};

// Generic Icon component to avoid repetition
// Fix: Update FaIcon to accept and render the title attribute.
const FaIcon: React.FC<{ iconClass: string; className?: string; title?: string; }> = ({ iconClass, className, title }) => (
  <i className={`${iconClass} ${className || ''}`} title={title} />
);

// Fix: Refactor all icon components to forward props (including title) to FaIcon.
export const LockIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-lock" {...props} />;
export const UnlockIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-unlock" {...props} />;
export const PhoneIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-phone" {...props} />;
export const PhoneHangupIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-phone-slash" {...props} />;
export const VideoIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-video" {...props} />;
export const VideoOnIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-video" {...props} />;
export const VideoOffIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-video-slash" {...props} />;
export const ArrowLeftIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-arrow-left" {...props} />;
export const SearchIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-magnifying-glass" {...props} />;
export const MoreVertIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-ellipsis-vertical" {...props} />;
export const DoubleCheckIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-check-double" {...props} />;
export const SingleCheckIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-check" {...props} />;
export const DocumentTextIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-file-lines" {...props} />;
export const PlayIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-play" {...props} />;
export const PauseIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-pause" {...props} />;
export const SendIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-paper-plane" {...props} />;
export const PaperclipIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-paperclip" {...props} />;
export const MicIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-microphone" {...props} />;
export const MicOnIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-microphone" {...props} />;
export const MicOffIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-microphone-slash" {...props} />;
export const EmojiIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-regular fa-face-smile" {...props} />;
export const PhotoIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-image" {...props} />;
export const TrashIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-trash" {...props} />;
export const XIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-xmark" {...props} />;
export const GifIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-photo-film" {...props} />;
export const StickerIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-regular fa-note-sticky" {...props} />;
export const SettingsIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-gear" {...props} />;
export const UserPlusIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-user-plus" {...props} />;
export const FolderIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-folder" {...props} />;
export const ShareIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-share" {...props} />;
export const CircleCheckIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-circle-check" {...props} />;
export const PlusIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-plus" {...props} />;
export const ChevronLeftIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-chevron-left" {...props} />;
export const ChevronRightIcon: React.FC<IconProps> = (props) => <FaIcon iconClass="fa-solid fa-chevron-right" {...props} />;