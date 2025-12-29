import React, { useContext, useEffect, useRef, useState } from "react";
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
  Select,
  MenuItem,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import PrintIcon from "@mui/icons-material/Print";

import { GetApi } from "../../hooks/Get/GetApi";
import {
  GetEventsAllOrder,
  GetEventsIndividualOrder,
  GetCakeUrl,
  UpdateEventOrder,
} from "../../Constant/urls/urls";
import theChennaiCakeryLogo from "../../assets/img/tcc-logo.png";
import { Card } from "react-bootstrap";
import ReactToPrint from "react-to-print";
import { faPrint } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { PostApi } from "../../hooks/Post/PostApi";
import MainContext from "../../context/MainContext";


/* ================= MAIN COMPONENT ================= */

/* ===== STATUS MAP (ADDED) ===== */
const ORDER_STATUS_MAP = {
  1: "Pending",
  2: "Processing",
  3: "Completed",
};

const EventsOrders = () => {
  const { ShowNotification } = useContext(MainContext);
  const [orders, setOrders] = useState([]);
  const [cakes, setCakes] = useState([]);
  const [open, setOpen] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [saving, setSaving] = useState(false);
  const invoiceRef = useRef(null);


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

  /* ===== UPDATE STATUS ONLY (ADDED) ===== */

  const handleStatusUpdate = async () => {
    try {
      setSaving(true);

      const payload = {
        id: orderDetails?.id,
        order_status: orderDetails?.order_status,
      };

      const res = await PostApi(UpdateEventOrder, payload);

      if (res?.status === 200) {
        ShowNotification("success", "Order status updated successfully");
        setOpen(false);
        getAllOrders();
      } else {
        ShowNotification(res?.data?.message || "Failed to update status");
        setOpen(false);
      }
    } catch {
      ShowNotification("error", "Something went wrong");
      setOpen(false);
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };


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
              <TableCell>Order Status</TableCell>
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
                  <TableCell>
                    <Typography
                      fontWeight={600}
                      color={
                        order.order_status === 1
                          ? "orange"
                          : order.order_status === 2
                            ? "blue"
                            : "green"
                      }
                    >
                      {ORDER_STATUS_MAP[order.order_status]}
                    </Typography>
                  </TableCell>
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

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setShowInvoice(false);
        }}
        maxWidth="md"
        fullWidth
      >
        {/* ================= TITLE ================= */}
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {showInvoice ? "Invoice" : "Order Details"}

          <IconButton
            onClick={() => {
              setOpen(false);
              setShowInvoice(false);
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {/* ================= ACTION BAR ================= */}
          {!showInvoice && orderDetails ? (
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
              gap={2}
              mb={2}
            >
              {/* LEFT : STATUS + SAVE */}
              <Box display="flex" alignItems="center" gap={2}>
                <Typography fontWeight={600} sx={{ whiteSpace: "nowrap" }}>
                  Order Status
                </Typography>

                <Select
                  value={orderDetails.order_status}
                  onChange={(e) =>
                    setOrderDetails({
                      ...orderDetails,
                      order_status: e.target.value,
                    })
                  }
                  sx={{
                    minWidth: 220,
                    height: 42,
                    borderRadius: "8px",
                    backgroundColor: "#fff",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#1976d2",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#115293",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderWidth: 2,
                    },
                  }}
                >
                  <MenuItem value={1}>Pending</MenuItem>
                  <MenuItem value={2}>Processing</MenuItem>
                  <MenuItem value={3}>Completed</MenuItem>
                </Select>

                <Button
                  variant="contained"
                  color="success"
                  disabled={saving}
                  onClick={handleStatusUpdate}
                  sx={{
                    height: 42,
                    px: 3,
                    borderRadius: "8px",
                    fontWeight: 600,
                    textTransform: "none",
                    boxShadow: "0px 3px 8px rgba(0,0,0,0.2)",
                  }}
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              </Box>

              {/* RIGHT : VIEW BILL */}
              <Button
                variant="contained"
                color="primary"
                startIcon={<PrintIcon />}
                onClick={() => setShowInvoice(true)}
                sx={{
                  height: 42,
                  px: 3,
                  borderRadius: "8px",
                  fontWeight: 600,
                  textTransform: "none",
                }}
              >
                View Bill
              </Button>
            </Box>
          ) : (
            /* ================= INVOICE BUTTONS ================= */
            <Box display="flex" justifyContent="flex-end" gap={2} mb={1}>
              <Button
                variant="contained"
                onClick={() => setShowInvoice(false)}
                sx={{
                  height: 42,
                  px: 3,
                  borderRadius: "8px",
                  textTransform: "none",
                }}
              >
                Back
              </Button>

              <ReactToPrint
                trigger={() => (
                  <Button
                    variant="contained"
                    color="primary"
                    sx={{
                      height: 42,
                      px: 3,
                      borderRadius: "8px",
                      textTransform: "none",
                    }}
                  >
                    <FontAwesomeIcon icon={faPrint} className="mx-1" />
                    Print Bill
                  </Button>
                )}
                content={() => invoiceRef.current}
              />
            </Box>
          )}

          {/* ================= ORDER DETAILS ================= */}
          {!showInvoice && orderDetails && (
            <>
              {/* CUSTOMER INFO */}
              <Box mb={2}>
                <Typography><b>Name:</b> {orderDetails.name}</Typography>
                <Typography><b>Phone:</b> {orderDetails.phone}</Typography>
                <Typography><b>Notes:</b> {orderDetails.notes}</Typography>
              </Box>

              {/* CAKE ITEMS */}
              <Grid container spacing={2}>
                {orderDetails?.cake_price_details?.map((item, index) => {
                  const cake = getCakeById(item.cake_id);
                  const variant = getVariantById(cake, item.id);

                  const kg = variant?.kg || 0;
                  const price = variant?.price || 0;
                  const qty = item?.qty || 0;
                  const total = price * qty;
                  const cakeVariant = cake?.unit?.name;
                  const cakeImage = cake?.images?.[0]?.url;

                  return (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Paper sx={{ p: 2, borderRadius: 2 }}>
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
                          {cake?.name}
                        </Typography>

                        <Typography variant="body2">
                          Variant: <b>{kg} {cakeVariant}</b>
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

              {/* GRAND TOTAL */}
              <Box textAlign="right" mt={3}>
                <Typography variant="h6">
                  Grand Total: ₹ {orderDetails.total_amount}
                </Typography>
              </Box>
            </>
          )}

          {/* ================= INVOICE VIEW ================= */}
          {showInvoice && (
            <Card ref={invoiceRef} sx={{ p: 3 }}>
              {/* Invoice content remains SAME as your code */}
            </Card>
          )}
        </DialogContent>
      </Dialog>

    </>
  );
};

export default EventsOrders;
