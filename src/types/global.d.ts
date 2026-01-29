import type {
	Command as CommandType,
	LocalContextMenu as LocalContextMenuType,
} from './discord/commands';
import type {
	Button as ButtonType,
	Modal as ModalType,
	SelectMenu as SelectMenuType,
} from './discord/components';

declare global {
	// Global command types
	type Command = CommandType;
	type LocalContextMenu = LocalContextMenuType;
	type ContextMenu = LocalContextMenuType; // Alias for backward compatibility

	// Global component types
	type SelectMenu = SelectMenuType;
	type Button = ButtonType;
	type Modal = ModalType;
}
