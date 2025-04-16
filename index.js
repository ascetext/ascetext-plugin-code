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
	constructor() {
		super('code-block')
	}

	render(body) {
		return {
			type: 'pre',
			attributes: {},
			body
		}
	}

	split(builder, next) {
		const block = builder.create('code-block')

		builder.append(this.parent, block, this.next)
		builder.append(block, next)

		return {
			head: this,
			tail: block
		}
	}

	stringify(children) {
		return '<pre>' + children + '</pre>'
	}
}

export class CodeLine extends Container {
	constructor() {
		super('code-line')

		this.upHandler = this.upHandler.bind(this)
		this.downHandler = this.downHandler.bind(this)
	}

	get shortcuts() {
		return {
			'up': this.upHandler,
			'down': this.downHandler
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

			builder.append(this.parent, line, this.next)
			builder.moveTail(this, line, anchorOffset)
			setSelection(line)
		}
	}

	backspaceHandler(
		event,
		{
			builder,
			anchorAtFirstPositionInContainer,
			anchorAtLastPositionInContainer,
			setSelection
		}
	) {
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
		builder.cut(this)
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

export class CodePlugin extends PluginPlugin {
	get register() {
		return {
			'code-inline': CodeInline,
			'code-block': CodeBlock,
			'code-line': CodeLine
		}
	}

	get icons() {
		return {
			'code-inline': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none">\
<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m15 7 5 5-5 5m-6 0-5-5 5-5"/>\
</svg>',
			'code-block': '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none">\
<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6h18m-7 5 2 2-2 2m-4 0-2-2 2-2m-7 5.8V7.2c0-1.12 0-1.68.218-2.108a2 2 0 0 1 .874-.874C4.52 4 5.08 4 6.2 4h11.6c1.12 0 1.68 0 2.108.218a2 2 0 0 1 .874.874C21 5.52 21 6.08 21 7.2v9.6c0 1.12 0 1.68-.218 2.108a2 2 0 0 1-.874.874C19.48 20 18.92 20 17.8 20H6.2c-1.12 0-1.68 0-2.108-.218a2 2 0 0 1-.874-.874C3 18.48 3 17.92 3 16.8Z"/>\
</svg>'
		}
	}

	parseTree(element, builder) {
		if (element.type === 'pre') {
			const block = builder.create('code-block')
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
				return builder.create('code-block')
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
			const code = builder.create('code-block')
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
					const codeLine = builder.create('code-line')

					builder.wrap(node, codeLine, node)

					return node
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
			}
		}

		if (node.type === 'code-inline' && (!node.first || !node.first.length)) {
			builder.cut(node)

			return node
		}

		if (node.type === 'code-line') {
			const text = node.first
			let match

			if (text && text.type === 'text') {
				if (match = text.attributes.content.match(/\n+/)) {
					const right = builder.splitByOffset(node, match.index + match[0].length)
					const left = builder.splitByOffset(node, match.index)

					builder.splitByTail(parent, right.tail)
					builder.cut(left.tail)

					return node
				}
			}
		}

		return false
	}
}

export default CodePlugin
