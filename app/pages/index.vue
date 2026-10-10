<script setup lang="ts">
import { orderBy } from 'es-toolkit/array'

const appConfig = useAppConfig()
useSeoMeta({
	description: appConfig.description,
	ogImage: appConfig.author.avatar,
})

const { data: listRaw } = await useAsyncData('posts:index', () => queryArticleIndex(), { default: () => [] })
const { listSorted, isAscending, sortOrder } = useArticleSort(listRaw, { bindDirectionQuery: 'asc', bindOrderQuery: 'sort' })
const { category, categories, listCategorized } = useArticleCategory(listSorted, { bindQuery: 'category' })
const tag = useHydratedQuery('tag', useRouteQuery('tag', undefined))
const listTagged = computed(() => listCategorized.value.filter(item => !tag.value || item.tags?.includes(tag.value)))
const { page, totalPages, listPaged } = usePagination(listTagged, { bindQuery: 'page' })

useSeoMeta({ title: () => (page.value > 1 ? `第${page.value}页` : '') })

const listRecommended = computed(() => orderBy(
	listRaw.value.filter(item => item.recommend !== null),
	['recommend', 'date'],
	['desc'],
))

function resetPage() {
	if (page.value > 1)
		page.value = 1
}

const { data: previewCount } = useAsyncData(
	'previews:count',
	() => queryCollection('content').where('stem', 'LIKE', 'previews/%').count(),
)
</script>

<template>
<template #aside>
	<WidgetBlogStats />
	<WidgetTags @pick="resetPage" />
</template>

<BlogHeader class="hide-above-mobile" to="/" tag="h1" />

<PostSlide v-if="listRecommended.length && page === 1 && !category && !tag" :list="listRecommended" />

<div class="post-list">
	<PostOrderToggle
		v-model:is-ascending="isAscending"
		v-model:sort-order="sortOrder"
		v-model:category="category"
		:categories
		@update:category="page = 1"
	>
		<ZSecret>
			<UtilLink v-if="previewCount" to="/preview" class="preview-entrance">
				<Icon name="tabler:shield-lock" />
				查看预览文章
			</UtilLink>
		</ZSecret>
	</PostOrderToggle>

	<UtilListTransition v-slot="{ items, state }" :items="listPaged" :state="sortOrder">
		<menu class="proper-height">
			<PostArticle
				v-for="article, index in items"
				:key="article.path"
				:data-list-key="article.path"
				v-bind="article"
				:to="article.path"
				:use-updated="state === 'updated'"
				:style="getFixedDelay(index * 0.05)"
			/>
		</menu>
	</UtilListTransition>

	<ZPagination v-model="page" sticky avoid :total-pages="totalPages" />
</div>
</template>

<style scoped>
.post-list {
	margin: 1rem;
}
</style>
