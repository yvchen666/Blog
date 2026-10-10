<script setup lang="ts">
defineProps<{
	labeled?: boolean
}>()

const dialog = useTemplateRef('dialog')
const missing = ref(false)

function open() {
	missing.value = false
	dialog.value?.showModal()
}

function close() {
	dialog.value?.close()
}

function onDialogClick(event: MouseEvent) {
	if (event.target === dialog.value)
		close()
}
</script>

<template>
<button type="button" class="wechat-trigger" :class="{ labeled }" aria-label="微信" v-tip="labeled ? undefined : '微信'" @click="open">
	<Icon name="tabler:brand-wechat" />
	<span v-if="labeled" class="nav-text">微信</span>
</button>

<dialog ref="dialog" class="wechat-qr" aria-label="微信二维码" @click="onDialogClick" @close="missing = false">
	<img
		v-show="!missing"
		src="/images/wechat-qr.jpg"
		alt="微信二维码"
		width="240"
		height="240"
		@error="missing = true"
	>
	<p v-if="missing">二维码图片还没放好</p>
	<button type="button" class="close" aria-label="关闭" @click="close">
		<Icon name="tabler:x" />
	</button>
</dialog>
</template>

<style scoped>
.wechat-trigger {
	color: inherit;
	background: none;
	font: inherit;

	.iconify {
		display: block;
	}

	&.labeled {
		display: flex;
		align-items: center;
		gap: 0.3em;
		width: fit-content;
		padding: 0.3em 0.5em;
		border-radius: 0.5em;
		font-size: 0.9em;
		transition: background-color 0.2s, color 0.1s;

		&:hover {
			background-color: var(--c-bg-soft);
			color: var(--c-text);
		}
	}
}

.wechat-qr {
	position: fixed;
	inset: 0;
	width: fit-content;
	height: fit-content;
	margin: auto;
	padding: 1.4rem 1.4rem 1rem;
	border: none;
	border-radius: 1rem;
	background: var(--c-bg-1);
	color: var(--c-text-1);
	text-align: center;

	&::backdrop {
		background: #0006;
	}

	img {
		display: block;
		width: min(240px, 70vw);
		height: auto;
		border-radius: 0.4rem;
	}

	p {
		margin: 0;
		color: var(--c-text-2);
	}
}

.close {
	position: absolute;
	top: 0.4rem;
	inset-inline-end: 0.4rem;
	padding: 0.2rem;
	border-radius: 1rem;
	background: transparent;
	color: var(--c-text-2);

	&:hover {
		color: var(--c-text);
	}
}
</style>
