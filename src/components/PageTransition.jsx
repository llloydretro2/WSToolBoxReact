import React from "react";
import PropTypes from "prop-types";
import { motion, useReducedMotion } from "framer-motion";

// 简化的页面变换动画 - 只有淡出淡入效果
const pageVariants = {
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

const getPageTransition = (prefersReducedMotion) => {
	if (prefersReducedMotion) {
		return {
			duration: 0.1,
		};
	}

	return {
		type: "tween",
		ease: "easeInOut",
		duration: 0.3,
	};
};

const PageTransition = ({ children }) => {
	const prefersReducedMotion = useReducedMotion();
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
				height: "calc(100vh - 64px)", // 固定高度而不是最小高度
				position: "relative",
				overflow: "hidden", // 防止内容溢出
			}}>
			<div
				style={{
					height: "100%",
					overflowY: "auto", // 内容可滚动
					padding: "32px 0", // 替代页面的 mt: 4
				}}>
				{children}
			</div>
		</motion.div>
	);
};

PageTransition.propTypes = {
	children: PropTypes.node.isRequired,
};

export default PageTransition;
