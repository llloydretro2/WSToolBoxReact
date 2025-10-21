import React from "react";
import PropTypes from "prop-types";
import { Box, ToggleButtonGroup, ToggleButton } from "@mui/material";
import { useLocale } from "../contexts/LocaleContext";

function LanguageToggle({ sx }) {
  const { locale, setLocale } = useLocale();

  const handleChange = (value) => {
    if (value !== locale) {
      setLocale(value);
    }
  };

  return (
    <Box sx={sx}>
      <ToggleButtonGroup
        size="small"
        value={locale}
        exclusive
        onChange={(_, value) => value && handleChange(value)}
        aria-label="language toggle"
        sx={{
          borderRadius: 999,
          backgroundColor: "var(--primary-light)",
          border: "1px solid var(--primary)",
          boxShadow: "0 8px 18px -12px rgba(74, 141, 112, 0.45)",
          "& .MuiToggleButtonGroup-grouped": {
            border: "none",
            padding: "2px 10px",
            minWidth: 46,
            textTransform: "none",
            fontSize: "0.75rem",
            fontWeight: 500,
            color: "var(--text)",
            transition: "background-color 0.2s ease, color 0.2s ease",
            "&:first-of-type": {
              borderRadius: "999px 0 0 999px",
            },
            "&:last-of-type": {
              borderRadius: "0 999px 999px 0",
            },
            "&.Mui-selected": {
              backgroundColor: "var(--primary)",
              color: "var(--text)",
              fontWeight: 600,
              "&:hover": {
                backgroundColor: "var(--primary-hover)",
              },
            },
            "&:hover": {
              backgroundColor: "rgba(149, 191, 165, 0.3)",
            },
          },
        }}
      >
        <ToggleButton value="zh" aria-label="Chinese">
          中文
        </ToggleButton>
        <ToggleButton value="en" aria-label="English">
          EN
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}

LanguageToggle.propTypes = {
  sx: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.oneOfType([PropTypes.func, PropTypes.object, PropTypes.bool]),
    ),
    PropTypes.func,
    PropTypes.object,
  ]),
};

export default LanguageToggle;
