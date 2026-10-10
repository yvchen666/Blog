---
title: "开启料号时统计无法查询"
description: "整理自以前的笔记。"
date: 2025-06-01 12:00:00
updated: 2026-10-10 16:55:00
categories: [笔记]
tags: ["排障", "数据库"]
type: tech
---
# 开启料号时统计无法查询

```mermaid
graph LR

	subgraph Server
        A[QueryBoardInfoByProjectIdsOrders order = 0]
        B[queryStatisticCompMap]-->A
        C[queryStatisticCompMapByTime] --> A
        D[QueryTopDesignatorStatisticByTime ] --传入时为order写死0-->C
        E[QueryTopFalseCallStatisticByTime ] --传入时为order写死0-->C
        F[QueryTopNGTypeStatisticByTime ] --传入时为order写死0-->C
        G[queryStatisticCompMapByProjectOrder ] -->B
	end
	subgraph Client
        H[queryStatisticCompMapByProjectOrder ] -->G
        I[NONE] -->H
	end

```
