import React, { useState, useRef, useEffect, useCallback } from "react";
import PropTypes from "prop-types";

/**
 * 简单的懒加载图片组件
 * 只在图片进入视口时才开始加载
 */
const LazyImage = ({
	src,
	alt,
	className = "",
	style = {},
	placeholder = "加载中...",
	onClick,
	...props
}) => {
	const [isInView, setIsInView] = useState(false);
	const [isLoaded, setIsLoaded] = useState(false);
	const imgRef = useRef();

	const handleIntersection = useCallback(([entry]) => {
		if (entry.isIntersecting) {
			setIsInView(true);
			// 停止监听，节省性能
			entry.target.observer?.disconnect();
		}
	}, []);

	useEffect(() => {
		const observer = new IntersectionObserver(handleIntersection, {
			threshold: 0.1, // 10%可见时开始加载
			rootMargin: "50px", // 提前50px开始加载
		});

		if (imgRef.current) {
			imgRef.current.observer = observer;
			observer.observe(imgRef.current);
		}

		return () => observer.disconnect();
	}, [handleIntersection]);

	const handleLoad = useCallback(() => {
		setIsLoaded(true);
	}, []);

	const containerStyle = {
		position: "relative",
		width: "100%",
		minHeight: "200px", // 占位高度
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#f5f5f5",
		borderRadius: "4px",
		...style,
	};

	const placeholderStyle = {
		color: "#666",
		fontSize: "14px",
		textAlign: "center",
	};

	const imageStyle = {
		width: "100%",
		height: "auto",
		opacity: isLoaded ? 1 : 0,
		transition: "opacity 0.3s ease-in-out",
		borderRadius: "4px",
		cursor: onClick ? "pointer" : "default",
	};

	return (
		<div
			ref={imgRef}
			className={className}
			style={containerStyle}
			onClick={onClick}>
			{/* 加载占位符 */}
			{!isInView && <span style={placeholderStyle}>{placeholder}</span>}

			{/* 实际图片 */}
			{isInView && (
				<img
					src={src}
					alt={alt}
					onLoad={handleLoad}
					style={imageStyle}
					{...props}
				/>
			)}
		</div>
	);
};

LazyImage.propTypes = {
	src: PropTypes.string.isRequired,
	alt: PropTypes.string.isRequired,
	className: PropTypes.string,
	style: PropTypes.object,
	placeholder: PropTypes.string,
	onClick: PropTypes.func,
};

export default LazyImage;
