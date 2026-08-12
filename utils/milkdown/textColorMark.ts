import type { MilkdownPlugin } from '@milkdown/ctx'
import type { MarkdownNode, Node, Root } from '@milkdown/transformer'

import { $command, $markAttr, $markSchema, $remark } from '@milkdown/utils'

// HTML attributes for the textColor mark
export const textColorAttr = $markAttr('textColor')

// textColor mark schema
export const textColorSchema = $markSchema('textColor', (ctx) => ({
	priority: 100,
	attrs: {
		color: { default: null, validate: 'string|null' },
	},
	parseDOM: [
		{
			tag: 'span[style]',
			getAttrs: (el: HTMLElement) => {
				const style = el.getAttribute('style')
				if (!style) return false
				const m = style.match(/color:\s*([^;]+)/i)
				return m ? { color: m[1].trim() } : false
			},
		},
	],
	toDOM: (mark) => ['span', { style: `color: ${mark.attrs.color}` }],
	parseMarkdown: {
		match: (node: MarkdownNode) => node.type === 'text-color',
		runner: (state, node, markType) => {
			state.openMark(markType, { color: (node as unknown as { color: string }).color })
			state.next(node.children)
			state.closeMark(markType)
		},
	},
	toMarkdown: {
		match: (mark) => mark.type.name === 'textColor',
		runner: (state, mark, node) => {
			state.addNode('html', undefined, `<span style="color:${mark.attrs.color}">`)
			state.addNode('text', undefined, node.text || '')
			state.addNode('html', undefined, '</span>')
			return true
		},
	},
}))

// Command to set text color on the current selection
const setTextColorCommand = $command<string, 'SetTextColor'>('SetTextColor', (ctx) => (color?: string) => (state, dispatch) => {
	if (!color) return false
	const { selection, tr } = state
	if (selection.empty) return false
	const { from, to } = selection
	// Remove existing textColor marks in the range first
	tr.removeMark(from, to, textColorSchema.type(ctx))
	dispatch?.(tr.addMark(from, to, textColorSchema.type(ctx).create({ color })))
	return true
})

// Command to remove text color from the current selection
const removeTextColorCommand = $command<undefined, 'RemoveTextColor'>('RemoveTextColor', (ctx) => () => (state, dispatch) => {
	const { selection, tr } = state
	if (selection.empty) return false
	const { from, to } = selection
	dispatch?.(tr.removeMark(from, to, textColorSchema.type(ctx)))
	return true
})

// Regex to match <span style="color:X"> opening tags in raw HTML
const colorSpanOpenRe = /<span[^>]*style\s*=\s*["'][^"']*color:\s*([^;"'<>]+)/i
const spanCloseRe = /^<\/span>\s*$/i
const anySpanOpenRe = /<span[\s>]/i

const matchColorSpan = (value: string | undefined): string | null => {
	if (!value) return null
	const m = value.match(colorSpanOpenRe)
	return m ? m[1].trim() : null
}

const isSpanClose = (value: string | undefined): boolean => {
	if (!value) return false
	return spanCloseRe.test(value.trim())
}

const isAnySpanOpen = (value: string | undefined): boolean => {
	if (!value) return false
	return anySpanOpenRe.test(value)
}

// Remark plugin that transforms <span style="color:X">...</span> HTML sequences
// into custom `text-color` mdast nodes so the mark's parseMarkdown can pick them up.
const remarkTextColor = $remark('remarkTextColor', () => () => (tree: Root) => {
	walk(tree)

	function walk(node: Node) {
		const children = (node as unknown as { children?: Node[] }).children
		if (!children) return
		const newChildren: Node[] = []
		let i = 0
		while (i < children.length) {
			const child = children[i]
			const color = child.type === 'html' ? matchColorSpan((child as unknown as { value?: string }).value) : null
			if (color) {
				// Look for matching </span>
				let spanDepth = 1
				let j = i + 1
				const inner: Node[] = []
				while (j < children.length) {
					const next = children[j]
					if (next.type === 'html') {
						const nextValue = (next as unknown as { value?: string }).value
						if (isAnySpanOpen(nextValue)) spanDepth++
						else if (isSpanClose(nextValue)) {
							spanDepth--
							if (spanDepth === 0) break
						}
					}
					inner.push(next)
					j++
				}
				if (spanDepth === 0) {
					const innerNode = {
						...child,
						type: 'text-color',
						color,
						children: inner,
					} as Node
					walk(innerNode)
					newChildren.push(innerNode)
					i = j + 1
					continue
				}
			}
			walk(child)
			newChildren.push(child)
			i++
		}
		;(node as unknown as { children: Node[] }).children = newChildren
	}
})

// Bundle all plugins
export const textColorPlugin: MilkdownPlugin[] = [
	textColorAttr,
	textColorSchema,
	setTextColorCommand,
	removeTextColorCommand,
	remarkTextColor,
].flat()
