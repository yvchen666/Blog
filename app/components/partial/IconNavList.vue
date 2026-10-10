<script setup lang="ts">
import type { NavItem } from '~/types/nav'

defineProps<{
	list: NavItem[]
}>()
</script>

<template>
<menu>
	<template v-for="{ text, icon, url, action } in list" :key="text">
		<BlogWechatQr v-if="action === 'wechat'" />
		<UtilLink
			v-else-if="url"
			v-tip="text"
			:to="url"
			:aria-label="text"
		>
			<Icon :name="icon" />
		</UtilLink>
	</template>
</menu>
</template>

<style scoped>
menu {
	display: flex;
	justify-content: center;

	a,
	:deep(.wechat-trigger) {
		padding: 0.5em;
		border-radius: 2em;
		transition: background-color 0.2s;

		&:hover {
			background-color: var(--c-bg-soft);
		}

		.iconify {
			display: block;
		}
	}
}
</style>
