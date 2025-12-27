import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Button,
  Stack,
} from "@mui/material";
import { useParams } from "react-router";

import EventProductOrder from "../../pages/Events/EventProductOrder";
import { getEvents } from "../../utils/cakeryAPI";

const THEME_COLOR = "#B4584A";

const Events = () => {
  const { id } = useParams();

  const [eventData, setEventData] = useState(null);
  const [openCart, setOpenCart] = useState(false);
  const [cartItems, setCartItems] = useState([]);

  /* ===== FETCH EVENT ===== */
  useEffect(() => {
    const fetchEventsData = async () => {
      try {
        const res = await getEvents(id);
        console.log("EVENT DATA =>", res?.data?.data);
        setEventData(res?.data?.data || null);
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };

    if (id) fetchEventsData();
  }, [id]);

  /* ===== ADD TO CART ===== */
  const handleAddToCart = (cake) => {
    const variants =
      cake?.price_list?.price_list?.map((v) => ({
        id: v.id,
        kg: v.kg,
        label: `${v.kg} Kg`,
        price: v.cake_price_after_offer,
      })) || [];

    if (!variants.length) return;

    // ✅ DEFAULT LOWEST PRICE
    const defaultVariant = variants.reduce((min, v) =>
      v.price < min.price ? v : min
    );

    setCartItems((prev) => {
      const exists = prev.find((i) => i.id === cake.id);

      if (exists) {
        return prev.map((i) =>
          i.id === cake.id ? { ...i, qty: i.qty + 1 } : i
        );
      }

      return [
        ...prev,
        {
          id: cake.id,
          name: cake.name,
          image: cake?.images_list?.[0]?.url || "",
          qty: 1,
          variants,
          selectedVariantId: defaultVariant.id,
          selectedVariantKg: defaultVariant.kg,
          price: defaultVariant.price,
        },
      ];
    });

    setOpenCart(true);
  };

  /* ===== LOADING SAFETY ===== */
  if (!eventData) return null;

  return (
    <Box p={{ xs: 1, sm: 2, md: 3 }}>
      {/* ================= EVENT BANNER ================= */}
      <Card
        sx={{
          mb: 4,
          p: { xs: 2, md: 3 },
          borderRadius: 6,
          background:
            "linear-gradient(135deg, #ffffff 0%, #fdf2f8 100%)",
        }}
      >
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={5}>
            <Box
              component="img"
              src={eventData.url}
              alt={eventData.name}
              sx={{
                width: "100%",
                height: { xs: 220, md: 360 },
                objectFit: "cover",
                borderRadius: 5,
                boxShadow: 8,
              }}
            />
          </Grid>

          <Grid item xs={12} md={7}>
            <Stack spacing={2}>
              <Typography
                variant="subtitle2"
                sx={{ color: THEME_COLOR, fontWeight: 600 }}
              >
                Festival Event
              </Typography>

              <Typography
                fontWeight={800}
                lineHeight={1.2}
                sx={{
                  fontSize: {
                    xs: "1.8rem",
                    sm: "2.4rem",
                    md: "2.8rem",
                  },
                }}
              >
                {eventData.name}{" "}
                <Box component="span" color={THEME_COLOR}>
                  Festival
                </Box>
              </Typography>

              <Typography color="text.secondary">
                {eventData.description}
              </Typography>

              <Card
                sx={{
                  p: 3,
                  mt: 2,
                  borderRadius: 5,
                  background: "rgba(255,255,255,0.75)",
                }}
              >
                <Typography fontWeight={700}>
                  Special Festival Offers
                </Typography>
                <Typography color="text.secondary" mt={1}>
                  📅 {eventData.start} – {eventData.end}
                  <br />
                  📍 {eventData.place}
                </Typography>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Card>

      {/* ================= PRODUCTS ================= */}
      <Typography
        variant="h6"
        fontWeight={700}
        mb={2}
        textAlign="center"
      >
        Products for this Event
      </Typography>

      <Grid container spacing={2}>
        {eventData?.cake_details?.map((cake) => {
          const lowestPrice =
            cake?.price_list?.price_list?.reduce(
              (min, v) =>
                v.cake_price_after_offer < min
                  ? v.cake_price_after_offer
                  : min,
              Infinity
            ) || 0;

          return (
            <Grid item xs={6} sm={6} md={4} lg={3} key={cake.id}>
  <Card
    sx={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      borderRadius: 3,
    }}
  >
    {/* IMAGE */}
    <CardMedia
      component="img"
      image={cake?.images_list?.[0]?.url || ""}
      alt={cake.name}
      sx={{
        height: 180,
        objectFit: "cover",
      }}
    />

    {/* CONTENT */}
    <CardContent
      sx={{
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* TITLE – FIXED HEIGHT */}
      <Typography
        fontWeight={600}
        sx={{
          minHeight: 44,
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {cake.name}
      </Typography>

      {/* PRICE */}
      <Typography
        fontWeight={700}
        color={THEME_COLOR}
        mt={0.5}
      >
        ₹{lowestPrice}
      </Typography>

      {/* BUTTON – ALWAYS BOTTOM */}
      <Button
        fullWidth
        sx={{
          mt: "auto",
          backgroundColor: THEME_COLOR,
          color: "#fff",
          fontWeight: 600,
          "&:hover": {
            backgroundColor: "#9f3f35",
          },
        }}
        onClick={() => handleAddToCart(cake)}
      >
        Add to Cart
      </Button>
    </CardContent>
  </Card>
</Grid>

          );
        })}
      </Grid>

      {/* ================= CART MODAL ================= */}
      <EventProductOrder
        open={openCart}
        onClose={() => setOpenCart(false)}
        cartItems={cartItems}
        setCartItems={setCartItems}
      />
    </Box>
  );
};

export default Events;
