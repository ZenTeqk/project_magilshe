import {
  faEdit,
  faFileLines,
  faRefresh,
  faPlus,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Avatar, AvatarGroup, Button, Fab, Grid, TextField } from "@mui/material";
import React, { useContext, useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import MainContext from "../../../context/MainContext";
import EditCake from "./EditCake";
import { GetApi } from "../../../hooks/Get/GetApi";
import { DeleteCakeUrl, GetCakeUrl } from "../../../Constant/urls/urls";
import { useDispatch, useSelector } from "react-redux";
import { setCakeListReducerData } from "../../../redux/reducer/ChildReducer/CakeListReducer";
import PreLoaderComponent from "../../../common/PreLoaderComponent";
import { setIsCakeLoadingReducerData } from "../../../redux/reducer/ChildReducer/CommonLoaderReducer";
import { DeleteApi } from "../../../hooks/Delete/DeleteApi";

const CakeComponent = () => {
  const { ShowNotification, ShowConfirmation } = useContext(MainContext);
  const dispatch = useDispatch();

  const { cake_list_reducer_data } = useSelector(
    (state) => state.CakeListReducer
  );
  const { is_cake_loading } = useSelector((state) => state.CommonLoaderReducer);

  const [show, setShow] = useState(false);
  const [editableData, setEditableData] = useState({});
  // const [cakeList, setCakeList] = useState([]);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [searchText, setSearchText] = useState("")

  const categoryDTColumns = [
    {
      name: "ID",
      selector: (row) => row?.id,
      width: "5%",
      sortable: true
    },
    {
      name: "Product Name",
      selector: (row) => row?.name,
      sortable: true,
      minWidth: "15%",
    },
    {
      name: "Category",
      selector: (row) => row?.sub_category?.name,
      sortable: true,
      minWidth: "15%",
    },
    {
      name: "Unit",
      selector: (row) => row?.unit?.name,
      minWidth: "5%",
      sortable: true
    },
    {
      name: "Tag",
      // selector: (row) => row?.tag_details?.map(item => item.tag).join(', '),
      minWidth: "25%",
      cell: (row) => (
        <div className="d-flex flex-wrap gap-1 my-1">
          {row?.tag_details?.slice(0, 2).map((tagObj) => (
            <span
              key={tagObj.id}
              style={{
                marginRight: "5px",
                padding: "5px",
                background: "#d32f2f",
                color: "white",
                borderRadius: "10px",
                whiteSpace: "nowrap",
              }}
            >
              {tagObj.tag}
            </span>
          ))}
        </div>
      ),
    },
    {
      name: "Cake Image",
      selector: (row, index) => (
        <div className="text-center">
          <AvatarGroup max={5}>
            {row?.images?.map((image, index) => (
              <Avatar key={index} alt="Remy Sharp" src={image?.url} />
            ))}
          </AvatarGroup>
          {/* <img
            src={row?.image_url}
            alt={`preview ${index}`}
            style={{ width: 100, height: 100, objectFit: "cover" }}
          /> */}
        </div>
      ),
      minWidth: "20%",
    },
    {
      name: "View",
      minWidth: "15%",
      cell: (row) => (
        <div className="text-center">
          <Fab size="medium" color="secondary" aria-label="add"
            className="me-2 table-fab-buttons"
            onClick={() => {
              setShow(true);
              setEditableData(row);
            }}
          >
            <FontAwesomeIcon icon={faEdit} className="" />
          </Fab>
          <Fab size="medium" color="error" aria-label="add"
            className="me-2 table-fab-buttons"
            onClick={() => {
              handleDelete(row);
            }}
          >
            <FontAwesomeIcon icon={faTrash} className="" />
          </Fab>
        </div>
      ),
    },
  ];

  useEffect(() => {
    getCakeList();
  }, []);

  const getCakeList = async () => {
    try {
      const result = await GetApi(GetCakeUrl);

      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        dispatch(setCakeListReducerData(result.data.data));
      }
    } catch (error) {
      console.error("getCakeList Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    } finally {
      dispatch(setIsCakeLoadingReducerData(false));
    }
  };

  const handleDelete = async (row) => {
    const testSwal = await ShowConfirmation(
      "Are you sure do you want to delete?",
      "yes",
      "no"
    );

    if (testSwal === "yes") {
      const url = `${DeleteCakeUrl}${row.id}/`;
      const result = await DeleteApi(url);

      if (result.status !== 200) {
        ShowNotification("error", result.data.message);
      } else {
        ShowNotification("success", result.data.message);
        const filteredData = cake_list_reducer_data.filter(
          (val) => val.id !== row.id
        );
        dispatch(setCakeListReducerData(filteredData));
      }
    }
  };
  if (is_cake_loading) {
    return <PreLoaderComponent />;
  }



  return (
    <div className="cgm-purchase-section">
      <Grid container spaing={2} className="mb-2">
        <Grid item md={4} xs={6} className="text-end search-section">
          <section className="component-heading my-1">
            <FontAwesomeIcon icon={faFileLines} className="mx-2" /> Products List
          </section>
        </Grid>
        <Grid item md={8} xs={6} className="text-end top-action-button-group">
          <div className="ml-auto">
            <Button
              variant="contained"
              color="primary"
              size="small"
              className="me-1"
              style={{
                textTransform: "none",
                borderRadius: "5px",
              }}
              onClick={() => {
                setShow(true);
              }}
            >
              <FontAwesomeIcon icon={faPlus} className="mx-1" />
              Add Product
            </Button>
            <Button
              variant="contained"
              color="success"
              className=" mx-1"
              style={{
                textTransform: "none",
                borderRadius: "5px",
                padding: "5px 10px",
              }}
              onClick={() => getCakeList()}
            >
              <FontAwesomeIcon icon={faRefresh} className="mx-1" />{" "}
              <span>Refresh</span>
            </Button>
          </div>
        </Grid>
        <Grid item md={12} xs={12} className="text-end search-section">
          <TextField
            className="mt-3 mb-2"
            id="outlined-basic"
            label="Search"
            variant="outlined"
            size={"small"}
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value)
            }}
          />
        </Grid>
      </Grid>

      <div className={`dt-table`}>
        <DataTable
          columns={categoryDTColumns}
          striped
          data={cake_list_reducer_data?.filter(cake => cake.name.toLowerCase().includes(searchText.toLowerCase()))}
          className="dt-table-container"
          pagination
          //   paginationPerPage={categoryParam?.limit}
          //   paginationServer
          //   paginationTotalRows={}
          //   onChangePage={handlePageChange}
          //   onChangeRowsPerPage={handleRowsPerPageChange}
          searchable
        />
      </div>

      <EditCake
        show={show}
        setShow={setShow}
        editableData={editableData}
        setEditableData={setEditableData}
      />
    </div>
  );
};

export default CakeComponent;
