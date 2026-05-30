import React, { useState, useRef, useEffect, useCallback } from "react";
import PropTypes from "prop-types";

const LazyImage = ({
	src,
	alt,
	className = "",
	style = {},
	onClick,
	onNaturalLoad,
	...props
}) => {
	const [isInView, setIsInView] = useState(false);
	const [isLoaded, setIsLoaded] = useState(false);
	const imgRef = useRef();

	const handleIntersection = useCallback(([entry]) => {
		if (entry.isIntersecting) {
			setIsInView(true);
		}
	}, []);

	useEffect(() => {
		const observer = new IntersectionObserver(handleIntersection, {
			threshold: 0.1,
			rootMargin: "200px",
		});

		if (imgRef.current) {
			observer.observe(imgRef.current);
		}

		return () => observer.disconnect();
	}, [handleIntersection]);

	const handleLoad = useCallback((e) => {
		setIsLoaded(true);
		onNaturalLoad?.(e.target.naturalWidth, e.target.naturalHeight);
	}, [onNaturalLoad]);

	const hasExplicitSize = style && (style.height || style.minHeight);
	const containerStyle = {
		position: "relative",
		width: "100%",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		borderRadius: "4px",
		...style,
	};

	if (!hasExplicitSize) {
		containerStyle.minHeight = "200px";
	}

	const imageStyle = {
		width: "100%",
		height: "100%",
		objectFit: (style && style.objectFit) || "cover",
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
			{/* Shimmer skeleton */}
			{!isLoaded && (
				<div className="absolute inset-0 animate-pulse bg-[var(--card-background)]"
				     style={{ borderRadius: "4px" }} />
			)}

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
	onClick: PropTypes.func,
	onNaturalLoad: PropTypes.func,
};

export default LazyImage;
