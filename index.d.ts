import type {
	PluginPlugin,
	InlineWidget,
	Widget,
	Container,
	VirtualTree,
	HandlerParams,
	Builder,
	IconsGetter,
	ActionParams
} from 'ascetext'

declare class CodeInline extends InlineWidget {
	constructor();
	render(): VirtualTree;
	json(): {
		type: 'code-inline';
	};
	json<T extends { type: string }[]>(children: T): {
		type: 'code-inline';
		body: T;
	};
	json<T extends { type: string }[]>(children?: T): {
		type: 'code-inline';
		body?: T;
	};
}

declare class CodeBlock extends Widget {
	constructor();
	render(): VirtualTree;
	json(): {
		type: 'code-block';
	};
	json<T extends { type: string }[]>(children: T): {
		type: 'code-block';
		body: T;
	};
	json<T extends { type: string }[]>(children?: T): {
		type: 'code-block';
		body?: T;
	};
}

declare class CodeLine extends Container {
	constructor();
	upHandler(event: KeyboardEvent, params: HandlerParams): void;
	downHandler(event: KeyboardEvent, params: HandlerParams): void;
	enterHandler(event: KeyboardEvent, params: HandlerParams): void;
	backspaceHandler(event: KeyboardEvent, params: HandlerParams): void;
	backspaceHandler(event: KeyboardEvent, params: HandlerParams): void;
	deleteHandler(event: KeyboardEvent, params: HandlerParams): void;
	onCombine(builder: Builder): void;
	render(): VirtualTree;
	json(): {
		type: 'code-line';
	};
	json<T extends { type: string }[]>(children: T): {
		type: 'code-line';
		body: T;
	};
	json<T extends { type: string }[]>(children?: T): {
		type: 'code-line';
		body?: T;
	};
}

export default class CodePlugin extends PluginPlugin {
	get icons(): IconsGetter;
	get autocompleteRule(): RegExp;
	get autocompleteTrigger(): RegExp;
	autocomplete(match: RegExpMatchArray, builder: Builder, selection: Selection): void;
	parse(element: HTMLElement | Text, builder: Builder): CodeInline | CodeBlock | CodeLine | undefined;
	parseJson(element: HTMLElement | Text, builder: Builder): CodeInline | CodeBlock | CodeLine | undefined;
	createCodeInline(event: MouseEvent, params: ActionParams): void;
	createCodeBlock(event: MouseEvent, params: ActionParams): void;
	removeCode(event: MouseEvent, params: ActionParams): void;
}

export {
	CodeInline,
	CodeBlock,
	CodeLine,
	CodePlugin
}
