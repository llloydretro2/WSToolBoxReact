import React, { useState, useEffect } from "react";
import {
  PrimaryButton,
  DangerButton,
  SecondaryButton,
} from "../components/ButtonVariants";
import { motion } from "framer-motion";
import {
  Container,
  Typography,
  Button,
  TextField,
  Box,
  Grid,
  Paper,
  Stack,
  Divider,
  Chip,
} from "@mui/material";
import CasinoIcon from "@mui/icons-material/Casino";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { useLocale } from "../contexts/LocaleContext";

function Dice() {
  const [diceInputs, setDiceInputs] = useState([{ sides: 6, count: 1 }]);
  const [results, setResults] = useState([]);
  const { t } = useLocale();

  useEffect(() => {
    const savedInputs = localStorage.getItem("diceInputs");
    const savedResults = localStorage.getItem("diceResults");
    if (savedInputs) {
      setDiceInputs(JSON.parse(savedInputs));
    }
    if (savedResults) {
      setResults(JSON.parse(savedResults));
    }
  }, []);

  const handleChange = (index, field, value) => {
    const numericValue = parseInt(value, 10);
    const minValue = field === "sides" ? 2 : 1;

    setDiceInputs((prevInputs) => {
      const nextInputs = prevInputs.map((input, idx) => {
        if (idx !== index) {
          return input;
        }
        if (Number.isNaN(numericValue)) {
          return { ...input, [field]: "" };
        }
        return { ...input, [field]: Math.max(minValue, numericValue) };
      });

      localStorage.setItem("diceInputs", JSON.stringify(nextInputs));
      return nextInputs;
    });
  };

  const addDiceInput = () => {
    setDiceInputs((prevInputs) => {
      const nextInputs = [...prevInputs, { sides: 6, count: 1 }];
      localStorage.setItem("diceInputs", JSON.stringify(nextInputs));
      return nextInputs;
    });
  };

  const resetDiceInputs = () => {
    setDiceInputs([{ sides: 6, count: 1 }]);
    setResults([]);
    localStorage.removeItem("diceInputs");
    localStorage.removeItem("diceResults");
  };

  const rollDice = () => {
    const sanitizedInputs = diceInputs.map(({ count, sides }) => ({
      count: Math.max(1, parseInt(count, 10) || 1),
      sides: Math.max(2, parseInt(sides, 10) || 6),
    }));

    setDiceInputs(sanitizedInputs);
    localStorage.setItem("diceInputs", JSON.stringify(sanitizedInputs));

    const allResults = sanitizedInputs.map(({ count, sides }) => {
      const rolls = [];
      for (let i = 0; i < count; i += 1) {
        rolls.push(Math.floor(Math.random() * sides) + 1);
      }
      return rolls;
    });
    setResults(allResults);
    localStorage.setItem("diceResults", JSON.stringify(allResults));
  };

  const flattenedResults = results.flat();
  const total = flattenedResults.reduce((sum, value) => sum + value, 0);
  const average =
    flattenedResults.length > 0
      ? (total / flattenedResults.length).toFixed(2)
      : "0";
  const hasResults = results.length > 0 && flattenedResults.length > 0;

  const GREEN_MAIN = "var(--primary)";
  const GREEN_DARK = "var(--primary-hover)";
  const GREEN_TEXT = "var(--text)";
  const ACCENT_RED = "var(--error)";
  const ACCENT_RED_DARK = "#5c0f10";

  return (
    <Box
      sx={{
        minHeight: "100%", // 使用100%而不是视口高度
      }}
    >
      <Container maxWidth="md">
        {/* 页面标题和副标题 */}
        <Box textAlign="center" mb={4}>
          <Typography
            variant="h4"
            fontWeight={700}
            color="var(--text)"
            gutterBottom
          >
            {t("pages.dice.title")}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t("pages.dice.subtitle")}
          </Typography>
        </Box>

        <Paper
          elevation={8}
          sx={{
            p: { xs: 3, md: 5 },
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
            boxShadow: "0 20px 45px -18px rgba(0, 0, 0, 0.2)",
          }}
        >
          <Stack spacing={2}>
            {diceInputs.map((input, index) => (
              <Paper
                key={`dice-input-${index}`}
                elevation={3}
                sx={{
                  p: { xs: 2, md: 3 },
                  borderRadius: 3,
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--card-background)",
                }}
              >
                <Grid
                  container
                  spacing={2}
                  alignItems="center"
                  justifyContent="center"
                  textAlign="center"
                >
                  <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                    <Stack spacing={0.25} alignItems="center">
                      <Typography variant="subtitle2" color="text.secondary">
                        {t("pages.dice.setLabel", { index: index + 1 })}
                      </Typography>
                      <Typography variant="h6" fontWeight={600}>
                        D{input.sides || "?"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t("pages.dice.facesLabel")}
                      </Typography>
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                    <TextField
                      label={t("pages.dice.countLabel")}
                      type="number"
                      fullWidth
                      value={input.count}
                      onChange={(e) =>
                        handleChange(index, "count", e.target.value)
                      }
                      inputProps={{ min: 1, style: { textAlign: "center" } }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4, md: 3 }}>
                    <TextField
                      label={t("pages.dice.facesLabel")}
                      type="number"
                      fullWidth
                      value={input.sides}
                      onChange={(e) =>
                        handleChange(index, "sides", e.target.value)
                      }
                      inputProps={{ min: 2, style: { textAlign: "center" } }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Stack>

          <Divider sx={{ my: { xs: 3, md: 4 } }} />

          <Grid container spacing={2} justifyContent="center">
            <Grid size={{ xs: 12, sm: 4 }}>
              <motion.div
                whileHover={{ scale: 1.05, rotate: 1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <SecondaryButton
                  variant="outlined"
                  fullWidth
                  startIcon={<AddCircleOutlineRoundedIcon />}
                  onClick={addDiceInput}
                >
                  {t("pages.dice.addButton")}
                </SecondaryButton>
              </motion.div>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <motion.div
                whileHover={{ scale: 1.05, rotate: -1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <DangerButton
                  variant="outlined"
                  fullWidth
                  startIcon={<RefreshRoundedIcon />}
                  onClick={resetDiceInputs}
                >
                  {t("pages.dice.resetButton")}
                </DangerButton>
              </motion.div>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <motion.div
                whileHover={{ scale: 1.05, rotate: 1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <PrimaryButton
                  variant="contained"
                  fullWidth
                  startIcon={<CasinoIcon />}
                  onClick={rollDice}
                >
                  {t("pages.dice.rollButton")}
                </PrimaryButton>
              </motion.div>
            </Grid>
          </Grid>

          {hasResults && (
            <Box sx={{ mt: { xs: 4, md: 5 }, textAlign: "center" }}>
              <Typography variant="h5" gutterBottom fontWeight={600}>
                {t("pages.dice.resultsTitle")}
              </Typography>
              <Grid container spacing={2} justifyContent="center">
                {results.map((rolls, idx) => {
                  const maxRoll = rolls.length > 0 ? Math.max(...rolls) : null;
                  return (
                    <Grid size={{ xs: 12, md: 6 }} key={`result-${idx}`}>
                      <Paper
                        elevation={0}
                        sx={{
                          p: { xs: 2, md: 3 },
                          borderRadius: 3,
                          border: "1px solid var(--border)",
                          backgroundColor: "var(--card-background)",
                        }}
                      >
                        <Typography variant="subtitle1" gutterBottom>
                          {t("pages.dice.setLabel", { index: idx + 1 })}
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={1}
                          flexWrap="wrap"
                          justifyContent="center"
                        >
                          {rolls.map((value, rollIndex) => (
                            <Chip
                              key={`chip-${idx}-${rollIndex}`}
                              label={value}
                              color={
                                maxRoll !== null &&
                                value === maxRoll &&
                                rolls.length > 1
                                  ? "primary"
                                  : "default"
                              }
                              variant={
                                maxRoll !== null &&
                                value === maxRoll &&
                                rolls.length > 1
                                  ? "filled"
                                  : "outlined"
                              }
                            />
                          ))}
                        </Stack>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
              <Paper
                elevation={0}
                sx={{
                  mt: { xs: 3, md: 4 },
                  p: { xs: 2, md: 3 },
                  borderRadius: 3,
                  backgroundColor: "var(--card-background)",
                  border: "1px solid var(--border)",
                  maxWidth: 420,
                  mx: "auto",
                }}
              >
                <Typography variant="subtitle2" color="text.secondary">
                  {t("pages.dice.summaryTitle")}
                </Typography>
                <Typography variant="h6" fontWeight={600}>
                  {t("pages.dice.summaryValue", { total, average })}
                </Typography>
              </Paper>
            </Box>
          )}
        </Paper>
      </Container>
    </Box>
  );
}

export default Dice;
