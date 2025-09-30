import React from "react";
import { motion } from "framer-motion";
import { Button } from "@mui/material";

const AnimatedButton = ({ children, animationType = "bounce", ...props }) => {
	const animations = {
		bounce: {
			whileHover: { scale: 1.05 },
			whileTap: { scale: 0.95 },
			transition: { type: "spring", stiffness: 400, damping: 17 },
		},
		pulse: {
			whileHover: { scale: 1.02 },
			whileTap: { scale: 0.98 },
			transition: { type: "spring", stiffness: 300, damping: 20 },
		},
		rotate: {
			whileHover: { scale: 1.05, rotate: 2 },
			whileTap: { scale: 0.95, rotate: -1 },
			transition: { type: "spring", stiffness: 400, damping: 17 },
		},
		float: {
			whileHover: { y: -2, scale: 1.02 },
			whileTap: { y: 1, scale: 0.98 },
			transition: { type: "spring", stiffness: 400, damping: 17 },
		},
	};

	const currentAnimation = animations[animationType] || animations.bounce;

	return (
		<motion.div {...currentAnimation}>
			<Button {...props}>{children}</Button>
		</motion.div>
	);
};

export default AnimatedButton;
