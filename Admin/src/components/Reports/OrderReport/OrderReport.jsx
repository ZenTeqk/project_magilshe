import {
  faEdit,
  faFileLines,
  faRefresh,
  faPlus,
  faTrash,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, Grid, TextField } from "@mui/material";
import React, { useContext, useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import { useDispatch, useSelector } from "react-redux";
import MainContext from "../../../context/MainContext";
import { GetApi } from "../../../hooks/Get/GetApi";
import PreLoaderComponent from "../../../common/PreLoaderComponent";
import {
  GetOccasionReportUrl,
  GetOrderReportUrl,
} from "../../../Constant/urls/urls";
import { setIsOccasionReportLoadingReducerData } from "../../../redux/reducer/ChildReducer/CommonLoaderReducer";
import { setOccasionReportReducerData } from "../../../redux/reducer/ChildReducer/OccasionReportReducer";
import {
  ConvertDateStrFunction,
  ConvertDateTimeStrFunction,
  ISOformatDateTimeFunction,
} from "../../../commonFunctions";
import { setOrderReportReducerData } from "../../../redux/reducer/ChildReducer/OrderReportReducer";
import { convertDateFormat } from "../../../commonFunctions";

const OrderReport = () => {
  const { ShowNotification } = useContext(MainContext);

  const { order_report_reducer_data } = useSelector(
    (state) => state.OrderReportReducer
  );

  const dispatch = useDispatch();

  const [show, setShow] = useState(false);
  const [filterDates, setFilterDates] = useState({
    from_date: "",
    to_date: "",
  });

  useEffect(() => {
    const currentDate = new Date();
    const pastDate = new Date();
    pastDate.setDate(currentDate.getDate() - 30); // Subtract 30 days
  
    const formattedFromDate = pastDate.toISOString().slice(0, 16);
    const formattedToDate = currentDate.toISOString().slice(0, 16);
  
    setFilterDates({
      from_date: formattedFromDate,
      to_date: formattedToDate,
    });
  
    getOrderReport({
      from_date: formattedFromDate,
      to_date: formattedToDate,
    });
  
  }, []);
  

  const handleDateChange = (value, name) => {
    setFilterDates((oldData) => ({
      ...oldData,
      [name]: value,
    }));
  };
  
  const categoryDTColumns = [
    {
      name: "ID",
      selector: (row) => row?.id,
    
    },
    {
      name: "Customer Name",
      selector: (row) => row?.customer.name,
     
    },
    {
      name: "Address",
      selector: (row) => (
        <div className="text-center">
          <p>{row.delivery_address?.address}</p>
          {/* <p>{row.delivery_address?.phone}</p>
          <p>{row.delivery_address?.email}</p> */}
        </div>
      ),
    
    },
    {
      name: "Delivery Person",
      selector: (row) => (
        <div className="text-center">
          <p>{row.delivery_person?.name}</p>
          <p>{row.delivery_person?.phone}</p>
        </div>
      ),
     
    },
    {
      name: "Order Time",
      selector: (row) => convertDateFormat(row?.order_time),
    
    },
    {
      name: "Delivered Time",
      selector: (row) => convertDateFormat(row?.delivery_time),
     
    },

  ];

  const getOrderReport = async (dates = filterDates) => {
    if (!dates?.from_date) {
      ShowNotification("error", "Please Select Report Start Date");
      return;
    }
    if (!dates?.to_date) {
      ShowNotification("error", "Please Select Report End Date");
      return;
    }
  
    try {
      const result = await GetApi(
        `${GetOrderReportUrl}from_date=${ConvertDateStrFunction(
          dates?.from_date
        )}&to_date=${ConvertDateStrFunction(dates?.to_date)}`
      );
  
      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        if (result.data?.data) {
          dispatch(setOrderReportReducerData(result.data?.data));
        }
      }
    } catch (error) {
      console.error("getOrderReport Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    }
  };

  const handleDelete = (row) => {
    // const filterCategories = kg_reducer_data.filter((val) => val.id !== row.id);
  };

  //   if (is_occasion_report_loading) {
  //     return <PreLoaderComponent />;
  //   }
  return (
    <div className="reports-section">
      <Grid container spaing={2} className="mb-2">
        <Grid item md={4} xs={6} className="text-end search-section">
          <section className="component-heading my-1">
            <FontAwesomeIcon icon={faFileLines} className="mx-2" /> Order Report
          </section>
        </Grid>
       

        <Grid container spacing={2} className="my-3">

          <Grid item md={4}>
            <TextField
              id="from_date"
              className="my-2"
              label="Start Date"
              fullWidth
              size="small"
              required
              value={filterDates?.from_date || ""}
              onChange={(e) => {
                handleDateChange(e.target.value, "from_date");
              }}
              type="datetime-local"
            />
          </Grid>
          <Grid item md={4}>
            <TextField
              id="to_date"
              className="my-2"
              label="end Date"
              fullWidth
              size="small"
              required
              value={filterDates?.to_date || ""}
              onChange={(e) => {
                handleDateChange(e.target.value, "to_date");
              }}
              type="datetime-local"
            />
          </Grid>

          <Grid item md={4} xs={4} className="text-start d-flex align-items-center">
          <div className="d-flex align-items-center">
            <Button
              variant="contained"
              color="success"
              className=" mx-1"
              style={{
                textTransform: "none",
                borderRadius: "5px",
                display: "block"
              }}
              onClick={() => getOrderReport()}
            >
              <FontAwesomeIcon icon={faDownload} className="mx-1" />{" "}
              <span>Get Data</span>
            </Button>
          </div>
        </Grid>
        </Grid>
      </Grid>

      <div className={`dt-table`}>
        <DataTable
          columns={categoryDTColumns}
          striped
          data={order_report_reducer_data}
          className="dt-table-container"
          
          searchable
        />
      </div>
    </div>
  );
};

export default OrderReport;
