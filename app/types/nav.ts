export interface NavItem {
	icon: string
	text: string
	url?: string
	external?: boolean
	/** 点击后弹出微信二维码，而不是跳转 */
	action?: 'wechat'
}

export type Nav = {
	title: string
	items: NavItem[]
}[]
