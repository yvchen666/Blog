---
title: "FlowAOI"
description: "整理自以前的笔记。"
date: 2025-06-01 12:00:00
updated: 2026-10-10 16:40:00
categories: [笔记]
tags: ["流程"]
type: tech
---
# FlowAOI

```mermaid
flowchart TD
    subgraph InspectorControll
        subgraph endAppendFov
            report--lane-->save

            emit_onFinished
        end
    end

    subgraph RunnermainWindow
            emit_onFinished --report-->dealReport
        subgraph dealReport
            do_somting_about_barcode
            emit_bindBoard
            emit_boardInspectFinished
            setResult
        end
        subgraph bindBoard
            emit_bindBoard-->send_to_repaire
        end
    end

```
