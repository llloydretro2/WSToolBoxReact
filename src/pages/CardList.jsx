import React, { useState, useEffect, useMemo, useId } from "react";
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  Autocomplete,
  Card,
  CardContent,
  Pagination,
  Fab,
  Tooltip,
  Switch,
  FormControlLabel,
  Chip,
  Stack,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
} from "@mui/material";
import { PrimaryButton, DangerButton } from "../components/ButtonVariants";
import productList from "../data/productList.json";
import translationMap from "../data/filter_translations.json";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CloseIcon from "@mui/icons-material/Close";
import { useLocale } from "../contexts/LocaleContext";

const BACKEND_URL = "https://api.cardtoolbox.org";
// const BACKEND_URL = "http://38.244.14.142:4000";
// const BACKEND_URL = "http://localhost:4000";

const extractBaseCardNo = (cardno) => {
  if (!cardno) {
    return null;
  }
  const trimmed = cardno.trim();
  const match = trimmed.match(/^(.*\d)([A-Za-z]+)$/);
  return match ? match[1] : trimmed;
};

function CardList() {
  const [result, setResult] = useState({
    data: [],
    total: 0,
    page: 1,
    pageSize: 20,
  });

  const [form, setForm] = useState({ page: 1 });
  const [draftForm, setDraftForm] = useState({ page: 1 });
  const [showZh, setShowZh] = useState(false);
  const [showJP, setShowJP] = useState(true);
  const [showMergedVariants, setShowMergedVariants] = useState(true);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [relatedModalCard, setRelatedModalCard] = useState(null);
  const { locale, t } = useLocale();
  const mergeVariantsSwitchId = useId();
  const colon = locale === "zh" ? "：" : ": ";
  const zhToggleTitle = showZh
    ? t("pages.cardList.toggle.hideZh")
    : t("pages.cardList.toggle.showZh");
  const jpToggleTitle = showJP
    ? t("pages.cardList.toggle.hideJp")
    : t("pages.cardList.toggle.showJp");
  const scrollDownLabel = t("pages.cardList.scroll.down");
  const scrollUpLabel = t("pages.cardList.scroll.up");

  // 获取实际的滚动容器（PageTransition 内部的 div）
  const getScrollContainer = () => {
    // PageTransition 创建的滚动容器是它内部的 div
    // 查找第一个有 overflowY: auto 的父元素
    let element = document.querySelector(
      '[style*="overflow-y: auto"], [style*="overflowY: auto"]',
    );
    if (!element) {
      // 如果找不到，查找 motion.div 的子 div
      const motionDiv = document.querySelector('div[style*="calc(100vh"]');
      if (motionDiv) {
        element = motionDiv.querySelector("div");
      }
    }
    return element || window;
  };

  // 监听搜索结果，当有结果时显示滚动按钮
  useEffect(() => {
    setShowScrollButtons(result.data.length > 0);
  }, [result.data]);

  useEffect(() => {
    setSelectedVariants({});
  }, [result.data, showMergedVariants]);

  const cardGroups = useMemo(() => {
    const groupsInOrder = [];
    const groupMap = new Map();

    result.data.forEach((card, index) => {
      const normalizedCardNo = card.cardno ? card.cardno.trim() : "";
      const baseCardNo = extractBaseCardNo(normalizedCardNo);
      const key =
        baseCardNo ||
        normalizedCardNo ||
        (card.id ? `id-${card.id}` : `index-${index}`);
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          key,
          baseCardNo,
          variants: [],
        });
        groupsInOrder.push(groupMap.get(key));
      }
      groupMap.get(key).variants.push(card);
    });

    groupsInOrder.forEach((group) => {
      group.variants.sort((a, b) => {
        const aCardNo = a.cardno ? a.cardno.trim() : "";
        const bCardNo = b.cardno ? b.cardno.trim() : "";
        const aIsBase = group.baseCardNo ? aCardNo === group.baseCardNo : false;
        const bIsBase = group.baseCardNo ? bCardNo === group.baseCardNo : false;

        if (aIsBase && !bIsBase) return -1;
        if (!aIsBase && bIsBase) return 1;
        return aCardNo.localeCompare(bCardNo);
      });
    });

    return groupsInOrder;
  }, [result.data]);

  const cardsToRender = useMemo(() => {
    if (showMergedVariants) {
      return cardGroups;
    }

    return result.data.map((card, index) => ({
      key:
        (card.cardno && card.cardno.trim()) ||
        (card.id ? `id-${card.id}` : `card-${index}`),
      baseCardNo: extractBaseCardNo(card.cardno),
      variants: [card],
    }));
  }, [cardGroups, result.data, showMergedVariants]);

  const handleSearch = (draftForm) => {
    const params = new URLSearchParams(
      Object.entries(draftForm).filter(
        ([, v]) => v !== undefined && v !== "" && v !== null,
      ),
    ).toString();
    console.log(params);

    // 本地后端测试地址
    // http://localhost:4000/api/cards?${params}

    fetch(`${BACKEND_URL}/api/cards?${params}`)
      .then((res) => res.json())
      .then((res) => {
        setResult({
          data: res.data,
          total: res.total,
          page: res.page,
          pageSize: res.pageSize,
        });
        console.log(res);
      })
      .catch((err) => {
        console.error("搜索失败:", err);
        setResult({ data: [], total: 0 }); // 清空结果，保持页面正常显示
      });
    setForm(draftForm);
  };

  const handleReset = () => {
    setForm({ page: 1 });
    setDraftForm({ page: 1 });
    setResult({ data: [], total: 0, page: 1, pageSize: 20 });
  };

  const handlePageChange = (_, newPage) => {
    handleSearch({ ...form, page: newPage });
    setForm((prev) => ({ ...prev, page: newPage }));
  };

  const scrollToTop = () => {
    const container = getScrollContainer();
    if (container === window) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      container.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const scrollToBottom = () => {
    const container = getScrollContainer();
    if (container === window) {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth",
      });
    } else {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const handleOpenRelatedModal = (card) => {
    setRelatedModalCard(card);
  };

  const handleCloseRelatedModal = () => {
    setRelatedModalCard(null);
  };

  return (
    <Container maxWidth="md" sx={{ textAlign: "center" }}>
      <Typography
        variant="h4"
        fontWeight={700}
        color="var(--text)"
        gutterBottom
      >
        {t("pages.cardList.title")}
      </Typography>
      <Typography variant="body1" color="text.secondary" align="center">
        {t("pages.cardList.subtitle")}
      </Typography>

      {/* 搜索表单 */}
      <Box
        sx={{
          mt: 4,
          mb: 4,
          p: 3,
          backgroundColor: "var(--card-background)",
          borderRadius: 3,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
          border: "1px solid var(--border)",
        }}
      >
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch({ ...draftForm, page: 1 });
            setForm({ ...draftForm, page: 1 });
          }}
        >
          {/* 主要搜索字段 */}
          <Typography variant="h6" sx={{ mb: 2, textAlign: "left" }}>
            {t("pages.cardList.sections.primarySearch")}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
                md: "1fr 1fr 1fr",
              },
              gap: 2,
              mb: 3,
            }}
          >
            <Autocomplete
              options={productList.series_number
                .slice()
                .sort()
                .map(
                  (s) =>
                    `${s}${
                      translationMap.series_number?.[s]
                        ? `（${translationMap.series_number?.[s]}）`
                        : ""
                    }`,
                )}
              size="small"
              value={
                draftForm.series_number
                  ? `${draftForm.series_number}${
                      translationMap.series_number?.[draftForm.series_number]
                        ? `（${
                            translationMap.series_number?.[
                              draftForm.series_number
                            ]
                          }）`
                        : ""
                    }`
                  : ""
              }
              onChange={(_, newValue) => {
                const key = newValue?.split("（")[0];
                setDraftForm((prev) => ({ ...prev, series_number: key }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t("pages.cardList.fields.seriesNumber")}
                  variant="outlined"
                  fullWidth
                />
              )}
            />

            <Autocomplete
              options={productList.series
                .slice()
                .sort()
                .map(
                  (s) =>
                    `${s}${
                      translationMap.series?.[s]
                        ? `（${translationMap.series?.[s]}）`
                        : ""
                    }`,
                )}
              size="small"
              value={
                draftForm.series
                  ? `${draftForm.series}${
                      translationMap.series?.[draftForm.series]
                        ? `（${translationMap.series?.[draftForm.series]}）`
                        : ""
                    }`
                  : ""
              }
              onChange={(_, newValue) => {
                const key = newValue?.split("（")[0];
                setDraftForm((prev) => ({ ...prev, series: key }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t("pages.cardList.fields.series")}
                  variant="outlined"
                  fullWidth
                />
              )}
            />

            <Autocomplete
              options={productList.product_name
                .slice()
                .sort()
                .map(
                  (p) =>
                    `${p}${
                      translationMap.product_name?.[p]
                        ? `（${translationMap.product_name?.[p]}）`
                        : ""
                    }`,
                )}
              size="small"
              value={
                draftForm.product_name
                  ? `${draftForm.product_name}${
                      translationMap.product_name?.[draftForm.product_name]
                        ? `（${
                            translationMap.product_name?.[
                              draftForm.product_name
                            ]
                          }）`
                        : ""
                    }`
                  : ""
              }
              onChange={(_, newValue) => {
                const key = newValue?.split("（")[0];
                setDraftForm((prev) => ({ ...prev, product_name: key }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t("pages.cardList.fields.product")}
                  variant="outlined"
                  fullWidth
                />
              )}
            />
          </Box>

          {/* 关键词和Side搜索 */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "2fr 1fr",
              },
              gap: 2,
              mb: 3,
            }}
          >
            <TextField
              name="search"
              label={t("pages.cardList.fields.keyword")}
              variant="outlined"
              fullWidth
              size="small"
              value={draftForm.search || ""}
              onChange={(e) =>
                setDraftForm((prev) => ({ ...prev, search: e.target.value }))
              }
            />

            <Autocomplete
              options={productList.side.slice().sort()}
              size="small"
              value={draftForm.side || ""}
              onChange={(_, newValue) =>
                setDraftForm((prev) => ({ ...prev, side: newValue }))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t("pages.cardList.fields.side")}
                  variant="outlined"
                  fullWidth
                />
              )}
            />
          </Box>

          {/* 卡片属性 */}
          <Typography variant="h6" sx={{ mb: 2, textAlign: "left" }}>
            {t("pages.cardList.sections.cardAttributes")}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr 1fr",
                sm: "1fr 1fr 1fr 1fr",
                md: "1fr 1fr 1fr 1fr",
              },
              gap: 2,
              mb: 3,
            }}
          >
            <Autocomplete
              options={productList.color.slice().sort()}
              size="small"
              value={draftForm.color || ""}
              onChange={(_, newValue) =>
                setDraftForm((prev) => ({ ...prev, color: newValue }))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t("pages.cardList.fields.color")}
                  variant="outlined"
                  fullWidth
                />
              )}
            />

            <Autocomplete
              options={productList.level
                .slice()
                .sort((a, b) => Number(a) - Number(b))}
              size="small"
              value={draftForm.level || ""}
              onChange={(_, newValue) =>
                setDraftForm((prev) => ({ ...prev, level: newValue }))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t("pages.cardList.fields.level")}
                  variant="outlined"
                  fullWidth
                />
              )}
            />

            <Autocomplete
              options={productList.rarity.slice().sort()}
              size="small"
              value={draftForm.rarity || ""}
              onChange={(_, newValue) =>
                setDraftForm((prev) => ({ ...prev, rarity: newValue }))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t("pages.cardList.fields.rarity")}
                  variant="outlined"
                  fullWidth
                />
              )}
            />

            <Autocomplete
              options={productList.card_type.slice().sort()}
              size="small"
              value={draftForm.card_type || ""}
              onChange={(_, newValue) =>
                setDraftForm((prev) => ({ ...prev, card_type: newValue }))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t("pages.cardList.fields.cardType")}
                  variant="outlined"
                  fullWidth
                />
              )}
            />
          </Box>

          {/* 数值属性 */}
          <Typography variant="h6" sx={{ mb: 2, textAlign: "left" }}>
            {t("pages.cardList.sections.numericAttributes")}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr 1fr",
                sm: "1fr 1fr 1fr 1fr",
              },
              gap: 2,
              mb: 4,
            }}
          >
            <Autocomplete
              options={productList.power
                .slice()
                .sort((a, b) => Number(a) - Number(b))}
              size="small"
              value={draftForm.power || ""}
              onChange={(_, newValue) =>
                setDraftForm((prev) => ({ ...prev, power: newValue }))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t("pages.cardList.fields.power")}
                  variant="outlined"
                  fullWidth
                />
              )}
            />

            <Autocomplete
              options={productList.cost
                .slice()
                .sort((a, b) => Number(a) - Number(b))}
              size="small"
              value={draftForm.cost || ""}
              onChange={(_, newValue) =>
                setDraftForm((prev) => ({ ...prev, cost: newValue }))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t("pages.cardList.fields.cost")}
                  variant="outlined"
                  fullWidth
                />
              )}
            />

            <Autocomplete
              options={productList.soul.slice().sort()}
              size="small"
              value={draftForm.soul || ""}
              onChange={(_, newValue) =>
                setDraftForm((prev) => ({ ...prev, soul: newValue }))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t("pages.cardList.fields.soul")}
                  variant="outlined"
                  fullWidth
                />
              )}
            />

            <Autocomplete
              options={productList.trigger.slice().sort()}
              size="small"
              value={draftForm.trigger || ""}
              onChange={(_, newValue) =>
                setDraftForm((prev) => ({ ...prev, trigger: newValue }))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t("pages.cardList.fields.trigger")}
                  variant="outlined"
                  fullWidth
                />
              )}
            />
          </Box>

          {/* 操作按钮 */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: 2,
              pt: 2,
              borderTop: "1px solid rgba(0, 0, 0, 0.1)",
            }}
          >
            <PrimaryButton
              type="submit"
              variant="contained"
              size="large"
              sx={{
                px: 4,
                py: 1.5,
              }}
            >
              {t("pages.cardList.searchButton")}
            </PrimaryButton>

            <DangerButton
              type="button"
              variant="contained"
              size="large"
              onClick={handleReset}
              sx={{
                px: 4,
                py: 1.5,
              }}
            >
              {t("pages.cardList.resetButton")}
            </DangerButton>
          </Box>
        </Box>
      </Box>

      {result.data.length > 0 && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            px: { xs: 2, md: 4 },
            mt: 2,
          }}
        >
          <FormControlLabel
            control={
              <Switch
                color="success"
                checked={showMergedVariants}
                onChange={(_, checked) => setShowMergedVariants(checked)}
                inputProps={{ id: mergeVariantsSwitchId }}
                sx={{
                  m: 0,
                  "& .MuiSwitch-switchBase": {
                    p: 0.5,
                    "&.Mui-checked": {
                      transform: "translateX(20px)",
                      color: "#fff",
                      "& + .MuiSwitch-track": {
                        background: "var(--success)",
                        opacity: 1,
                      },
                    },
                  },
                  "& .MuiSwitch-thumb": {
                    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
                    width: 18,
                    height: 18,
                  },
                  "& .MuiSwitch-track": {
                    borderRadius: 999,
                    backgroundColor: "var(--border)",
                    opacity: 1,
                  },
                }}
              />
            }
            slotProps={{ label: { htmlFor: mergeVariantsSwitchId } }}
            label={
              showMergedVariants
                ? t("pages.cardList.toggle.splitVariants")
                : t("pages.cardList.toggle.mergeVariants")
            }
            sx={{
              userSelect: "none",
              px: 2.5,
              py: 1,
              borderRadius: 999,
              backgroundColor: "var(--card-background)",
              boxShadow: "0 8px 18px rgba(0, 0, 0, 0.1)",
              color: "var(--text)",
              gap: 1.5,
              "& .MuiTypography-root": {
                fontWeight: 600,
                fontSize: "0.95rem",
              },
            }}
          />
        </Box>
      )}

      <Box m={{ xs: 2, md: 4 }}>
        {cardsToRender.map((group, index) => {
          const groupKey = group.key || `group-${index}`;
          const variants = group.variants || [];
          const selectedIndex = showMergedVariants
            ? (selectedVariants[groupKey] ?? 0)
            : 0;
          const activeCard = variants[selectedIndex] || variants[0];
          if (!activeCard) {
            return null;
          }
          const card = activeCard;
          const relatedCards = Array.isArray(card.related_cards)
            ? card.related_cards
                .map((item) => {
                  if (!item) {
                    return null;
                  }
                  if (typeof item === "string") {
                    return { cardno: item };
                  }
                  if (typeof item === "object") {
                    return {
                      cardno: item.cardno || "",
                      name: item.name,
                      zh_name: item.zh_name,
                      image_url: item.image_url,
                      series: item.series,
                      series_number: item.series_number,
                      product_name: item.product_name,
                      rarity: item.rarity,
                      card_type: item.card_type,
                      color: item.color,
                      level: item.level,
                      cost: item.cost,
                      power: item.power,
                      soul: item.soul,
                      trigger: item.trigger,
                      effect: item.effect,
                      zh_effect: item.zh_effect,
                      flavor: item.flavor,
                      zh_flavor: item.zh_flavor,
                      trait: item.trait || item.feature,
                      zh_trait: item.zh_trait || item.zh_feature,
                    };
                  }
                  return { cardno: String(item) };
                })
                .filter(
                  (item) => item && (item.cardno || item.name || item.zh_name),
                )
            : [];

          const stats = [
            card.level && { key: "level", label: `Lv.${card.level}` },
            card.cost && { key: "cost", label: `Cost ${card.cost}` },
            card.power && {
              key: "power",
              label: `${card.power} ${t("pages.cardList.fields.power")}`,
            },
            card.soul && {
              key: "soul",
              label: `${card.soul} ${t("pages.cardList.fields.soul")}`,
            },
            card.trigger && {
              key: "trigger",
              label: `${t("pages.cardList.fields.trigger")} ${card.trigger}`,
            },
          ].filter(Boolean);

          const meta = [
            card.color && { key: "color", label: card.color },
            card.side && { key: "side", label: `Side ${card.side}` },
            card.rarity && { key: "rarity", label: card.rarity },
            card.card_type && { key: "type", label: card.card_type },
          ].filter(Boolean);

          return (
            <Card
              key={
                groupKey ||
                card.cardno ||
                card.id ||
                `${card.image_url}-${index}`
              }
              sx={{
                position: "relative",
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                overflow: "hidden",
                mb: 3,
                borderRadius: 3,
                backgroundColor: "var(--surface)",
                boxShadow: "0 18px 45px rgba(17, 24, 39, 0.15)",
                border: "1px solid var(--border)",
                transition: "transform 0.4s ease, box-shadow 0.4s ease",
                backdropFilter: "blur(4px)",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "40%",
                  height: "100%",
                  background:
                    "radial-gradient(circle at top left, var(--primary-light), transparent 65%)",
                },
                "&:hover": {
                  transform: "translateY(-6px)",
                  boxShadow: "0 24px 55px rgba(17, 24, 39, 0.22)",
                },
              }}
            >
              <Box
                sx={{
                  flexBasis: { xs: "100%", sm: "280px" },
                  flexShrink: 0,
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  p: { xs: 3, sm: 4 },
                  background:
                    "linear-gradient(160deg, rgba(255,255,255,0.15) 0%, var(--card-background) 100%)",
                  zIndex: 1,
                }}
              >
                <Box
                  component="img"
                  src={card.image_url}
                  alt={card.name}
                  sx={{
                    width: "100%",
                    maxWidth: 260,
                    borderRadius: 2,
                    objectFit: "contain",
                    boxShadow: "0 14px 30px rgba(17, 24, 39, 0.28)",
                  }}
                />
              </Box>
              <CardContent
                sx={{
                  flex: "1 1 auto",
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                  px: { xs: 3, sm: 4 },
                  py: { xs: 3, sm: 4 },
                }}
              >
                {showMergedVariants && variants.length > 1 && (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: {
                        xs: "flex-start",
                        sm: "flex-end",
                      },
                      mb: 1,
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                      flexWrap="wrap"
                      sx={{ rowGap: 1.2 }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: "text.secondary" }}
                      >
                        {t("pages.cardList.labels.variant")}
                      </Typography>
                      <ToggleButtonGroup
                        exclusive
                        value={selectedIndex}
                        onChange={(_, value) => {
                          if (value === null) return;
                          setSelectedVariants((prev) => ({
                            ...prev,
                            [groupKey]: value,
                          }));
                        }}
                        size="small"
                        sx={{
                          borderRadius: 999,
                          backgroundColor: "var(--card-background)",
                          "& .MuiToggleButton-root": {
                            border: "none",
                            px: 1.5,
                            minWidth: 44,
                            color: "var(--text)",
                            fontWeight: 600,
                            textTransform: "none",
                            transition: "all 0.2s ease",
                            "&.Mui-selected": {
                              backgroundColor: "var(--success)",
                              color: "#fff",
                              boxShadow: "0 6px 12px rgba(46, 125, 50, 0.3)",
                            },
                            "&:hover": {
                              backgroundColor: "rgba(76, 175, 80, 0.18)",
                            },
                          },
                        }}
                      >
                        {variants.map((variant, variantIndex) => {
                          const label =
                            variant.rarity ||
                            variant.cardno ||
                            t("pages.cardList.labels.variant");
                          return (
                            <ToggleButton
                              key={`${groupKey}-${
                                variant.cardno || variantIndex
                              }`}
                              value={variantIndex}
                            >
                              {label}
                            </ToggleButton>
                          );
                        })}
                      </ToggleButtonGroup>
                    </Stack>
                  </Box>
                )}
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {card.name}
                  </Typography>
                  {showZh && card.zh_name && (
                    <Typography variant="subtitle1" color="text.secondary">
                      {card.zh_name}
                    </Typography>
                  )}
                  {card.cardno && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5, fontWeight: 600 }}
                    >
                      {card.cardno}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    {card.series_number} · {card.series}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {card.product_name}
                  </Typography>
                </Box>

                <Stack
                  direction="row"
                  spacing={1}
                  flexWrap="wrap"
                  sx={{ rowGap: 1 }}
                >
                  {stats.map((chip) => (
                    <Chip
                      key={chip.key}
                      label={chip.label}
                      size="small"
                      sx={{
                        backgroundColor: "var(--card-background)",
                        border: "1px solid var(--border)",
                        fontWeight: 500,
                      }}
                    />
                  ))}
                </Stack>

                {meta.length > 0 && (
                  <Stack
                    direction="row"
                    spacing={1}
                    flexWrap="wrap"
                    sx={{ rowGap: 1 }}
                  >
                    {meta.map((chip) => (
                      <Chip
                        key={chip.key}
                        label={chip.label}
                        size="small"
                        sx={{
                          backgroundColor: "rgba(244, 67, 54, 0.08)",
                          border: "1px solid rgba(244, 67, 54, 0.18)",
                          fontWeight: 500,
                        }}
                      />
                    ))}
                  </Stack>
                )}

                <Divider sx={{ borderColor: "var(--divider)" }} />

                <Box>
                  {card.trait && (
                    <Typography variant="body2" color="text.secondary">
                      <strong>
                        {t("pages.cardList.labels.trait")}
                        {colon}
                      </strong>
                      {card.trait}
                    </Typography>
                  )}
                  {showZh && card.zh_trait && (
                    <Typography variant="body2" color="text.secondary">
                      <strong>
                        {t("pages.cardList.labels.traitZh")}
                        {colon}
                      </strong>
                      {card.zh_trait}
                    </Typography>
                  )}
                  {card.flavor && (
                    <Typography variant="body2" color="text.secondary">
                      <strong>
                        {t("pages.cardList.labels.flavor")}
                        {colon}
                      </strong>
                      {card.flavor}
                    </Typography>
                  )}
                  {showZh && card.zh_flavor && (
                    <Typography variant="body2" color="text.secondary">
                      <strong>
                        {t("pages.cardList.labels.flavorZh")}
                        {colon}
                      </strong>
                      {card.zh_flavor}
                    </Typography>
                  )}
                </Box>

                {(showJP && card.effect) || (showZh && card.zh_effect) ? (
                  <Box
                    sx={{
                      backgroundColor: "var(--card-background)",
                      borderRadius: 2,
                      p: 2,
                    }}
                  >
                    {showJP && card.effect && (
                      <Typography
                        variant="body2"
                        sx={{ mb: showZh && card.zh_effect ? 1 : 0 }}
                      >
                        <strong>
                          {t("pages.cardList.labels.effect")}
                          {colon}
                        </strong>
                        {card.effect}
                      </Typography>
                    )}
                    {showZh && card.zh_effect && (
                      <Typography variant="body2">
                        <strong>
                          {t("pages.cardList.labels.effectZh")}
                          {colon}
                        </strong>
                        {card.zh_effect}
                      </Typography>
                    )}
                  </Box>
                ) : null}

                {relatedCards.length > 0 && (
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      backgroundColor: "var(--card-background)",
                      borderRadius: 2,
                      border: "1px solid var(--border)",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, color: "var(--text)", mb: 1.5 }}
                    >
                      {t("pages.cardList.labels.related")}
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      sx={{ rowGap: 1 }}
                    >
                      {relatedCards.map((related, relatedIndex) => (
                        <Chip
                          key={`${card.cardno || card.id}-related-${
                            related.cardno || related.name || relatedIndex
                          }`}
                          label={`${
                            related.cardno ||
                            related.name ||
                            related.zh_name ||
                            ""
                          }${
                            related.cardno && related.name
                              ? ` · ${related.name}`
                              : ""
                          }`}
                          variant="outlined"
                          size="small"
                          sx={{
                            borderColor: "var(--border)",
                            color: "var(--text)",
                            fontWeight: 500,
                            maxWidth: "100%",
                            height: "auto",
                            alignSelf: "flex-start",
                            "& .MuiChip-label": {
                              whiteSpace: "normal",
                              lineHeight: 1.3,
                              display: "block",
                            },
                          }}
                        />
                      ))}
                    </Stack>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() =>
                        handleOpenRelatedModal({
                          ...card,
                          related_cards: relatedCards,
                        })
                      }
                      sx={{
                        mt: 1.5,
                        borderColor: "var(--border)",
                        color: "var(--text)",
                        fontWeight: 600,
                        "&:hover": {
                          borderColor: "var(--text)",
                          backgroundColor: "var(--card-background)",
                        },
                      }}
                    >
                      {t("pages.cardList.buttons.viewRelated")}
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {result.total > result.pageSize && (
        <Box mt={4} display="flex" justifyContent="center" mb={8}>
          <Pagination
            count={Math.ceil(result.total / result.pageSize)}
            page={result.page}
            onChange={handlePageChange}
            color="primary"
            size="small"
            sx={{
              "& .MuiPaginationItem-root": {
                color: "var(--text-secondary)",
                borderColor: "var(--primary)",
              },
              "& .Mui-selected": {
                backgroundColor: "var(--primary) !important",
                color: "#fff !important",
                borderColor: "#a6ceb6 !important",
                "&:hover": {
                  backgroundColor: "var(--primary-hover) !important",
                },
              },
            }}
          />
        </Box>
      )}

      <Dialog
        open={Boolean(relatedModalCard)}
        onClose={handleCloseRelatedModal}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 4,
            overflow: "hidden",
            backgroundColor: "var(--primary)",
            border: "1px solid var(--border)",
            boxShadow: "0 24px 50px rgba(46, 76, 61, 0.35)",
            color: "var(--text)",
          },
        }}
      >
        <DialogTitle
          sx={{
            px: { xs: 3, sm: 4 },
            py: { xs: 2.5, sm: 3.5 },
            backgroundColor: "var(--primary-dark)",
            color: "var(--text)",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: { xs: "flex-start", sm: "center" },
              gap: 2,
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                {relatedModalCard
                  ? t("pages.cardList.dialog.relatedTitle", {
                      cardName:
                        relatedModalCard.name ||
                        relatedModalCard.zh_name ||
                        relatedModalCard.cardno,
                    })
                  : ""}
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                sx={{ rowGap: 0.75 }}
              >
                {relatedModalCard?.cardno && (
                  <Chip
                    size="small"
                    label={relatedModalCard.cardno}
                    sx={{
                      backgroundColor: "rgba(255, 255, 255, 0.28)",
                      border: "1px solid rgba(255, 255, 255, 0.42)",
                      color: "var(--text)",
                      fontWeight: 600,
                    }}
                  />
                )}
                {relatedModalCard?.product_name && (
                  <Chip
                    size="small"
                    label={relatedModalCard.product_name}
                    sx={{
                      backgroundColor: "rgba(255, 255, 255, 0.24)",
                      border: "1px solid rgba(255, 255, 255, 0.36)",
                      color: "#2a5b46",
                      fontWeight: 500,
                    }}
                  />
                )}
                {relatedModalCard?.related_cards?.length ? (
                  <Chip
                    size="small"
                    label={`${t("pages.cardList.labels.related")} · ${
                      relatedModalCard.related_cards.length
                    }`}
                    sx={{
                      backgroundColor: "rgba(255, 255, 255, 0.24)",
                      border: "1px solid rgba(255, 255, 255, 0.36)",
                      color: "#2a5b46",
                      fontWeight: 500,
                    }}
                  />
                ) : null}
              </Stack>
            </Box>
            <IconButton
              onClick={handleCloseRelatedModal}
              aria-label={t("pages.cardList.dialog.close")}
              sx={{
                color: "#f6fff9",
                backgroundColor: "rgba(17, 52, 38, 0.24)",
                "&:hover": {
                  backgroundColor: "rgba(17, 52, 38, 0.4)",
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            px: { xs: 2.5, sm: 4 },
            py: { xs: 2.5, sm: 3.5 },
            backgroundColor: "rgba(220, 236, 226, 0.78)",
          }}
        >
          {relatedModalCard && relatedModalCard.related_cards?.length ? (
            <Stack spacing={2.5}>
              {relatedModalCard.related_cards.map((related, relatedIndex) => (
                <Paper
                  key={`${relatedModalCard.cardno || "card"}-modal-${
                    related.cardno || related.name || relatedIndex
                  }`}
                  sx={{
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    gap: { xs: 2, sm: 3 },
                    alignItems: { xs: "stretch", sm: "center" },
                    p: { xs: 2, sm: 3 },
                    borderRadius: 3,
                    background:
                      "linear-gradient(150deg, rgba(187, 216, 202, 0.96) 0%, rgba(168, 208, 190, 0.92) 60%, rgba(154, 196, 178, 0.92) 100%)",
                    border: "1px solid rgba(94, 134, 112, 0.4)",
                    boxShadow: "0 14px 28px rgba(60, 94, 78, 0.28)",
                    color: "#214233",
                    "& .MuiTypography-body2": {
                      color: "rgba(40, 76, 60, 0.8)",
                    },
                    "& .MuiTypography-subtitle1": {
                      color: "#1b3e2e",
                    },
                    "& .MuiTypography-body2 strong": {
                      color: "#1b3e2e",
                    },
                    "& .MuiChip-root": {
                      color: "#1b3e2e",
                    },
                  }}
                >
                  {related.image_url && (
                    <Box
                      sx={{
                        flexShrink: 0,
                        alignSelf: { xs: "center", sm: "stretch" },
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        p: { xs: 1.25, sm: 1.75 },
                        borderRadius: 2,
                        background:
                          "linear-gradient(160deg, rgba(166, 206, 182, 0.38) 0%, rgba(166, 206, 182, 0.12) 100%)",
                        boxShadow: "inset 0 0 0 1px rgba(86, 126, 105, 0.28)",
                      }}
                    >
                      <Box
                        component="img"
                        src={related.image_url}
                        alt={related.name || related.cardno}
                        sx={{
                          width: { xs: 92, sm: 118 },
                          borderRadius: 2,
                          boxShadow: "0 10px 20px rgba(61, 93, 76, 0.36)",
                        }}
                      />
                    </Box>
                  )}
                  <Box
                    sx={{
                      flex: 1,
                      position: "relative",
                      zIndex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1.25,
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600, wordBreak: "break-word" }}
                    >
                      {related.name || related.zh_name || related.cardno}
                    </Typography>
                    {related.zh_name && related.name && (
                      <Typography variant="body2" color="text.secondary">
                        {related.zh_name}
                      </Typography>
                    )}
                    {related.cardno && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5, wordBreak: "break-word" }}
                      >
                        {related.cardno}
                      </Typography>
                    )}
                    {related.product_name && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ wordBreak: "break-word" }}
                      >
                        {related.product_name}
                      </Typography>
                    )}
                    {(related.series_number || related.series) && (
                      <Typography variant="body2" color="text.secondary">
                        {[related.series_number, related.series]
                          .filter(Boolean)
                          .join(" · ")}
                      </Typography>
                    )}
                    {(() => {
                      const pillItems = [
                        related.level && `Lv.${related.level}`,
                        related.cost && `Cost ${related.cost}`,
                        related.power &&
                          `${related.power} ${t(
                            "pages.cardList.fields.power",
                          )}`,
                        related.soul &&
                          `${related.soul} ${t("pages.cardList.fields.soul")}`,
                        related.trigger &&
                          `${t("pages.cardList.fields.trigger")} ${
                            related.trigger
                          }`,
                      ].filter(Boolean);
                      if (pillItems.length === 0) {
                        return null;
                      }
                      return (
                        <Stack
                          direction="row"
                          spacing={1}
                          flexWrap="wrap"
                          sx={{ rowGap: 1, mt: 1 }}
                        >
                          {pillItems.map((label, statIndex) => (
                            <Chip
                              key={`${related.cardno || statIndex}-stat-${label}`}
                              label={label}
                              size="small"
                              sx={{
                                backgroundColor: "rgba(134, 176, 154, 0.36)",
                                border: "1px solid rgba(134, 176, 154, 0.55)",
                                fontWeight: 500,
                              }}
                            />
                          ))}
                        </Stack>
                      );
                    })()}
                    {(related.rarity || related.card_type || related.color) && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 1 }}
                      >
                        {[
                          related.rarity,
                          related.card_type,
                          related.color ? related.color.toUpperCase() : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </Typography>
                    )}
                    {(related.trait || related.zh_trait) && (
                      <Box>
                        {related.trait && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>
                              {t("pages.cardList.labels.trait")}
                              {colon}
                            </strong>
                            {related.trait}
                          </Typography>
                        )}
                        {related.zh_trait && (
                          <Typography variant="body2" color="text.secondary">
                            <strong>
                              {t("pages.cardList.labels.traitZh")}
                              {colon}
                            </strong>
                            {related.zh_trait}
                          </Typography>
                        )}
                      </Box>
                    )}
                    {(related.effect || related.zh_effect) && (
                      <Box
                        sx={{
                          backgroundColor: "rgba(148, 189, 168, 0.3)",
                          borderRadius: 2,
                          p: 1.5,
                          mt: 1.5,
                          border: "1px solid rgba(104, 146, 123, 0.45)",
                        }}
                      >
                        {related.effect && (
                          <Typography
                            variant="body2"
                            sx={{ mb: related.zh_effect ? 1 : 0 }}
                          >
                            <strong>
                              {t("pages.cardList.labels.effect")}
                              {colon}
                            </strong>
                            {related.effect}
                          </Typography>
                        )}
                        {related.zh_effect && (
                          <Typography variant="body2">
                            <strong>
                              {t("pages.cardList.labels.effectZh")}
                              {colon}
                            </strong>
                            {related.zh_effect}
                          </Typography>
                        )}
                      </Box>
                    )}
                    {(related.flavor || related.zh_flavor) && (
                      <Box
                        sx={{
                          backgroundColor: "rgba(150, 196, 170, 0.24)",
                          borderRadius: 2,
                          p: 1.5,
                          mt: 1.5,
                          border: "1px solid rgba(106, 148, 125, 0.4)",
                        }}
                      >
                        {related.flavor && (
                          <Typography
                            variant="body2"
                            sx={{ mb: related.zh_flavor ? 1 : 0 }}
                          >
                            <strong>
                              {t("pages.cardList.labels.flavor")}
                              {colon}
                            </strong>
                            {related.flavor}
                          </Typography>
                        )}
                        {related.zh_flavor && (
                          <Typography variant="body2">
                            <strong>
                              {t("pages.cardList.labels.flavorZh")}
                              {colon}
                            </strong>
                            {related.zh_flavor}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Typography
              variant="body2"
              sx={{ color: "rgba(222, 238, 229, 0.75)" }}
            >
              {t("pages.cardList.dialog.emptyRelated")}
            </Typography>
          )}
        </DialogContent>
        <DialogActions
          sx={{
            px: { xs: 2.5, sm: 4 },
            py: { xs: 2, sm: 2.5 },
            backgroundColor: "rgba(201, 224, 211, 0.82)",
          }}
        >
          <Button
            onClick={handleCloseRelatedModal}
            variant="contained"
            sx={{
              background: "linear-gradient(120deg, #6fa386 0%, #4d7e66 100%)",
              color: "#f6fff9",
              boxShadow: "0 10px 20px rgba(77, 126, 102, 0.35)",
              fontWeight: 600,
              "&:hover": {
                background: "linear-gradient(120deg, #5a9276 0%, #3c6d56 100%)",
                boxShadow: "0 14px 26px rgba(60, 110, 86, 0.38)",
              },
            }}
          >
            {t("pages.cardList.dialog.close")}
          </Button>
        </DialogActions>
      </Dialog>

      <Box
        sx={{
          position: "fixed",
          bottom: 60,
          left: 24,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          alignItems: "flex-start",
          zIndex: 1200,
        }}
      >
        <Tooltip title={zhToggleTitle} placement="left">
          <Fab
            variant="extended"
            size="small"
            onClick={() => setShowZh((prev) => !prev)}
            sx={{
              backgroundColor: showZh ? "#a6ceb6" : "#cfd8dc",
              color: showZh ? "#fff" : "#4b4b4b",
              fontSize: 14,
              "&:hover": {
                backgroundColor: showZh ? "#95bfa5" : "#b0bec5",
              },
            }}
          >
            {showZh ? "中" : "中"}
          </Fab>
        </Tooltip>

        <Tooltip title={jpToggleTitle} placement="left">
          <Fab
            variant="extended"
            size="small"
            onClick={() => setShowJP((prev) => !prev)}
            sx={{
              backgroundColor: showJP ? "#a6ceb6" : "#cfd8dc",
              color: showJP ? "#fff" : "#4b4b4b",
              fontSize: 14,
              "&:hover": {
                backgroundColor: showJP ? "#95bfa5" : "#b0bec5",
              },
            }}
          >
            {showJP ? "日" : "日"}
          </Fab>
        </Tooltip>

        {showScrollButtons && (
          <>
            <Tooltip title={scrollUpLabel} placement="right">
              <Fab
                size="small"
                onClick={scrollToTop}
                aria-label={scrollUpLabel}
                sx={{
                  backgroundColor: "#a6ceb6",
                  color: "#fff",
                  fontSize: 14,
                  minWidth: 40,
                  width: 40,
                  height: 40,
                  "&:hover": {
                    backgroundColor: "#95bfa5",
                  },
                }}
              >
                <KeyboardArrowUpIcon />
              </Fab>
            </Tooltip>

            <Tooltip title={scrollDownLabel} placement="right">
              <Fab
                size="small"
                onClick={scrollToBottom}
                aria-label={scrollDownLabel}
                sx={{
                  backgroundColor: "#a6ceb6",
                  color: "#fff",
                  fontSize: 14,
                  minWidth: 40,
                  width: 40,
                  height: 40,
                  "&:hover": {
                    backgroundColor: "#95bfa5",
                  },
                }}
              >
                <KeyboardArrowDownIcon />
              </Fab>
            </Tooltip>
          </>
        )}
      </Box>
      <Box sx={{ height: 48 }} />
    </Container>
  );
}

export default CardList;
