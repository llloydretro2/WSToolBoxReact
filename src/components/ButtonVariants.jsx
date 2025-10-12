import React from "react";
import PropTypes from "prop-types";
import AnimatedButton from "./AnimatedButton";

/**
 * 预设的动画按钮变体
 */

// 主要操作按钮 - 标准效果
export const PrimaryButton = ({ children, ...props }) => (
	<AnimatedButton
		scale={1.05}
		rotate={1}
		{...props}>
		{children}
	</AnimatedButton>
);

// 危险操作按钮 - 反向旋转
export const DangerButton = ({ children, ...props }) => (
	<AnimatedButton
		scale={1.05}
		rotate={-1}
		{...props}>
		{children}
	</AnimatedButton>
);

// 次要操作按钮 - 较小的效果
export const SecondaryButton = ({ children, ...props }) => (
	<AnimatedButton
		scale={1.03}
		rotate={0.5}
		{...props}>
		{children}
	</AnimatedButton>
);

// 生成/创建按钮 - 更有活力的效果
export const GenerateButton = ({ children, ...props }) => (
	<AnimatedButton
		scale={1.08}
		rotate={2}
		stiffness={500}
		damping={15}
		{...props}>
		{children}
	</AnimatedButton>
);

// 微妙效果按钮 - 最小的动画
export const SubtleButton = ({ children, ...props }) => (
	<AnimatedButton
		scale={1.02}
		rotate={0}
		{...props}>
		{children}
	</AnimatedButton>
);

// PropTypes for all variants
const buttonPropTypes = {
	children: PropTypes.node.isRequired,
};

PrimaryButton.propTypes = buttonPropTypes;
DangerButton.propTypes = buttonPropTypes;
SecondaryButton.propTypes = buttonPropTypes;
GenerateButton.propTypes = buttonPropTypes;
SubtleButton.propTypes = buttonPropTypes;
