import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";

import { GetApi } from "../../hooks/Get/GetApi";
import {
  GetEventsAllOrder,
  GetEventsIndividualOrder,
  GetCakeUrl,
} from "../../Constant/urls/urls";

/* ================= MAIN COMPONENT ================= */

const EventsOrders = () => {
  const [orders, setOrders] = useState([]);
  const [cakes, setCakes] = useState([]);
  const [open, setOpen] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);

  /* ================= FETCH ALL ORDERS ================= */

  const getAllOrders = async () => {
    const res = await GetApi(GetEventsAllOrder);
    if (res?.status === 200) {
      setOrders(res.data?.data || []);
    }
  };

  /* ================= FETCH ALL CAKES ================= */

  const getAllCakes = async () => {
    const res = await GetApi(GetCakeUrl);
    if (res?.status === 200) {
      setCakes(res.data?.data || []);
    }
  };

  /* ================= FETCH INDIVIDUAL ORDER ================= */

  const handleView = async (orderId) => {
    const res = await GetApi(`${GetEventsIndividualOrder}/${orderId}`);
    if (res?.status === 200) {
      setOrderDetails(res.data?.data);
      setOpen(true);
    }
  };

  useEffect(() => {
    getAllOrders();
    getAllCakes();
  }, []);

  /* ================= HELPERS ================= */

  const getCakeById = (cakeId) =>
    cakes.find((cake) => cake.id === cakeId);

  const getVariantById = (cake, variantId) => {
    if (!cake?.price_list) return null;
    return cake.price_list.find(
      (variant) => variant.id === variantId
    );
  };

  return (
    <>
      {/* ================= ORDERS TABLE ================= */}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Total Amount</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No Orders Found
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order, index) => (
                <TableRow key={order.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{order.name}</TableCell>
                  <TableCell>{order.phone}</TableCell>
                  <TableCell>₹ {order.total_amount}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleView(order.id)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ================= ORDER DETAILS MODAL ================= */}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        
        {/* ===== MODAL TITLE WITH CLOSE ICON ===== */}
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Order Details
          <IconButton onClick={() => setOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {orderDetails && (
            <>
              {/* ================= CUSTOMER INFO + PRINT ================= */}

              <Box
                mb={3}
                display="flex"
                justifyContent="space-between"
                alignItems="flex-start"
                gap={2}
              >
                {/* LEFT : CUSTOMER DETAILS */}
                <Box>
                  <Typography><b>Name:</b> {orderDetails.name}</Typography>
                  <Typography><b>Phone:</b> {orderDetails.phone}</Typography>
                  <Typography><b>Email:</b> {orderDetails.email}</Typography>
                  <Typography><b>Address:</b> {orderDetails.address}</Typography>
                  <Typography><b>Notes:</b> {orderDetails.notes}</Typography>
                </Box>

                {/* RIGHT : PRINT BUTTON */}
                <Box>
                  <Button
                    variant="contained"
                    startIcon={<PrintIcon />}
                    onClick={() => window.print()}
                  >
                    Print
                  </Button>
                </Box>
              </Box>

              {/* ================= CAKE DETAILS ================= */}

              <Grid container spacing={2}>
                {orderDetails.cake_price_details?.map((item, index) => {
                  const cake = getCakeById(item.cake_id);
                  const variant = getVariantById(cake, item.id);

                  const kg = variant?.kg || 0;
                  const price = variant?.price || 0;
                  const qty = item.qty || 0;
                  const total = price * qty;

                  const cakeImage = cake?.images?.[0]?.url;

                  return (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Paper sx={{ p: 2 }}>
                        {cakeImage && (
                          <img
                            src={cakeImage}
                            alt={cake?.name}
                            style={{
                              width: "100%",
                              height: 140,
                              objectFit: "cover",
                              borderRadius: 8,
                            }}
                          />
                        )}

                        <Typography mt={1} fontWeight={600}>
                          {cake?.name || "Unknown Cake"}
                        </Typography>

                        <Typography variant="body2">
                          Variant: <b>{kg} KG</b>
                        </Typography>

                        <Typography variant="body2">
                          Price: ₹ {price}
                        </Typography>

                        <Typography variant="body2">
                          Qty: {qty}
                        </Typography>

                        <Typography mt={1} fontWeight={600}>
                          Total: ₹ {total}
                        </Typography>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>

              {/* ================= GRAND TOTAL ================= */}

              <Box textAlign="right" mt={3}>
                <Typography variant="h6">
                  Grand Total: ₹ {orderDetails.total_amount}
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EventsOrders;
