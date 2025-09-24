import React, { useEffect, useId, useMemo, useState } from "react";
import "./PillNav.css";

const easingMap = {
	"power1.easeout": "cubic-bezier(0.11, 0, 0.5, 0)",
	"power2.easeout": "cubic-bezier(0.17, 0.67, 0.83, 0.67)",
	"power3.easeout": "cubic-bezier(0.25, 1, 0.5, 1)",
	"power4.easeout": "cubic-bezier(0.39, 0.575, 0.565, 1)",
	"sine.easeout": "ease-out",
	"expo.easeout": "cubic-bezier(0.19, 1, 0.22, 1)",
};

const normalizeEase = (ease) => {
	if (!ease) {
		return "ease-out";
	}
	const normalized = ease.toLowerCase();
	return easingMap[normalized] || normalized;
};

const PillNav = ({
	logo,
	logoAlt,
	items = [],
	activeHref,
	className = "",
	ease,
	baseColor = "transparent",
	pillColor = "#ffffff",
	hoveredPillTextColor = "#ffffff",
	pillTextColor = "#000000",
	mobileToggleLabel = "Menu",
	onItemClick,
}) => {
	const [hoveredIndex, setHoveredIndex] = useState(null);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const itemsId = useId();
	const timingFunction = useMemo(() => normalizeEase(ease), [ease]);
	const navClassName = useMemo(
		() => ["pill-nav", className].filter(Boolean).join(" "),
		[className]
	);
	const itemsClassName = useMemo(
		() =>
			`pill-nav__items${isMobileMenuOpen ? " pill-nav__items--mobile-open" : ""}`,
		[isMobileMenuOpen]
	);
	const navStyle = useMemo(
		() => ({
			backgroundColor: baseColor,
			"--pill-nav-pill-color": pillColor,
			"--pill-nav-pill-text-color": pillTextColor,
			"--pill-nav-hover-text-color": hoveredPillTextColor,
			"--pill-nav-toggle-text-color": pillTextColor,
		}),
		[baseColor, pillColor, pillTextColor, hoveredPillTextColor]
	);

	useEffect(() => {
		setIsMobileMenuOpen(false);
	}, [activeHref]);

	const handleClick = (event, item) => {
		event.preventDefault();
		if (onItemClick) {
			onItemClick(item);
		} else if (item?.href || item?.path) {
			window.location.href = item.href || item.path;
		}
		setIsMobileMenuOpen(false);
	};

	const toggleMobileMenu = () => {
		setIsMobileMenuOpen((prev) => !prev);
	};

	const closeMobileMenu = () => setIsMobileMenuOpen(false);

	return (
		<nav className={navClassName} style={navStyle}>
			{logo ? (
				<div className="pill-nav__logo">
					<img src={logo} alt={logoAlt || "Logo"} onClick={closeMobileMenu} />
				</div>
			) : null}
			<button
				type="button"
				className="pill-nav__toggle"
				onClick={toggleMobileMenu}
				aria-expanded={isMobileMenuOpen}
				aria-label={mobileToggleLabel}
				aria-controls={itemsId}
			>
				<span className="pill-nav__toggle-line" />
				<span className="pill-nav__toggle-line" />
				<span className="pill-nav__toggle-line" />
			</button>
			<div className={itemsClassName} id={itemsId}>
				{items.map((item, index) => {
					const href = item.href ?? item.path ?? "#";
					const isActive = activeHref === href;
					const isHovered = hoveredIndex === index;
					const backgroundColor = isActive || isHovered ? pillColor : "transparent";
					const color = isHovered ? hoveredPillTextColor : pillTextColor;

					return (
						<button
							key={item.label ?? href}
							type="button"
							className="pill-nav__item"
							aria-current={isActive ? "page" : undefined}
							onClick={(event) => handleClick(event, item)}
							onMouseEnter={() => setHoveredIndex(index)}
							onMouseLeave={() => setHoveredIndex(null)}
							style={{
								backgroundColor,
								color,
								transitionTimingFunction: timingFunction,
							}}
						>
							{item.label}
						</button>
					);
				})}
			</div>
		</nav>
	);
};

export default PillNav;
