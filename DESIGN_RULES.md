# MVP 资源宪法（单一真源）

## 核心四资源（唯一允许）
1. **Power（基础功率）**：本金，线性累加。
2. **Multiplier（超频倍率）**：杠杆，乘法放大。
3. **Pressure（压力）**：风险资源，决定爆炸与高压收益窗口。
4. **Credits（金币）**：局外成长资源。

> 其他术语（相位、拓扑、熵增等）仅作为表现层描述，不作为独立结算资源。

## 统一结算顺序
1. 构建运行态（base/mult/pressure 初值）
2. 点火序列修正（base/mult/pressure limit）
3. 槽位逐个结算
4. 压力阈值处理（熔断/保险/爆炸）
5. 产出计算：`profit = round(power * multiplier)`

## 复杂度隔离
- L1 基础模块：仅允许 `+Power / xMult / ±Pressure / +Credits`
- L2 印章：仅对 L1 做修饰，不改底层结算顺序
- L3 核心插件（Joker）：允许规则污染（改顺序/改触发/改阈值）

## 设计准入规则
任何新提案必须回答：
- 它最终改变了四资源中的哪一个（或哪两个）？
- 它是否越权修改了不该修改的层级？

## 当前执行状态（已落地）
- 顶部双读数中枢已上线：`Power × Mult = Profit` 实时显示。
- 预览层已输出 `base/multiplier/profit`，并用测试约束 `profit = round(base * multiplier)`。
- 模块池已增加 `L1/L2/L3` 与资源归类标签，便于平衡审查。
