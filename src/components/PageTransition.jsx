import React from "react";
import PropTypes from "prop-types";
import { motion, useReducedMotion } from "framer-motion";
import { Box, useMediaQuery, useTheme } from "@mui/material";

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
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
	const toolbarHeight = isMobile ? 56 : 64;

	return (
		<Box
			component={motion.div}
			initial="initial"
			animate="in"
			exit="out"
			variants={pageVariants}
			transition={pageTransition}
			sx={{
				width: "100%",
				position: "relative",
				display: "flex",
				flexDirection: "column",
				minHeight: `calc(100vh - ${toolbarHeight}px)`,
				overflow: "visible",
				"@supports (height: 100dvh)": {
					minHeight: `calc(100dvh - ${toolbarHeight}px)`,
				},
			}}>
			<Box
				sx={{
					width: "100%",
					minHeight: "100%",
					flexGrow: 1,
					overflow: "visible",
					py: { xs: 3, md: 4 },
				}}>
				{children}
			</Box>
		</Box>
	);
};

PageTransition.propTypes = {
	children: PropTypes.node.isRequired,
};

export default PageTransition;
