import React from "react";
import PropTypes from "prop-types";
import { motion, useReducedMotion } from "framer-motion";

// 检测是否为移动设备
const isMobile = () => {
	return window.innerWidth <= 768;
};

const getPageVariants = () => {
	const mobile = isMobile();

	if (mobile) {
		// 移动端使用纯透明度动画，避免任何布局变化
		return {
			initial: {
				opacity: 0,
			},
			in: {
				opacity: 1,
			},
			out: {
				opacity: 0,
			},
		};
	} else {
		// 桌面端保持原有动画
		return {
			initial: {
				opacity: 0,
				y: 100,
				scale: 0.8,
			},
			in: {
				opacity: 1,
				y: 0,
				scale: 1,
			},
			out: {
				opacity: 0,
				y: -100,
				scale: 1.2,
			},
		};
	}
};

const getPageTransition = (prefersReducedMotion) => {
	const mobile = isMobile();

	if (prefersReducedMotion) {
		return {
			duration: 0.2,
		};
	}

	return {
		type: "tween",
		ease: mobile ? "easeOut" : "anticipate",
		duration: mobile ? 0.4 : 0.8,
	};
};

const PageTransition = ({ children }) => {
	const prefersReducedMotion = useReducedMotion();
	const pageVariants = getPageVariants();
	const pageTransition = getPageTransition(prefersReducedMotion);

	return (
		<motion.div
			initial="initial"
			animate="in"
			exit="out"
			variants={pageVariants}
			transition={pageTransition}
			style={{
				width: "100%",
				minHeight: "calc(100vh - 64px)", // 减去导航栏高度
				overflow: "hidden", // 防止水平滚动条出现
				position: "relative", // 确保定位上下文
			}}>
			{children}
		</motion.div>
	);
};

PageTransition.propTypes = {
	children: PropTypes.node.isRequired,
};

export default PageTransition;
