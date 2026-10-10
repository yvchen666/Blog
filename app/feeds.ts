import type { FeedGroup } from './types/feed'

export default [{
	name: '清晰体验',
	desc: '使用 Clarity 博客主题构建的网站。',
	entries: [{
		author: '纸鹿本鹿',
		sitenick: '摸鱼处',
		title: '纸鹿摸鱼处',
		desc: '纸鹿至麓不知路，支炉制露不止漉',
		link: 'https://blog.zhilu.site/',
		feed: 'https://blog.zhilu.site/atom.xml',
		icon: 'https://www.zhilu.site/api/icon.png',
		avatar: 'https://www.zhilu.site/api/avatar.png',
		archs: ['Nuxt', 'Vercel'],
		date: '2019-07-19',
		comment: 'Clarity 主题作者',
	}],
}] satisfies FeedGroup[]
