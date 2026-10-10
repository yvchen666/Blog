<script setup lang="ts">
const emit = defineEmits<{ pick: [] }>()

const { data: list } = await useAsyncData('posts:index', () => queryArticleIndex(), { default: () => [] })
const tag = useHydratedQuery('tag', useRouteQuery('tag', undefined))

const tags = computed(() => {
	const counts = new Map<string, number>()
	for (const post of list.value) {
		for (const name of post.tags ?? []) {
			if (!name)
				continue
			counts.set(name, (counts.get(name) ?? 0) + 1)
		}
	}
	return [...counts.entries()]
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'))
})

function select(name: string) {
	tag.value = tag.value === name ? undefined : name
	emit('pick')
}
</script>

<template>
<BlogWidget v-if="tags.length" card title="标签">
	<ul class="tag-cloud">
		<li v-for="item in tags" :key="item.name">
			<button type="button" :class="{ active: item.name === tag }" :aria-pressed="item.name === tag" @click="select(item.name)">
				<span>{{ item.name }}</span>
				<span class="count">{{ item.count }}</span>
			</button>
		</li>
	</ul>
</BlogWidget>
</template>

<style scoped>
.tag-cloud {
	display: flex;
	flex-wrap: wrap;
	gap: 0.45rem;
}

button {
	display: inline-flex;
	align-items: baseline;
	gap: 0.35em;
	padding: 0.12em 0.55em;
	border-radius: 999px;
	background: var(--c-bg-1);
	color: var(--c-text-2);
	font: inherit;
	line-height: 1.7;
	transition: background-color 0.2s, color 0.2s;

	&:hover,
	&.active {
		background: var(--c-primary-soft);
		color: var(--c-primary);
	}
}

.count {
	font-size: 0.75em;
	font-variant-numeric: tabular-nums;
	opacity: 0.7;
}
</style>
