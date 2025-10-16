# WSToolBox 按钮使用指南

## 概述

WSToolBox 使用统一的按钮变体系统来确保整个应用中的按钮样式和交互一致性。所有按钮都基于 `AnimatedButton` 组件，提供平滑的动画效果和统一的颜色方案。

## 按钮变体

### PrimaryButton - 主要操作按钮
- **用途**：确认、提交、创建等正面操作
- **颜色**：绿色主题色 (`var(--primary)`)
- **动画**：轻微放大和正向旋转
- **示例**：登录、提交表单、创建记录

```jsx
<PrimaryButton onClick={handleSubmit}>
  确认提交
</PrimaryButton>
```

### DangerButton - 危险操作按钮
- **用途**：重置、删除、取消等负面操作
- **颜色**：红色 (`#760f10`)
- **动画**：轻微放大和反向旋转
- **示例**：重置表单、删除记录、取消操作

```jsx
<DangerButton onClick={handleReset}>
  重置表单
</DangerButton>
```

### SecondaryButton - 次要操作按钮
- **用途**：次要操作、取消、返回等
- **颜色**：卡片背景色，带边框
- **动画**：轻微放大和微小旋转
- **示例**：取消操作、返回按钮、次要功能

```jsx
<SecondaryButton onClick={handleCancel}>
  取消
</SecondaryButton>
```

### GenerateButton - 生成/创建按钮
- **用途**：生成、随机、创建等操作
- **颜色**：成功绿色 (`var(--success)`)
- **动画**：较大放大和明显旋转
- **示例**：生成随机数、创建卡组、随机开包

```jsx
<GenerateButton onClick={generateRandom}>
  随机生成
</GenerateButton>
```

### SubtleButton - 微妙效果按钮
- **用途**：链接、图标按钮、最小干扰的操作
- **颜色**：透明背景，次要文本色
- **动画**：最小动画效果
- **示例**：切换视图、图标按钮、链接式操作

```jsx
<SubtleButton onClick={toggleView}>
  <ViewIcon />
</SubtleButton>
```

### InfoButton - 信息按钮
- **用途**：信息、详情、帮助等操作
- **颜色**：信息蓝色 (`var(--info)`)
- **动画**：轻微放大和正向旋转
- **示例**：查看详情、帮助信息

```jsx
<InfoButton onClick={showDetails}>
  查看详情
</InfoButton>
```

### WarningButton - 警告按钮
- **用途**：警告、提醒等操作
- **颜色**：警告橙色 (`var(--warning)`)
- **动画**：轻微放大和反向旋转
- **示例**：警告操作、提醒功能

```jsx
<WarningButton onClick={showWarning}>
  警告
</WarningButton>
```

## 使用原则

### 1. 语义化选择
根据按钮的语义选择合适的变体：
- 确认操作 → `PrimaryButton`
- 删除/重置 → `DangerButton`
- 取消/返回 → `SecondaryButton`
- 生成/创建 → `GenerateButton`

### 2. 避免硬编码样式
不要直接在按钮上设置颜色样式：

```jsx
// ✅ 正确
<PrimaryButton sx={{ px: 4, py: 1.5 }}>
  确认
</PrimaryButton>

// ❌ 错误
<PrimaryButton sx={{ backgroundColor: "#customColor" }}>
  确认
</PrimaryButton>
```

### 3. 保持一致性
相同功能的按钮在整个应用中应使用相同的变体：
- 所有"重置"按钮 → `DangerButton`
- 所有"提交"按钮 → `PrimaryButton`
- 所有"取消"按钮 → `SecondaryButton`

### 4. 动画一致性
每个变体都有预设的动画效果，避免自定义动画参数：

```jsx
// ✅ 正确 - 使用预设动画
<PrimaryButton>
  确认
</PrimaryButton>

// ❌ 错误 - 自定义动画参数
<PrimaryButton scale={1.2} rotate={3}>
  确认
</PrimaryButton>
```

## 导入方式

```jsx
import {
  PrimaryButton,
  DangerButton,
  SecondaryButton,
  GenerateButton,
  SubtleButton,
  InfoButton,
  WarningButton
} from "../components/ButtonVariants";
```

## 自定义样式

虽然不推荐自定义颜色，但可以调整布局相关的样式：

```jsx
<PrimaryButton
  sx={{
    // ✅ 允许的样式调整
    px: 4,           // 水平内边距
    py: 1.5,         // 垂直内边距
    width: "100%",   // 宽度
    fontSize: "1.1rem", // 字体大小
    fontWeight: 600, // 字体粗细
    
    // ❌ 避免的颜色样式
    // backgroundColor: "customColor",
    // color: "customColor",
  }}
>
  自定义布局的按钮
</PrimaryButton>
```

## 最佳实践

1. **语义优先**：根据按钮的功能选择变体，而不是根据颜色
2. **一致性**：相同功能的按钮在整个应用中保持一致的变体
3. **可访问性**：确保按钮有足够的颜色对比度
4. **状态反馈**：利用预设的悬停状态提供视觉反馈
5. **避免重复**：不要重复定义相同的按钮样式

通过遵循这些指南，可以确保 WSToolBox 应用中的按钮具有统一的视觉风格和交互体验。