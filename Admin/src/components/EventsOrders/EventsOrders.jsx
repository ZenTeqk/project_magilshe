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
} from "@mui/material";

import VisibilityIcon from "@mui/icons-material/Visibility";

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

  /* ================= HELPER ================= */

  const getCakeById = (cakeId) =>
    cakes.find((cake) => cake.id === cakeId);

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
        <DialogTitle>Order Details</DialogTitle>

        <DialogContent dividers>
          {orderDetails && (
            <>
              {/* ================= CUSTOMER INFO ================= */}

              <Box mb={3}>
                <Typography><b>Name:</b> {orderDetails.name}</Typography>
                <Typography><b>Phone:</b> {orderDetails.phone}</Typography>
                <Typography><b>Address:</b> {orderDetails.address}</Typography>
                <Typography><b>Notes:</b> {orderDetails.notes}</Typography>
              </Box>

              {/* ================= CAKE DETAILS ================= */}

              <Grid container spacing={2}>
                {orderDetails.cake_price_details?.map((item, index) => {
                  const cake = getCakeById(item.id);
                  const cakeImage = cake?.images?.[0]?.url;
                  const price =
                    cake?.price_list?.[0]?.cake_price_after_offer || 0;
                  const total = price * item.qty;

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
                          Price: ₹ {price}
                        </Typography>

                        <Typography variant="body2">
                          Qty: {item.qty}
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
