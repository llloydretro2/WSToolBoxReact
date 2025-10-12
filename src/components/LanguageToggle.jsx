import React from "react";
import PropTypes from "prop-types";
import { ButtonGroup, Button } from "@mui/material";
import { useLocale } from "../contexts/LocaleContext";

const GREEN_MAIN = "#a6ceb6";
const GREEN_DARK = "#95bfa5";
const GREEN_TEXT = "#1b4332";
const GREEN_LIGHT = "#dceee3";

function LanguageToggle({ sx }) {
	const { locale, setLocale, t } = useLocale();

	const handleChange = (value) => {
		if (value !== locale) {
			setLocale(value);
		}
	};

	const buttonGroupStyles = {
		borderRadius: 999,
		overflow: "hidden",
		border: `1px solid ${GREEN_MAIN}`,
		backgroundColor: GREEN_LIGHT,
		boxShadow: "0 8px 18px -12px rgba(74, 141, 112, 0.45)",
	};

	const activeButtonStyles = {
		backgroundColor: GREEN_MAIN,
		color: GREEN_TEXT,
		fontWeight: 600,
		px: 1.75,
		minWidth: 70,
		borderColor: GREEN_MAIN,
		textTransform: "none",
		transition: "background-color 0.2s ease, color 0.2s ease",
		"&:hover": {
			backgroundColor: GREEN_DARK,
			borderColor: GREEN_DARK,
		},
	};

	const inactiveButtonStyles = {
		backgroundColor: "transparent",
		color: GREEN_TEXT,
		fontWeight: 500,
		px: 1.75,
		minWidth: 70,
		borderColor: "transparent",
		textTransform: "none",
		transition: "background-color 0.2s ease, color 0.2s ease",
		"&:hover": {
			backgroundColor: "rgba(166, 206, 182, 0.3)",
			borderColor: "transparent",
		},
	};

	return (
		<ButtonGroup
			size="small"
			sx={[buttonGroupStyles, sx]}
			aria-label="language toggle">
			<Button
				disableElevation
				variant={locale === "zh" ? "contained" : "text"}
				onClick={() => handleChange("zh")}
				sx={locale === "zh" ? activeButtonStyles : inactiveButtonStyles}>
				{t("common.language.zh")}
			</Button>
			<Button
				disableElevation
				variant={locale === "en" ? "contained" : "text"}
				onClick={() => handleChange("en")}
				sx={locale === "en" ? activeButtonStyles : inactiveButtonStyles}>
				{t("common.language.en")}
			</Button>
		</ButtonGroup>
	);
}

LanguageToggle.propTypes = {
	sx: PropTypes.oneOfType([
		PropTypes.arrayOf(
			PropTypes.oneOfType([PropTypes.func, PropTypes.object, PropTypes.bool])
		),
		PropTypes.func,
		PropTypes.object,
	]),
};

export default LanguageToggle;
