---
title: "LRU、链表与多线程手写"
description: "LRU 用哈希表加快查找，用链表维持最近使用的顺序，两处要一起更新。"
date: 2025-06-01 12:00:00
updated: "2026-10-10 17:40:00"
categories: [笔记]
tags: ["算法", "C++", "多线程"]
type: tech
---
针对桌面端和C++开发岗位的要求，面试中的手写代码不仅考察基本的算法逻辑，还非常看重对**指针操作的安全性、STL 容器的底层理解以及并发编程的严谨性**。

以下为你精选的最具代表性、出现频率极高的四道手写题目，涵盖了数据结构设计、指针操作、滑动窗口和多线程并发，并附带详细思路与现代 C++ 代码实现：

------

# LRU、链表与多线程手写

这道题完美考察了对哈希表和双向链表的综合运用，以及对 C++ STL（`std::list` 和 `std::unordered_map`）的熟悉程度。

- **解题思路**：
  - 使用双向链表 (`std::list`) 按照访问时间存储键值对，最近访问的放在链表头部，最久未访问的放在尾部。
  - 使用哈希表 (`std::unordered_map`) 存储键到链表迭代器的映射，从而实现 $O(1)$ 时间复杂度的查找和删除。
  - 每次 `get` 或 `put` 存在的元素时，将其移动到链表头部 (`splice` 方法极其高效)。
  - 容量超限时，删除链表尾部元素，并同步清理哈希表。
- **C++ 代码实现**：

C++

```C++
#include <unordered_map>
#include <list>

class LRUCache {
private:
    // 定义缓存节点的结构 (存储 key 和 value)
    struct Node {
        int key;
        int value;
        Node(int k, int v) : key(k), value(v) {}
    };

    int capacity;
    std::list<Node> cacheList; // 双向链表，头部为最近使用
    std::unordered_map<int, std::list<Node>::iterator> cacheMap; // 哈希表，存储 key 到迭代器的映射

public:
    LRUCache(int cap) : capacity(cap) {}

    int get(int key) {
        if (cacheMap.find(key) == cacheMap.end()) {
            return -1; // 未找到
        }
        // 将被访问的节点移动到链表头部 (splice 直接剪切，不涉及拷贝)
        cacheList.splice(cacheList.begin(), cacheList, cacheMap[key]);
        return cacheMap[key]->value;
    }

    void put(int key, int value) {
        if (cacheMap.find(key) != cacheMap.end()) {
            // 更新已存在的节点，并移动到头部
            cacheMap[key]->value = value;
            cacheList.splice(cacheList.begin(), cacheList, cacheMap[key]);
        } else {
            // 如果超出容量，移除最久未使用的节点（尾部节点）
            if (cacheList.size() == capacity) {
                int oldKey = cacheList.back().key;
                cacheMap.erase(oldKey);
                cacheList.pop_back();
            }
            // 插入新节点到头部
            cacheList.emplace_front(key, value);
            cacheMap[key] = cacheList.begin();
        }
    }
};
```

------

### 2. 指针与边界处理：K 个一组翻转链表

对于 C++ 工程师，指针操作是基本功。这道题是链表反转的进阶版，极其考验边界条件的控制和代码的鲁棒性。

- **解题思路**：
  - 使用一个 `dummy` (虚拟头节点) 简化对头节点的边界处理。
  - 分段进行翻转：每次往后遍历 $K$ 个节点，若不足 $K$ 个则保持原样并结束。
  - 对于满足条件的 $K$ 个节点，记录其前驱节点和后继节点，将其内部进行局部翻转（复用基础的单链表反转逻辑）。
  - 将翻转后的局部链表重新接回主链表，并更新指针位置准备下一轮。
- **C++ 代码实现**：

C++

```C++
struct ListNode {
    int val;
    ListNode *next;
    ListNode(int x) : val(x), next(nullptr) {}
};

class Solution {
public:
    ListNode* reverseKGroup(ListNode* head, int k) {
        if (!head || k == 1) return head;

        ListNode* dummy = new ListNode(0);
        dummy->next = head;

        ListNode* pre = dummy;
        ListNode* end = dummy;

        while (end->next != nullptr) {
            // 找到需要翻转的 K 个节点的最后一个节点
            for (int i = 0; i < k && end != nullptr; ++i) end = end->next;
            if (end == nullptr) break; // 不足 K 个，结束

            ListNode* start = pre->next;
            ListNode* next_group = end->next; // 记录下一组的开头
            end->next = nullptr; // 断开当前组与后面的连接，准备独立翻转

            // 翻转当前 K 个节点 (调用独立的翻转函数或直接内联写)
            pre->next = reverseList(start);

            // 翻转后，start 变成了这组的尾部，将其与后面的链表重新连接
            start->next = next_group;

            // 更新指针，准备下一轮
            pre = start;
            end = pre;
        }

        ListNode* ret = dummy->next;
        delete dummy; // 防止内存泄漏
        return ret;
    }

private:
    // 基础的单链表翻转
    ListNode* reverseList(ListNode* head) {
        ListNode* pre = nullptr;
        ListNode* curr = head;
        while (curr != nullptr) {
            ListNode* next = curr->next;
            curr->next = pre;
            pre = curr;
            curr = next;
        }
        return pre;
    }
};
```

------

### 3. 滑动窗口：无重复字符的最长子串

这类题目在客户端开发中常用于处理流式数据或字符串解析，考察对“滑动窗口”思想的理解以及对时间复杂度的把控（要求 $O(N)$）。

- **解题思路**：
  - 维护一个窗口 `[left, right]`。
  - 使用一个数组或哈希表记录每个字符最后一次出现的索引。
  - 当 `right` 指针向右移动时，如果遇到已存在的字符，且该字符的上次出现位置在 `left` 之后，则直接将 `left` 跃迁到该字符上次出现位置的下一个位置。
  - 在移动过程中不断更新最大长度。
- **C++ 代码实现**：

C++

```C++
#include <string>
#include <vector>
#include <algorithm>

class Solution {
public:
    int lengthOfLongestSubstring(std::string s) {
        // 使用 vector 代替哈希表记录 ASCII 字符的最新索引，性能更好
        std::vector<int> charIndex(128, -1);
        int maxLength = 0;
        int left = 0;

        for (int right = 0; right < s.length(); ++right) {
            char currentChar = s[right];

            // 如果字符出现过，并且在当前窗口内，更新左边界
            if (charIndex[currentChar] >= left) {
                left = charIndex[currentChar] + 1;
            }

            // 记录字符的最新位置
            charIndex[currentChar] = right;

            // 更新最大长度
            maxLength = std::max(maxLength, right - left + 1);
        }

        return maxLength;
    }
};
```

------

### 4. C++ 并发编程：两个线程交替打印奇偶数

作为桌面端和跨平台 C++ 开发，多线程同步是躲不开的核心考点。这道题直接考察你对现代 C++ 多线程库 `<thread>`、`<mutex>` 和 `<condition_variable>` 的实战掌控。

- **解题思路**：
  - 需要一个互斥锁 `std::mutex` 来保护共享资源（当前要打印的数字）。
  - 需要一个条件变量 `std::condition_variable` 来实现线程间的阻塞与唤醒机制。
  - 偶数线程等待数字变为偶数，奇数线程等待数字变为奇数，打印后唤醒另一个线程。
- **C++ 代码实现**：

C++

```C++
#include <iostream>
#include <thread>
#include <mutex>
#include <condition_variable>

class ZeroEvenOdd {
private:
    int n;
    int current_num;
    std::mutex mtx;
    std::condition_variable cv;

public:
    ZeroEvenOdd(int n) : n(n), current_num(1) {}

    // 打印奇数的线程
    void printOdd() {
        while (true) {
            std::unique_lock<std::mutex> lock(mtx);
            // 阻塞等待：直到 current_num 为奇数，或超过 n
            cv.wait(lock, [this]() { return current_num > n || current_num % 2 != 0; });

            if (current_num > n) return; // 结束条件

            std::cout << current_num << " ";
            current_num++;

            // 唤醒其他阻塞在 cv 上的线程
            cv.notify_all();
        }
    }

    // 打印偶数的线程
    void printEven() {
        while (true) {
            std::unique_lock<std::mutex> lock(mtx);
            // 阻塞等待：直到 current_num 为偶数，或超过 n
            cv.wait(lock, [this]() { return current_num > n || current_num % 2 == 0; });

            if (current_num > n) return; // 结束条件

            std::cout << current_num << " ";
            current_num++;

            // 唤醒其他阻塞在 cv 上的线程
            cv.notify_all();
        }
    }
};

/* 调用示例：
ZeroEvenOdd zeo(10);
std::thread t1(&ZeroEvenOdd::printOdd, &zeo);
std::thread t2(&ZeroEvenOdd::printEven, &zeo);
t1.join();
t2.join();
*/
```

**建议练习方式**：

在面试手写时，面试官往往不仅看代码是否能跑通，还会看**编码习惯**。请务必注意命名规范、判空处理（如链表题的 `if (!head)`）、以及资源的正确释放（如 `new` 对应的 `delete`，或主动提出使用智能指针的替代方案）。

## 知识总结

- LRU 用哈希表加快查找，用链表维持最近使用的顺序，两处要一起更新。
- 按组翻转链表时，先数清剩余节点，不足一组就保持原样。
- 滑动窗口用左右指针和一张出现位置表，右指针前进，左指针只在重复时跳过。
- 两个线程交替打印时，用条件变量或信号量规定谁先走，不要靠 sleep。
