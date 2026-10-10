---
title: "旧版本闪退"
description: "起初以为是fovscene空指针或 fovcount为空导致的闪退，但是发现在pro->bom()也会发生闪退，但是bom是QString 所以…"
date: 2025-03-27 12:00:00
updated: 2026-10-10 16:55:00
categories: [笔记]
tags: ["排障"]
type: tech
---
# 问题初步分析

![image-20250327154200714](/images/notes/assets/%E4%B8%8A%E5%8F%A4%E7%89%88%E6%9C%AC%E9%97%AA%E9%80%80/image-20250327154200714.png)

![image-20250327154220419](/images/notes/assets/%E4%B8%8A%E5%8F%A4%E7%89%88%E6%9C%AC%E9%97%AA%E9%80%80/image-20250327154220419.png)

![image-20250327154231091](/images/notes/assets/%E4%B8%8A%E5%8F%A4%E7%89%88%E6%9C%AC%E9%97%AA%E9%80%80/image-20250327154231091.png)

![image-20250327154301652](/images/notes/assets/%E4%B8%8A%E5%8F%A4%E7%89%88%E6%9C%AC%E9%97%AA%E9%80%80/image-20250327154301652.png)

起初以为是fovscene空指针或 fov_count为空导致的闪退，但是发现在pro->bom()也会发生闪退，但是bom是QString

![image-20250327155200338](/images/notes/assets/%E4%B8%8A%E5%8F%A4%E7%89%88%E6%9C%AC%E9%97%AA%E9%80%80/image-20250327155200338.png)

**所以很大可能性是pro为野指针**

## 进一步定位

于是查看pro是从哪拿到的

![image-20250327155632842](/images/notes/assets/%E4%B8%8A%E5%8F%A4%E7%89%88%E6%9C%AC%E9%97%AA%E9%80%80/image-20250327155632842.png)

通过session拿取的project，由于前面猜测是pro为野指针导致的，于是就查看谁对session的project进行操作了 进行了哪些操作![image-20250327155747507](/images/notes/assets/%E4%B8%8A%E5%8F%A4%E7%89%88%E6%9C%AC%E9%97%AA%E9%80%80/image-20250327155747507.png)

在session中存储了私有成员m_projects，继续跟代码，

**1.查看谁对m_project 进行的操作（重点关注删除操作）**

**2.查看对m_project删除后，是否有通知statisticwidget，重新设置session**

![image-20250327160041386](/images/notes/assets/%E4%B8%8A%E5%8F%A4%E7%89%88%E6%9C%AC%E9%97%AA%E9%80%80/image-20250327160041386.png)

第一个是析构函数 清除逻辑不用管

![image-20250327161758576](/images/notes/assets/%E4%B8%8A%E5%8F%A4%E7%89%88%E6%9C%AC%E9%97%AA%E9%80%80/image-20250327161758576.png)

第二个是加载时候的清除 不用管

![image-20250327161824310](/images/notes/assets/%E4%B8%8A%E5%8F%A4%E7%89%88%E6%9C%AC%E9%97%AA%E9%80%80/image-20250327161824310.png)

第三个比较可疑 先记录一下 排查的时候需要注意：

**1.在外层（一直到UI操作），是否有进行通知**

**2.发送的信号都有谁接收 接收后干了什么**

![image-20250327161927617](/images/notes/assets/%E4%B8%8A%E5%8F%A4%E7%89%88%E6%9C%AC%E9%97%AA%E9%80%80/image-20250327161927617.png)

发现并**没有操作去更新statisticwidget的session 所以很有可能导致project已经被释放，但是statisticwidget还没有更新，然后调用pro-> 导致闪退**

## 尝试修复

最终目的是想要statisticwidget不使用已经失效的project，而他的project是通过session获取到的

所以解决方案就是：**在session操作project时，发出信号，在statisticwidget更新session。**

![image-20250328145017509](/images/notes/assets/%E4%B8%8A%E5%8F%A4%E7%89%88%E6%9C%AC%E9%97%AA%E9%80%80/image-20250328145017509.png)

session有如下信号 所以全局查找由谁连接了它（主要关注Runnermainwindow的）：

![image-20250328145142993](/images/notes/assets/%E4%B8%8A%E5%8F%A4%E7%89%88%E6%9C%AC%E9%97%AA%E9%80%80/image-20250328145142993.png)

然后在其中添加

```c++
m_statisticWidget->setSession(AoiModel::ProjectManager::currentSession());
```

需要注意的是：添加需要理解代码，是否对session有操作，希望传递的是什么样子的session
