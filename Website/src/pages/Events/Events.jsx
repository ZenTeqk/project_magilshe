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
  Fab,
  Badge,
} from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import { useParams } from "react-router";

import EventProductOrder from "../../pages/Events/EventProductOrder";
import { getEvents } from "../../utils/cakeryAPI";

const THEME_COLOR = "#B4584A";

const Events = () => {
  const { id } = useParams();

  const [eventData, setEventData] = useState(null);
  const [openCart, setOpenCart] = useState(false);
  const [cartItems, setCartItems] = useState([]);

  /* ================= FETCH EVENT ================= */
  useEffect(() => {
    const fetchEventsData = async () => {
      try {
        const res = await getEvents(id);
        setEventData(res?.data?.data || null);
      } catch (error) {
        console.error(error);
      }
    };
    if (id) fetchEventsData();
  }, [id]);

  /* ================= HELPERS ================= */
  const getCartItem = (id) => cartItems.find((i) => i.id === id);

  const updateQty = (id, type) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? {
              ...item,
              qty: type === "inc" ? item.qty + 1 : item.qty - 1,
            }
            : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  /* ================= ADD TO CART ================= */
  const handleAddToCart = (cake) => {
    const variants =
      cake?.price_list?.price_list?.map((v) => ({
        id: v.id,
        kg: v.kg,
        label: `${v.kg} ${cake?.unit?.name}`,
        price: v.cake_price_after_offer,
      })) || [];

    if (!variants.length) return;

    const defaultVariant = variants.reduce((min, v) =>
      v.price < min.price ? v : min
    );

    setCartItems((prev) => [
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
        unit: cake?.unit?.name,
      },
    ]);
  };

  if (!eventData) return null;

  return (
    <Box p={{ xs: 1, sm: 2, md: 3 }}>
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
      <Typography variant="h6" fontWeight={800} mb={2} textAlign="center">
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

          const cartItem = getCartItem(cake.id);

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
                {/* ================= IMAGE (FIXED HEIGHT) ================= */}
                <Box
                  sx={{
                    height: { xs: 140, sm: 160, md: 180 },
                    width: "100%",
                    overflow: "hidden",
                  }}
                >
                  <CardMedia
                    component="img"
                    image={cake?.images_list?.[0]?.url || ""}
                    alt={cake.name}
                    sx={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </Box>

                {/* ================= CONTENT ================= */}
                <CardContent
                  sx={{
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <Typography
                    fontWeight={700}
                    sx={{
                      minHeight: 44,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {cake.name}
                  </Typography>

                  <Typography fontWeight={800} color={THEME_COLOR}>
                    ₹{lowestPrice}
                  </Typography>

                  {/* ================= ADD / QTY ================= */}
                  <div style={{
                    display: "flex",
                    justifyContent: "end"
                  }}>
                    {!cartItem ? (
                      <Button
                        // fullWidth
                        sx={{
                          mt: "0.5rem",
                          backgroundColor: THEME_COLOR,
                          color: "#fff",
                          fontWeight: 700,
                          "&:hover": {
                            backgroundColor: "#9f3f35",
                          },
                        }}
                        onClick={() => handleAddToCart(cake)}
                      >
                        Add to Cart
                      </Button>
                    ) : (
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="center"
                        spacing={1}
                        sx={{
                          mt: "0.5rem",
                          border: "1px solid #ddd",
                          borderRadius: 2,
                          py: 0.5,
                          maxWidth: "100%"
                        }}
                      >
                        <Button
                          size="small"
                          onClick={() => updateQty(cake.id, "dec")}
                        >
                          −
                        </Button>

                        <Typography fontWeight={700}>
                          {cartItem.qty}
                        </Typography>

                        <Button
                          size="small"
                          onClick={() => updateQty(cake.id, "inc")}
                        >
                          +
                        </Button>
                      </Stack>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* ================= FLOATING CART ================= */}
      {cartItems.length > 0 && (
        <Fab
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            backgroundColor: THEME_COLOR,
            color: "#fff",
          }}
          onClick={() => setOpenCart(true)}
        >
          <Badge badgeContent={cartItems.length} color="error">
            <ShoppingCartIcon />
          </Badge>
        </Fab>
      )}

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
