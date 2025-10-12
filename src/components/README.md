# AnimatedButton 组件使用说明

## 概述

我们创建了一套可复用的动画按钮组件，避免在每个页面重复写相同的动画代码。

## 核心组件

### `AnimatedButton`

基础动画按钮组件，提供完全可定制的动画参数。

### `ButtonVariants`

预设的按钮变体，针对不同场景优化。

## 快速使用

### 1. 基础用法

```jsx
import { PrimaryButton } from "../components/ButtonVariants";

<PrimaryButton
    variant="contained"
    onClick={handleClick}
    sx={{ minWidth: 180 }}>
    点击我
</PrimaryButton>
```

### 2. 预设变体

```jsx
import { 
    GenerateButton, 
    DangerButton, 
    SecondaryButton, 
    SubtleButton 
} from "../components/ButtonVariants";

// 生成/创建按钮 - 更活跃的动画
<GenerateButton variant="contained" onClick={handleGenerate}>
    生成牌堆
</GenerateButton>

// 危险操作按钮 - 反向旋转
<DangerButton variant="outlined" onClick={handleDelete}>
    删除
</DangerButton>

// 次要操作按钮 - 较温和的动画
<SecondaryButton variant="outlined" onClick={handleReset}>
    重置
</SecondaryButton>

// 微妙效果按钮 - 最小动画
<SubtleButton variant="text" onClick={handleCancel}>
    取消
</SubtleButton>
```

### 3. 自定义动画参数

```jsx
import AnimatedButton from "../components/AnimatedButton";

<AnimatedButton
    scale={1.1}        // hover时放大到110%
    rotate={3}         // 旋转3度
    tapScale={0.9}     // 点击时缩小到90%
    stiffness={600}    // 更强的弹性
    damping={20}       // 更多阻尼
    variant="contained"
    onClick={handleClick}>
    自定义动画
</AnimatedButton>
```

## 预设变体详情

| 变体 | 缩放 | 旋转 | 推荐用途 |
|------|------|------|----------|
| `PrimaryButton` | 1.05 | 1° | 主要操作 |
| `GenerateButton` | 1.08 | 2° | 生成/创建操作 |
| `DangerButton` | 1.05 | -1° | 危险操作（删除、重置） |
| `SecondaryButton` | 1.03 | 0.5° | 次要操作 |
| `SubtleButton` | 1.02 | 0° | 最小化效果 |

## 禁用状态

按钮被禁用时，动画会自动停用：

```jsx
<PrimaryButton disabled variant="contained">
    禁用按钮
</PrimaryButton>
```

## 迁移现有代码

### 之前的写法

```jsx
<motion.div
    whileHover={{ scale: 1.05, rotate: 1 }}
    whileTap={{ scale: 0.95 }}
    transition={{ type: "spring", stiffness: 400, damping: 17 }}>
    <Button variant="contained" onClick={handleClick}>
        按钮文字
    </Button>
</motion.div>
```

### 现在的写法

```jsx
<PrimaryButton variant="contained" onClick={handleClick}>
    按钮文字
</PrimaryButton>
```

## 优势

✅ **代码复用** - 避免重复动画代码  
✅ **一致性** - 统一的动画效果  
✅ **可维护** - 集中管理动画参数  
✅ **类型安全** - 完整的PropTypes验证  
✅ **性能优化** - 禁用状态自动停用动画  
✅ **灵活性** - 支持完全自定义参数

## 文件结构

```text
src/components/
├── AnimatedButton.jsx      # 基础动画按钮
└── ButtonVariants.jsx      # 预设变体
```
