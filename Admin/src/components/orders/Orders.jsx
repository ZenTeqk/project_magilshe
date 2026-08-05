import React, { useContext, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import EditOrders from "./EditOrders";
import MainContext from "../../context/MainContext";
import { GetApi } from "../../hooks/Get/GetApi";
import { GetOrderUrl } from "../../Constant/urls/urls";
import { setOrdersReducerData } from "../../redux/reducer/ChildReducer/OrdersReducer";
import { convertDateFormat } from "../../commonFunctions";
import BillView from "./BillView";
import { setIsOrdersLoadingReducerData } from "../../redux/reducer/ChildReducer/CommonLoaderReducer";
import { useNavigate } from "react-router";
import { formatMoney, ManagementPage, ManagementTable, PrimaryButton, SecondaryButton, StatusBadge } from "../../admin/design-system";


const Orders = () => {
  const { ShowNotification } = useContext(MainContext);

  const navigate = useNavigate()

  //reducer Data
  const { orders_reducer_data } = useSelector((state) => state.OrdersReducer);
  
  const { is_orders_loading } = useSelector(
    (state) => state.CommonLoaderReducer
  );
  const dispatch = useDispatch();

  const [show, setShow] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [editableData, setEditableData] = useState({});

  useEffect(() => {
    getOrders();
    window.getOrders = getOrders;
  }, []);

  

  const statusArray = [
    "",
    "Pending",
    "Order Placed",
    "Confirmed",
    "Preparing",
    "Ready",
    "Delivered",
    "Cancel Requested",
    "Cancelled",
    "Rejected",
  ];

  // const customStyles = {
  //   rows: {
  //     style: {
  //       "&:hover": {
  //         backgroundColor: "#cde3f6",
  //       },
  //     },
  //   },
  //   cells: {
  //     style: {
  //       padding: "0.5rem 1rem", // Padding for each cell
  //       fontSize: "14px", // Font size
  //       borderRight: "1px solid #ddd", // Border between cells
  //     },
  //   },
  // };
  
  

  const categoryDTColumns = [
    {
      name: "ID",
      selector: (row) => row?.id,
      sortable: true,
      width: "5%",
    },
    {
      name: "Order Time",
      selector: (row) => convertDateFormat(row?.order_time),
      width: "10%",
    },
    {
      name: "Delivery Time",
      selector: (row) => convertDateFormat(row?.delivery_time),
      width: "10%",
    },
    {
      name: "Amount",
      selector: (row) => (row?.cart_details||[]).reduce((sum,item)=>sum+(Number(item?.price)||0)*(Number(item?.qty)||0),0),
      cell: (row) => formatMoney((row?.cart_details||[]).reduce((sum,item)=>sum+(Number(item?.price)||0)*(Number(item?.qty)||0),0)),
      width: "10%",
    },
    {
      name: "Customer",
      selector: (row) => row?.id,
      width: "25%",
      cell: (row) => <div><strong>{row?.customer?.name||"—"}</strong><div className="mads-muted">{row?.customer?.phone||"—"}</div><div className="mads-muted">{row?.customer?.email||"—"}</div></div>,
    },
    {
      name: "Delivery Address",
      selector: (row) => row?.id,
      width: "25%",
      cell: (row) => <div><strong>{row?.delivery_address?.address_title||"—"}</strong><div className="mads-muted">{row?.delivery_address?.address||"—"}</div><div className="mads-muted">{row?.delivery_address?.pincode||""}</div></div>,
    },
    {
      name: (
        <>
          Item
          <br />
          Qty
        </>
      ),
      selector: (row) => row?.cart_id_list?.length,
      width: "100px",
    },
    // {
    //   name: "Cart Details",
    //   selector: (row) => (row?.id),
    //   width: "25%",
    //   cell: (row) => (
    //     <div className="text-start address-info">
    //       <h4>{row?.delivery_address?.address_title}</h4>
    //       <p>{row?.delivery_address?.address}</p>
    //       <p>{row?.delivery_address?.pincode}</p>
    //     </div>
    //   ),
    // },

    {
      name: "Order Type",
      selector: (row) => row?.is_manual_order,
      minWidth: "15%",
      cell: (row) => <StatusBadge tone={row?.is_manual_order?"success":"info"}>{row?.is_manual_order?"Manual":"Online"}</StatusBadge>,
    },
    {
      name: "Order Status",
      selector: (row) => row?.image_url,
      minWidth: "15%",
      cell: (row) => <StatusBadge>{statusArray[row?.delivery_status]||"Unknown"}</StatusBadge>,
    },

    // {
    //   name: "Action",
    //   minWidth: "10%",
    //   cell: (row) => (
    //     <div className="text-center">
    //       <Button
    //         variant="contained"
    //         color="primary"
    //         size="small"
    //         className="me-2 my-2"
    //         style={{
    //           textTransform: "none",
    //           borderRadius: "5px",
    //         }}
    //         onClick={() => {
    //           handleRowClick(row)
    //         }}
    //       >
    //         <FontAwesomeIcon icon={faEye} className="me-2" />
    //         View
    //       </Button>
    //       {statusArray[row?.delivery_status] === "Delivered" && (
    //         <Button
    //           variant="contained"
    //           color="success"
    //           size="small"
    //           className="me-2"
    //           style={{
    //             textTransform: "none",
    //             borderRadius: "5px",
    //           }}
    //           onClick={() => {
    //             setShowBill(true);
    //             setEditableData(row);
    //           }}
    //         >
    //           <FontAwesomeIcon icon={faFile} className="me-2" />
    //           View Bill
    //         </Button>
    //       )}
    //     </div>
    //   ),
    // },
  ];

  const handleRowClick = (row) => {
    setShow(true);
    setEditableData(row);
  }

  const getOrders = async () => {
    try {
      const result = await GetApi(GetOrderUrl);
      
      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        dispatch(setOrdersReducerData(result.data?.data));
      }
    } catch (error) {
      console.error("getOrders Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    } finally {
      dispatch(setIsOrdersLoadingReducerData(false));
    }
  };

  if (is_orders_loading) {
    return <ManagementPage title="Online orders" subtitle="Orders placed through the customer storefront." loading />;
  }

  return (
    <>
      <ManagementPage title="Online orders" subtitle="Review storefront and manually entered customer orders." breadcrumbs={[{label:"Operations"},{label:"Online orders"}]} primaryAction={<PrimaryButton onClick={()=>navigate('/manual-order')}>New manual order</PrimaryButton>} secondaryActions={<SecondaryButton onClick={getOrders}>Refresh</SecondaryButton>}>
        <ManagementTable columns={categoryDTColumns} data={[...orders_reducer_data].sort((a,b)=>b.id-a.id)} searchPlaceholder="Search orders" emptyTitle="No online orders" emptyDescription="New storefront orders will appear here." onRowClick={handleRowClick}/>
      </ManagementPage>

      <EditOrders
        show={show}
        setShow={setShow}
        editableData={editableData}
        setEditableData={setEditableData}
        statusArray={statusArray}
        setShowBill={setShowBill}
      />

      <BillView show={showBill} setShow={setShowBill} setShowBill={setShow} billData={editableData} />
    </>
  );
};

export default Orders;
