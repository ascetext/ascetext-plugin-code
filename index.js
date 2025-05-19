import { PluginPlugin, InlineWidget, Widget, Container } from 'ascetext'

export class CodeInline extends InlineWidget {
	constructor() {
		super('code-inline')
	}

	render(body) {
		return {
			type: 'code',
			attributes: {},
			body
		}
	}

	stringify(children) {
		return '<code>' + children + '</code>'
	}
}

export class CodeBlock extends Widget {
	constructor(attributes = {}, params = {}) {
		super('code-block', attributes, params)
	}

	render(body) {
		return {
			type: 'pre',
			attributes: {},
			body
		}
	}

	split(builder, next) {
		const block = builder.create('code-block', {}, this.params)

		builder.append(this.parent, block, this.next)
		builder.append(block, next)

		return {
			head: this,
			tail: block
		}
	}

	stringify(children) {
		return '<pre>' + children + '</pre>\n'
	}
}

export class CodeLine extends Container {
	constructor() {
		super('code-line')

		this.upHandler = this.upHandler.bind(this)
		this.downHandler = this.downHandler.bind(this)
		this.indentHandler = this.indentHandler.bind(this)
		this.unIndentHandler = this.unIndentHandler.bind(this)
		this.tabHandler = this.tabHandler.bind(this)
		this.leftHandler = this.leftHandler.bind(this)
		this.trimWhiteSpaces = false
	}

	get shortcuts() {
		return {
			'up': this.upHandler,
			'down': this.downHandler,
			'ctrl+]/meta+]': this.indentHandler,
			'ctrl+[/meta+[': this.unIndentHandler,
			'tab': this.tabHandler,
			'shift+tab': this.unIndentHandler,
			'home/meta+left': this.leftHandler
		}
	}

	upHandler(event, { builder, setSelection }) {
		if (this.parent.first === this && this.parent.parent.isSection && !this.parent.previous) {
			const block = builder.createBlock()

			event.preventDefault()
			builder.append(this.parent.parent, block, this.parent)
			setSelection(block)
		}
	}

	downHandler(event, { builder, setSelection }) {
		if (this.parent.last === this && this.parent.parent.isSection && !this.parent.next) {
			const block = builder.createBlock()

			event.preventDefault()
			builder.append(this.parent.parent, block)
			setSelection(block)
		}
	}

	indentHandler(event, { builder, focusedNodes, anchorContainer, anchorOffset, focusContainer, focusOffset, setSelection }) {
		event.preventDefault()

		const lines = focusedNodes.filter((node) => node.type === 'code-line')
		const indent = this.detectIndent()

		lines.forEach((line) => {
			const anchor = builder.getNodeByOffset(line, 0)

			builder.insertText(builder.create('text', { content: indent }), anchor)
		})
		setSelection(anchorContainer, anchorOffset + indent.length, focusContainer, focusOffset + indent.length)
	}

	unIndentHandler(event, { builder, focusedNodes, anchorContainer, anchorOffset, focusContainer, focusOffset, setSelection }) {
		event.preventDefault()

		const lines = focusedNodes.filter((node) => node.type === 'code-line')
		const indent = this.detectIndent()

		lines.forEach((line) => {
			const node = builder.getNodeByOffset(line, 0)
			let localIndent = indent

			if (node.type === 'text') {
				if (node.attributes.content.indexOf(localIndent) !== 0) {
					localIndent = '\t'
				}

				if (node.attributes.content.indexOf(localIndent) === 0) {
					const { head, tail } = builder.cutRange(line, 0, line, localIndent.length)

					builder.cutUntil(head, tail)
					setSelection(anchorContainer, Math.max(0, anchorOffset - localIndent.length), focusContainer, Math.max(0, focusOffset - localIndent.length))
				}
			}
		})
	}

	tabHandler(event, params) {
		if (params.isRange) {
			this.indentHandler(event, params)
		} else {
			event.preventDefault()

			const indent = this.detectIndent()
			const anchor = params.builder.splitByTail(params.anchorContainer, params.builder.splitByOffset(params.anchorContainer, params.anchorOffset).tail)

			params.builder.insertText(params.builder.create('text', { content: indent }), anchor.tail)
			params.setSelection(params.anchorContainer, params.anchorOffset + indent.length)
		}
	}

	leftHandler(event, { builder, focusContainer, focusOffset, setSelection }) {
		const node = builder.getNodeByOffset(focusContainer, focusOffset)
		let match

		if (
			node && node.type === 'text' &&
			(match = node.attributes.content.match(/[\s\t]+/)) &&
			(!focusOffset || focusOffset > match[0].length)
		) {
			event.preventDefault()
			setSelection(focusContainer, match[0].length)
		}
	}

	detectIndent() {
		let type = 'tab'
		let size = 0
		let current = this.parent.first
		let params = this.parent.params

		const char = params.type === 'tab' ? '\t' : ' '
		const length = params.type === 'tab' ? 1 : params.size
		let indent = ''

		for (let i = 0; i < length; i++) {
			indent += char
		}

		return indent
	}

	enterHandler(
		event,
		{
			builder,
			anchorOffset,
			setSelection
		}
	) {
		if (event.shiftKey && this.parent.last === this && this.parent.parent.isSection) {
			const block = builder.createBlock()

			builder.append(this.parent.parent, block, this.parent.next)
			builder.moveTail(this, block, anchorOffset)
			setSelection(block)
		} else {
			const line = builder.create('code-line')
			const node = builder.getNodeByOffset(this, 0)
			let match
			let offset = 0

			if (node && node.type === 'text' && (match = node.attributes.content.match(/^\s*/))) {
				builder.append(line, builder.create('text', { content: match[0] }))
				offset = match[0].length
			}

			builder.append(this.parent, line, this.next)
			builder.moveTail(this, line, anchorOffset)
			setSelection(line, offset)
		}
	}

	backspaceHandler(
		event,
		params
	) {
		const {
			builder,
			anchorContainer,
			anchorOffset,
			anchorAtFirstPositionInContainer,
			anchorAtLastPositionInContainer,
			setSelection
		} = params

		if (anchorAtFirstPositionInContainer) {
			event.preventDefault()

			if (this.previous) {
				setSelection(this.previous, -1)
				builder.append(this.previous, this.first)
				builder.cut(this)
			} else if (!this.next) {
				 if (anchorAtLastPositionInContainer) {
					const block = builder.createBlock()

					builder.replace(this.parent, block)
					setSelection(block)
				} else if (this.parent.previous) {
					setSelection(this.parent.previous, -1)
				}
			} else {
				const previousSelectableNode = this.getPreviousSelectableNode()

				if (!previousSelectableNode) {
					return false
				}

				builder.combine(previousSelectableNode, this)
			}
		} else {
			const node = builder.getNodeByOffset(anchorContainer, 0)
			let match

			if (
				node && node.type === 'text' &&
				(match = node.attributes.content.match(/[\s\t]+/)) &&
				anchorOffset <= match[0].length
			) {
				const indent = this.detectIndent()
				const localOffset = match[0].substr(0, anchorOffset)
				const tabIndent = localOffset.replace(/[^\t]/g, '')
				const localIndent = tabIndent.length * indent.length + localOffset.length - tabIndent.length

				if (localIndent % indent.length === 0) {
					this.unIndentHandler(event, params)
				}
			}
		}
	}

	deleteHandler(
		event,
		{
			builder,
			anchorAtLastPositionInContainer
		}
	) {
		if (anchorAtLastPositionInContainer) {
			event.preventDefault()

			if (this.next) {
				builder.moveTail(this.next, this, 0)
				builder.cut(this.next)
			} else {
				const nextSelectableNode = this.getNextSelectableNode()

				if (!nextSelectableNode) {
					return false
				}

				builder.combine(this, nextSelectableNode)
			}
		}
	}

	onCombine(builder) {
		const parent = this.parent

		if (parent.previous && parent.previous.type === 'code-block') {
			builder.append(parent.previous, this)
		}

		builder.cut(this)

		if (!parent.length) {
			builder.cut(parent)
		}
	}

	render(body) {
		return {
			type: 'code',
			attributes: {},
			body
		}
	}

	stringify(children) {
		return '<code>' + children + '</code>\n'
	}
}

export class CodePlugin extends PluginPlugin {
	get register() {
		return {
			'code-inline': CodeInline,
			'code-block': CodeBlock,
			'code-line': CodeLine
		}
	}

	constructor(params = { type: 'tab', size: 4 }) {
		super(params)

		this.createCodeBlock = this.createCodeBlock.bind(this)
	}

	get icons() {
		return {
			'code-inline': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">\
<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m15 7 5 5-5 5m-6 0-5-5 5-5"/>\
</svg>',
			'code-block': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">\
<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6h18m-7 5 2 2-2 2m-4 0-2-2 2-2m-7 5.8V7.2c0-1.12 0-1.68.218-2.108a2 2 0 0 1 .874-.874C4.52 4 5.08 4 6.2 4h11.6c1.12 0 1.68 0 2.108.218a2 2 0 0 1 .874.874C21 5.52 21 6.08 21 7.2v9.6c0 1.12 0 1.68-.218 2.108a2 2 0 0 1-.874.874C19.48 20 18.92 20 17.8 20H6.2c-1.12 0-1.68 0-2.108-.218a2 2 0 0 1-.874-.874C3 18.48 3 17.92 3 16.8Z"/>\
</svg>'
		}
	}

	get autocompleteRule() {
		return /(`[^`]+`|```)$/
	}

	get autocompleteTrigger() {
		return /^`$/
	}

	autocomplete(match, builder, selection) {
		if (
			selection.anchorContainer.isContainer &&
			selection.anchorContainer.parent.isSection &&
			selection.anchorContainer.type !== 'code-line'
		) {
			if (match[0] === '```') {
				const node = builder.getNodeByOffset(selection.anchorContainer, selection.anchorOffset)
				const atFirstPosition = selection.anchorContainer.first === node

				if (atFirstPosition) {
					const codeBlock = builder.create('code-block', {}, this.params)
					const codeLine = builder.create('code-line')

					builder.append(codeBlock, codeLine)
					builder.replace(selection.anchorContainer, codeBlock)
					builder.moveTail(selection.anchorContainer, codeLine, match[0].length)
				}
			} else {
				const { tail } = builder.cutRange(
					selection.anchorContainer,
					selection.anchorOffset - match[0].length,
					selection.anchorContainer,
					selection.anchorOffset
				)
				const codeInline = builder.create('code-inline')
				const content = builder.create('text', {
					...tail.attributes,
					content: tail.attributes.content.substr(1, match[0].length - 2)
				})

				builder.replace(tail, content)
				builder.wrap(content, codeInline, content)
				selection.setSelection(selection.anchorContainer, selection.anchorOffset - 2)
			}
		}
	}

	parseTree(element, builder) {
		if (element.type === 'pre') {
			const block = builder.create('code-block', {}, this.params)
			const children = builder.parseVirtualTree(element.body)

			builder.append(block, children)

			return block
		}

		if (element.type === 'code') {
			return builder.create('code-inline')
		}
	}

	parseJson(element, builder) {
		switch (element.type) {
			case 'code-block':
				return builder.create('code-block', {}, this.params)
			case 'code-inline':
				return builder.create('code-inline')
			case 'code-line':
				return builder.create('code-line')
		}
	}

	getSelectControls(focusedNodes, isRange) {
		let code = false
		let hasText = false

		if (!isRange) {
			return []
		}

		focusedNodes.forEach((item) => {
			if (item.type === 'code-inline') {
				code = item
			}

			if (item.type === 'text' && item.parent.type !== 'code-line') {
				hasText = true
			}
		})

		if (code) {
			return [{
				slug: 'code.removeAll',
				label: 'Удалить код',
				icon: 'code-inline',
				selected: true,
				action: this.removeCode
			}]
		}

		return hasText
			? [{
				slug: 'code.createInline',
				label: 'Сделать код',
				icon: 'code-inline',
				action: this.createCodeInline
			}]
			: []
	}

	getInsertControls(container) {
		if (container.type === 'code-block' || !container.parent.isSection) {
			return []
		}

		return [{
			slug: 'code.createBlock',
			label: 'Сделать блок кода',
			icon: 'code-block',
			action: this.createCodeBlock
		}]
	}

	getReplaceControls(focusedNodes) {
		const containers = focusedNodes.filter((node) => node.isContainer && node.parent.isSection)
		const blockCodes = containers.filter((node) => node.type === 'code-block')

		if (!containers.length) {
			return []
		}

		return [{
			slug: 'code.createBlock',
			label: 'Сделать блок кода',
			icon: 'code-block',
			selected: blockCodes.length > 0,
			action: this.createCodeBlock
		}]
	}

	createCodeInline(event, { builder, getSelectedItems }) {
		const selectedItems = getSelectedItems()

		selectedItems.forEach((item) => {
			if (item.type === 'text' && item.parent.type !== 'code-line') {
				const code = builder.create('code-inline')

				builder.replace(item, code)
				builder.push(code, item)
			}
		})
	}

	createCodeBlock(event, { builder, anchorContainer }) {
		if (anchorContainer.type !== 'code-block') {
			const code = builder.create('code-block', {}, this.params)
			const line = builder.create('code-line')

			builder.append(line, anchorContainer.first)
			builder.append(code, line)
			builder.replace(anchorContainer, code)
		}
	}

	removeCode(event, { builder, getSelectedItems }) {
		const selectedItems = getSelectedItems()

		selectedItems.forEach((item) => {
			if (item.type === 'code-inline') {
				builder.replace(item, item.first)
			}
		})
	}

	normalize(node, builder) {
		const parent = node.parent

		if (parent) {
			if (parent.type === 'code-block') {
				if (node.type === 'code-inline' || node.isContainer && node.type !== 'code-line') {
					const codeLine = builder.create('code-line')

					builder.convert(node, codeLine)
					
					return codeLine
				}

				if (node.type === 'text') {
					if (node.attributes.content.trim().length || !(node.previous && node.previous.type === 'code-line')) {
						const codeLine = builder.create('code-line')

						builder.wrap(node, codeLine, node)

						return node
					}
				}

				if (node.type !== 'code-line') {
					builder.append(parent, node.first)
					builder.cut(node)

					return parent
				}
			}

			if (parent.type === 'code-line' && parent.parent) {
				if (node.type === 'breakLine') {
					const codeLine = builder.create('code-line')

					builder.append(codeLine, node.next)
					builder.append(parent.parent, codeLine, parent.next)
					builder.cut(node)

					return parent.parent
				}

				if (node.type === 'text' && node.attributes.content.match(/\u00a0/)) {
					builder.setAttribute(node, 'content', node.attributes.content.replace(/\u00a0/g, ' '))

					return node
				}
			}
		}

		if (node.type === 'code-inline') {
			if (!node.first || !node.first.length) {
				builder.cut(node)

				return node
			}

			if (parent.type === 'code-line') {
				const next = node.previous || node.next || parent

				builder.append(parent, node.first, node.next)
				builder.cut(node)

				return next
			}

			if (node.previous && node.previous.type === 'code-inline') {
				const previous = node.previous

				builder.append(previous, node.first)
				builder.cut(node)

				return previous
			}
		}

		if (node.type === 'code-line') {
			const text = node.first
			let match

			if (text && text.type === 'text') {
				if (match = text.attributes.content.match(/\n/)) {
					const right = builder.splitByOffset(node, match.index + match[0].length)
					const left = builder.splitByOffset(node, match.index)

					builder.splitByTail(parent, right.tail)
					builder.cut(left.tail)

					return node
				}
			}
		}

		if (node.type === 'code-block' && !node.first) {
			const line = builder.create('code-line')

			builder.append(node, line)

			return line
		}

		return false
	}
}

export default CodePlugin
