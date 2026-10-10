<script setup lang="ts">
const username = 'yvchen666'
const profile = `https://github.com/${username}`

interface ContributionDay {
	date: string
	count: number
	level: number
}

const days = ref<ContributionDay[]>([])
const total = ref(0)
const failed = ref(false)

const cells = computed(() => {
	if (!days.value.length)
		return []
	const first = new Date(`${days.value[0].date}T00:00:00`)
	return [...Array<ContributionDay | null>(first.getDay()).fill(null), ...days.value]
})

onMounted(async () => {
	try {
		const data = await $fetch<{ total: { lastYear: number }, contributions: ContributionDay[] }>(
			`https://github-contributions-api.jogruber.de/v4/${username}?y=last`,
		)
		days.value = data.contributions
		total.value = data.total.lastYear
	}
	catch {
		failed.value = true
	}
})

function label(day: ContributionDay) {
	return `${day.date}，${day.count} 次贡献`
}
</script>

<template>
<BlogWidget card title="GitHub">
	<p v-if="failed" class="summary">
		<NuxtLink :to="profile" target="_blank">打开 {{ username }} 的主页</NuxtLink>
	</p>
	<template v-else>
		<a class="graph" :href="profile" target="_blank" rel="noopener" :aria-label="`${username} 的 GitHub 贡献图`">
			<span
				v-for="(cell, index) in cells"
				:key="cell?.date ?? `pad-${index}`"
				class="cell"
				:data-level="cell ? cell.level : undefined"
				:title="cell ? label(cell) : undefined"
			/>
		</a>
		<p class="summary">
			<template v-if="days.length">过去一年 {{ total }} 次贡献</template>
			<template v-else>正在读取贡献记录</template>
		</p>
	</template>
</BlogWidget>
</template>

<style scoped>
.graph {
	--gh-0: #ebedf0;
	--gh-1: #9be9a8;
	--gh-2: #40c463;
	--gh-3: #30a14e;
	--gh-4: #216e39;

	display: grid;
	grid-template-rows: repeat(7, minmax(0, 1fr));
	grid-auto-flow: column;
	grid-auto-columns: minmax(0, 1fr);
	gap: 2px;
	width: 100%;
}

:global(.dark) .graph {
	--gh-0: #161b22;
	--gh-1: #0e4429;
	--gh-2: #006d32;
	--gh-3: #26a641;
	--gh-4: #39d353;
}

.cell {
	aspect-ratio: 1;
	border-radius: 2px;
	background: transparent;
}

.cell[data-level] {
	background: var(--gh-0);
}

.cell[data-level="1"] { background: var(--gh-1); }
.cell[data-level="2"] { background: var(--gh-2); }
.cell[data-level="3"] { background: var(--gh-3); }
.cell[data-level="4"] { background: var(--gh-4); }

.summary {
	margin: 0.6rem 0 0;
	color: var(--c-text-2);
	font-size: 0.85em;
}
</style>
