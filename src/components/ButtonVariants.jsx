import React from "react";
import PropTypes from "prop-types";
import AnimatedButton from "./AnimatedButton";

/**
 * 预设的动画按钮变体 - 统一颜色方案
 */

// 主要操作按钮 - 确认、提交、创建等正面操作
export const PrimaryButton = ({ children, ...props }) => (
  <AnimatedButton
    scale={1.05}
    rotate={1}
    {...props}
    sx={{
      backgroundColor: "var(--primary)",
      color: "var(--text)",
      "&:hover": {
        backgroundColor: "var(--primary-hover)",
      },
      ...props.sx,
    }}
  >
    {children}
  </AnimatedButton>
);

// 危险操作按钮 - 重置、删除、取消等负面操作
export const DangerButton = ({ children, ...props }) => (
  <AnimatedButton
    scale={1.05}
    rotate={-1}
    {...props}
    sx={{
      backgroundColor: "var(--reset)",
      color: "white",
      "&:hover": {
        backgroundColor: "var(--reset-hover)",
      },
      ...props.sx,
    }}
  >
    {children}
  </AnimatedButton>
);

// 次要操作按钮 - 次要操作、取消、返回等
export const SecondaryButton = ({ children, ...props }) => (
  <AnimatedButton
    scale={1.03}
    rotate={0.5}
    {...props}
    sx={{
      backgroundColor: "var(--card-background)",
      color: "var(--text)",
      border: "1px solid var(--border)",
      "&:hover": {
        backgroundColor: "var(--primary-light)",
      },
      ...props.sx,
    }}
  >
    {children}
  </AnimatedButton>
);

// 生成/创建按钮 - 生成、随机、创建等操作
export const GenerateButton = ({ children, ...props }) => (
  <AnimatedButton
    scale={1.08}
    rotate={2}
    stiffness={500}
    damping={15}
    {...props}
    sx={{
      backgroundColor: "var(--success)",
      color: "white",
      "&:hover": {
        backgroundColor: "#2e7d32",
      },
      ...props.sx,
    }}
  >
    {children}
  </AnimatedButton>
);

// 微妙效果按钮 - 最小动画，用于链接、图标按钮等
export const SubtleButton = ({ children, ...props }) => (
  <AnimatedButton
    scale={1.02}
    rotate={0}
    {...props}
    sx={{
      backgroundColor: "transparent",
      color: "var(--text-secondary)",
      "&:hover": {
        backgroundColor: "var(--card-background)",
      },
      ...props.sx,
    }}
  >
    {children}
  </AnimatedButton>
);

// 信息按钮 - 信息、详情、帮助等操作
export const InfoButton = ({ children, ...props }) => (
  <AnimatedButton
    scale={1.04}
    rotate={0.8}
    {...props}
    sx={{
      backgroundColor: "var(--info)",
      color: "white",
      "&:hover": {
        backgroundColor: "var(--primary-dark)",
      },
      ...props.sx,
    }}
  >
    {children}
  </AnimatedButton>
);

// 警告按钮 - 警告、提醒等操作
export const WarningButton = ({ children, ...props }) => (
  <AnimatedButton
    scale={1.04}
    rotate={-0.8}
    {...props}
    sx={{
      backgroundColor: "var(--warning)",
      color: "white",
      "&:hover": {
        backgroundColor: "#f57c00",
      },
      ...props.sx,
    }}
  >
    {children}
  </AnimatedButton>
);

// PropTypes for all variants
const buttonPropTypes = {
  children: PropTypes.node.isRequired,
  sx: PropTypes.object,
};

PrimaryButton.propTypes = buttonPropTypes;
DangerButton.propTypes = buttonPropTypes;
SecondaryButton.propTypes = buttonPropTypes;
GenerateButton.propTypes = buttonPropTypes;
SubtleButton.propTypes = buttonPropTypes;
InfoButton.propTypes = buttonPropTypes;
WarningButton.propTypes = buttonPropTypes;
