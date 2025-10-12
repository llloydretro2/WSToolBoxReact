import React from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { Button } from "@mui/material";

/**
 * AnimatedButton - 带有炫酷hover效果的按钮组件
 *
 * @param {Object} props - 组件属性
 * @param {React.ReactNode} props.children - 按钮内容
 * @param {number} [props.scale=1.05] - hover时的缩放比例
 * @param {number} [props.rotate=1] - hover时的旋转角度（度）
 * @param {number} [props.tapScale=0.95] - 点击时的缩放比例
 * @param {number} [props.stiffness=400] - 弹性动画强度
 * @param {number} [props.damping=17] - 弹性动画阻尼
 * @param {boolean} [props.disabled=false] - 是否禁用动画（通常在按钮disabled时使用）
 * @param {...any} rest - 其他传递给Button组件的props
 */
const AnimatedButton = ({
	children,
	scale = 1.05,
	rotate = 1,
	tapScale = 0.95,
	stiffness = 400,
	damping = 17,
	disabled = false,
	...rest
}) => {
	// 如果按钮被禁用，不应用动画效果
	if (disabled || rest.disabled) {
		return (
			<Button
				disabled={disabled}
				{...rest}>
				{children}
			</Button>
		);
	}

	return (
		<motion.div
			whileHover={{
				scale: scale,
				rotate: rotate,
			}}
			whileTap={{
				scale: tapScale,
			}}
			transition={{
				type: "spring",
				stiffness: stiffness,
				damping: damping,
			}}>
			<Button {...rest}>{children}</Button>
		</motion.div>
	);
};

AnimatedButton.propTypes = {
	children: PropTypes.node.isRequired,
	scale: PropTypes.number,
	rotate: PropTypes.number,
	tapScale: PropTypes.number,
	stiffness: PropTypes.number,
	damping: PropTypes.number,
	disabled: PropTypes.bool,
};

export default AnimatedButton;
